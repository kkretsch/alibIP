/*jshint esversion: 6 */

"use strict";

// application/routes.js

module.exports = function(app, passport, myConnectionPool) {
	const mjml = require('mjml')
	, mjmlUtils = require('mjml-utils')
	, fs = require('fs')
    , validator = require('validator')
	, appRoot = require('app-root-path')
	, createHash = require('sha.js')
	, emailjs = require('emailjs')
	, async = require('async');
	const bCrypt = require('bcrypt-nodejs');

	var MyRoutes = require('../routes/index.js');
	var routes = new MyRoutes(app, passport, myConnectionPool);


	// Helper functions
	function checkDate(s) {
		return validator.matches(s, /^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$/);
	}
	function checkSubdomain(s) {
		return validator.matches(s, /^[a-z][a-z0-9]{2,62}$/);
	}

	function generateToken() {
	    var buf = new Buffer(16);
	    for (var i = 0; i < buf.length; i++) {
	        buf[i] = Math.floor(Math.random() * 256);
	    }
	    var id = buf.toString('base64');
	    return id;
	}
	function sendmail(email, sHash) {
		var sFilepath = __dirname + '/../mailrun/forgot.html';
		mjmlUtils.inject(sFilepath, {
			email: email,
			hash: sHash,
		}).then(finalTemplate => {
			var sMailserver = app.locals.conf.get('MAILSERVER');

			// Mail senden
			var server = emailjs.server.connect({
				host: sMailserver,
				ssl: false
			});
			var message = {
				text: "See html content",
				from: "IPlog <noreply@iplog.info>",
				to: email,
				subject: "Reset password confirmation",
				attachment: [
					{data: finalTemplate, alternative: true}
				]
			};
			server.send(message, function(err,message) {
				if(err)	{
					console.log(err || message);
				}
				var sMsgId = message.header["message-id"];
				console.log("Sending mail ID " + sMsgId);
				return true;
			});
		});
	} // function


	// Protected Paths?
	app.use('/my', function(req, res, next) {
		if(req.isAuthenticated()) {
			next();
		} else {
			res.redirect('/?login');
			return res.end();
		} // if
	}); // function
	app.use('/my/*', function(req, res, next) {
		if(req.isAuthenticated()) {
			next();
		} else {
			res.redirect('/?login');
			return res.end();
		} // if
	}); // function

	// real Routes HOME
	app.get('/', routes.index);
	app.get('/my', routes.myhome);

	app.get('/my/info', routes.myinfo);

	app.get('/my/profile', routes.myprofile);
	app.post('/my/profile', function(req, res) {
		if(!req.isAuthenticated()) {
			return res.redirect('/');
		} // if
		async.series({
			domains: function(callback) {
				if(req.user.subdomain !== req.body.subdomain) {
					console.log("Update subdomain");
					if(!checkSubdomain(req.body.subdomain)) {
						console.log("Not an subdomain");
						res.status(400);
						res.send("ERROR");
						return res.end();
					} // if
					myConnectionPool.query("UPDATE users SET subdomain=? WHERE id=?", [req.body.subdomain,req.user.id], function(err, rows) {
						if(err) {
							console.log("error " + err);
							res.send("ERROR");
							return res.end();
						} // if
						req.session.flash_info = 'Your subdomain was updated.';
						callback(null, rows);
					}); // query
				} else {
					callback(null, null);
				} // if
			}, // series domains
			passwords: function(callback) {
				if(('' !== req.body.password.trim()) && (req.body.password === req.body.password2)) {
					console.log("Update passwd");
					var salt = bCrypt.genSaltSync(8);
					var hPassword = bCrypt.hashSync(req.body.password.trim(), salt, null);
					myConnectionPool.query("UPDATE users SET passwordhash=? WHERE id=?", [hPassword,req.user.id], function(err, rows) {
						if(err) {
							console.log("error " + err);
							res.send("ERROR");
							return res.end();
						} // if
						req.session.flash_info = 'Your password was updated.';
						callback(null, rows);
					}); // query
				} else {
					callback(null, null);
				} // if
				
			}
		},function(err, result) {
				return res.redirect('/my/profile');	
		}); // async
	});
	// Profile update check
	app.get('/my/subdomainunique', function(req, res) {
		var qSearch = req.query.search;
		if(!checkSubdomain(qSearch)) {
			console.log("Not an subdomain");
			res.send("ERROR");
			return res.end();
		} // if

		myConnectionPool.query("SELECT COUNT(*) AS c FROM users WHERE subdomain=? AND id!=?", [qSearch,req.user.id], function(err, rows) {
			if(err) {
				console.log("error " + err);
				res.send("ERROR");
				return res.end();
			}
			if(!rows.length) {
				res.send("ERROR");
				return res.end();
			}
			var iCount=rows[0].c;
			if(0 === iCount) {
				res.send("OK");
			} else {
				res.send("DUP");
			} // if
			return res.end();
		});
	});

	app.get('/my/calendar', routes.mycalendar);
	app.get('/my/calenderevents', function(req, res) {
		if(!req.isAuthenticated()) {
			return res.redirect('/');
		} // if

		var qStart = req.query.start;
		var qEnd = req.query.end;
		if(qStart && !checkDate(qStart)) {
			console.log("error start date " + qStart + "!");
			res.status(400);
			return res.end();
		} // if
		if(qEnd && !checkDate(qEnd)) {
			console.log("error end date " + qEnd + "!");
			res.status(400);
			return res.end();
		} // if
		if(!qStart) {
			qStart = '2017-01-01';
		}
		if(!qEnd) {
			qEnd = '2099-12-31';
		}
		console.log("get calender from " + qStart + " to " + qEnd + ".");

		res.setHeader('Content-Type', 'text/json');
		res.setHeader('Cache-Control', 'private, max-age=60');

		myConnectionPool.query("SELECT id,ts,ipv4,ipv6,tsrefresh,DATE_FORMAT(ts, \'%Y%m%dT%H%i%s\') AS uts,DATE_FORMAT(tsrefresh, \'%Y%m%dT%H%i%s\') AS utsrefresh FROM entries WHERE fkuser=? AND ts>=? AND ts<=? ORDER BY ts ASC", [req.user.id,qStart,qEnd], function(err, rows) {
			console.log("event matches " + rows.length);
			for(var i=0; i<rows.length; i++) {
				rows[i].title = rows[i].ipv4 + " / " + rows[i].ipv6; 
				rows[i].allDay = false;
				rows[i].start = rows[i].uts;
				if(rows[i].tsrefresh) {
					rows[i].end = rows[i].utsrefresh;
				} // if
			} // for
			return res.json(rows);
		});
	});

	app.get('/my/grants', routes.mygrants);
	app.get('/my/grantentries', function(req, res) {
		if(!req.isAuthenticated()) {
			return res.redirect('/');
		} // if

		res.setHeader('Content-Type', 'text/json');
		res.setHeader('Cache-Control', 'private, max-age=60');

		myConnectionPool.query("SELECT * FROM grantaccess WHERE fkuser=? ORDER BY id ASC", [req.user.id], function(err, rows) {
			console.log("event matches " + rows.length);
			return res.json(rows);
		});
	});

	// Recherche / ext URLs
	app.post('/ext/lookup', function(req, res) {
		var qToken = req.body.token;
		if(!validator.isHexadecimal(qToken)) {
			console.log("Warning: Lookup attack? " + qToken);
			req.session.flash_error = res.__('Invalid Token.');
			res.redirect('/?error');
			return res.end();
		} // if

		var aGrant;
		async.series({
			access: function(callback) {
				myConnectionPool.query("SELECT * FROM grantaccess WHERE token=?", [qToken], function(err, rowsGrant) {
					if(err) {
						console.log("error " + err);
						req.session.flash_error = res.__('Error validating Token');
						res.redirect('/?error');
						return res.end();
					} // if
					if(!rowsGrant.length) {
						req.session.flash_error = res.__('Token not found');
						res.redirect('/?error');
						return res.end();
					} // if
					aGrant = rowsGrant[0];
					req.session.grant = aGrant;
					callback(null, rowsGrant);
				});
			}, // access
			updater: function(callback) {
				myConnectionPool.query("UPDATE grantaccess SET logincount=logincount+1 WHERE id=?", [aGrant.id], function(err, rowsEntry) {
					if(err) {
						console.log("error " + err);
						req.session.flash_error = res.__('Error getting entries');
						res.redirect('/?error');
						return res.end();
					} // if
					callback(null, rowsEntry);
				});
			}, // updater
			getter: function(callback) {
				// Which sort of filter?
				var sQuery='SELECT *,DATE_FORMAT(ts, \'%Y-%m-%d %H:%i:%s\') AS uts, DATE_FORMAT(tsrefresh, \'%Y-%m-%d %H:%i:%s\') AS utsrefresh  FROM entries WHERE fkuser=?';
				var aQuery=[aGrant.fkuser];
				if(aGrant.fkentry) {
					sQuery+=' AND id=?';
					aQuery.push(aGrant.fkentry);
				} // if
				if(aGrant.entryfrom && aGrant.entryto) {
					sQuery+=' AND ts>=? AND ts<=?';
					aQuery.push(aGrant.entryfrom);
					aQuery.push(aGrant.entryto);
				} // if

				// Sort
				sQuery+=' ORDER BY ts ASC';

				myConnectionPool.query(sQuery, aQuery, function(err, rowsEntry) {
					if(err) {
						console.log("error " + err);
						req.session.flash_error = res.__('Error getting entries');
						res.redirect('/?error');
						return res.end();
					} // if
					if(!rowsEntry.length) {
						req.session.flash_error = res.__('Entry not found');
						res.redirect('/?error');
						return res.end();
					} // if
					callback(null, rowsEntry);
				});
			} // getter
		}, function(err, result) {
				return res.render('pages/lookup', { title: 'Lookup', locals: { nocache: true }, entries: result.getter });
		}); // async
	});
	// Recherche / ext URLs
	app.get('/ext/lookup_ical', function(req, res) {
		if(!req.session.grant) {
			req.session.flash_error = res.__('Grant not in session');
			res.redirect('/?error');
			return res.end();
		} // if
		var aGrant = req.session.grant;
		async.series({
			updater: function(callback) {
				myConnectionPool.query("UPDATE grantaccess SET logincount=logincount+1 WHERE id=?", [aGrant.id], function(err, rowsEntry) {
					if(err) {
						console.log("error " + err);
						req.session.flash_error = res.__('Error getting entries');
						res.redirect('/?error');
						return res.end();
					} // if
					callback(null, rowsEntry);
				});
			}, // updater
			getter: function(callback) {
				// Which sort of filter?
				var sQuery='SELECT *,DATE_FORMAT(ts, \'%Y%m%dT%H%i%s\') AS icalts, DATE_FORMAT(tsrefresh, \'%Y%m%dT%H%i%s\') AS icaltsrefresh, DATE_FORMAT(CONVERT_TZ(ts, @@session.time_zone, \'+00:00\'), \'%Y%m%dT%H%i%sZ\') AS icalstamp FROM entries WHERE fkuser=?';
				var aQuery=[aGrant.fkuser];
				if(aGrant.fkentry) {
					sQuery+=' AND id=?';
					aQuery.push(aGrant.fkentry);
				} // if
				if(aGrant.entryfrom && aGrant.entryto) {
					sQuery+=' AND ts>=? AND ts<=?';
					aQuery.push(aGrant.entryfrom);
					aQuery.push(aGrant.entryto);
				} // if

				// Sort
				sQuery+=' ORDER BY ts ASC';

				myConnectionPool.query(sQuery, aQuery, function(err, rowsEntry) {
					if(err) {
						console.log("error " + err);
						req.session.flash_error = res.__('Error getting entries');
						res.redirect('/?error');
						return res.end();
					} // if
					if(!rowsEntry.length) {
						req.session.flash_error = res.__('Entry not found');
						res.redirect('/?error');
						return res.end();
					} // if
					callback(null, rowsEntry);
				});
			} // getter
		}, function(err, result) {
				res.setHeader('Content-Type', 'text/calendar');
				res.setHeader('Content-Disposition', 'attachment;filename=alibIP_lookup.ics');
				res.setHeader('Cache-Control', 'private, max-age=60');
				return res.render('pages/lookup_ical', { title: 'Lookup', locals: { nocache: true }, entries: result.getter });
		}); // async
	});


	// Special URLs
	app.get('/dyn.js', function(req, res) {
		res.setHeader('Content-Type', 'application/javascript');
		res.setHeader('Cache-Control', 'private, max-age=60');
		return res.render('pages/dynjs');
	});



	// Login/Logout/Register
	app.get('/u/unique', function(req, res) {
		var qSearch = req.query.search;
		if(!validator.isEmail(qSearch)) {
			console.log("Not an email: " + qSearch);
			res.status(400);
			return res.end();
		} // if
		qSearch += "%";
		//console.log("search unique for " + qSearch);
		myConnectionPool.query("SELECT COUNT(*) AS c FROM users WHERE email LIKE ?", [qSearch], function(err, rows) {
			if(err) {
				console.log("error " + err);
				res.send("ERROR");
				return res.end();
			}
			if(!rows.length) {
				res.send("ERROR");
				return res.end();
			}
			var iCount=rows[0].c;
			if(0 === iCount) {
				res.send("OK");
			} else {
				res.send("DUP");
			} // if
			return res.end();
		});
	});
	app.post('/u/register', passport.authenticate('local-signup', {
		successRedirect: '/',
		failureRedirect: '/'
	}));
	app.post('/u/login', passport.authenticate('local-login', {
		successRedirect: '/my',
		failureRedirect: '/'
	}));
	app.get('/u/logout', function(req, res) {
		console.log('logging out');
		req.logout();
		req.session.destroy(function (err) {
			res.redirect('/');
			return res.end();
		});
	}); 
	app.get('/u/confirm', function(req, res) {
		var qID = req.query.id;
		var qHash = req.query.hash;

		if(!validator.isInt(qID) || !validator.isHexadecimal(qHash)) {
			console.log("Warning: parameter attack? " + qID + "/" + qHash);
			req.session.flash_error = res.__('We have a problem.');
			res.redirect('/?error');
			return res.end();
		}
		myConnectionPool.query("SELECT id FROM users WHERE id=? AND emailhash=? AND status='inregistration'", [qID,qHash], function(err, rows) {
			if(err) {
				req.session.flash_error = res.__('We have a problem.');
				res.redirect('/?error');
				return res.end();
			}
			if(!rows.length) {
				req.session.flash_error = res.__('We have a problem.');
				res.redirect('/?error');
				return res.end();
			}
			var id=rows[0].id;
			myConnectionPool.query("UPDATE users SET status='active', emailhash=NULL WHERE id=? LIMIT 1", [id], function(err, rows) {
				req.session.flash_info = res.__('Your registration has been activated.');
				res.redirect('/?registered');
				return res.end();
			});
		});
	});

	// Full password recovery cycle
	//  Parameters
	app.param('token', function(req, res, next, token) {
		if(!validator.isBase64(token)) {
			console.log("error token " + token);
			res.status(400);
			return res.end();
		} // if
		req.token = token;
		next();
	});
	app.get('/u/forgot', function(req,res) {
		if (req.isAuthenticated()) {
			//user is already logged in
			return res.redirect('/');
		} // if
		res.render('pages/forgot', { title: 'Forgot password' });
	});
	app.post('/u/forgot', function (req, res) {
		if (req.isAuthenticated()) {
			//user is already logged in
			return res.redirect('/');
		} // if
		var qEmail = req.body.email;
		myConnectionPool.query("SELECT id FROM users WHERE email=? AND status!='inregistration'", [qEmail], function(err, rows) {
			if(err) {
				console.log("sql error " + err);
				res.redirect('/?error');
				return res.end();
			}
			if(!rows.length) {
				console.log("user not found");
				res.redirect('/?error');
				return res.end();
			}
			var id=rows[0].id;
			var sToken = generateToken();
			myConnectionPool.query("UPDATE users SET emailhash=? WHERE id=? LIMIT 1", [sToken,id], function(err, rows) {
				if(err) {
					console.log("sql error " + err);
					res.redirect('/?error');
					return res.end();
				}
				console.log("try sending email with " + qEmail + "/" + sToken);
				sendmail(qEmail, sToken);
				req.session.flash_info = res.__('Please check your email for further instructions.');
				res.redirect('/');
			});
	    });
	});
	app.get('/u/reset/:token', function (req, res) {
		if (req.isAuthenticated()) {
			//user is already logged in
			return res.redirect('/');
		} // if
		var token = req.token;
		myConnectionPool.query("SELECT id FROM users WHERE emailhash=? AND status='active'", [token], function(err, rows) {
	        if (err) {
				console.log("sql error " + err);
				res.redirect('/?error');
				return res.end();
			}
			if(!rows.length) {
				console.log("token not found");
				res.redirect('/?error');
				return res.end();
			}
			var id=rows[0].id;
	        //show the UI with new password entry
	        res.render('pages/reset', { title: res.__('Reset password'), id: id, token: token });
	    });
	});
	app.post('/u/reset', function (req, res) {
		if (req.isAuthenticated()) {
			//user is already logged in
			return res.redirect('/');
		} // if
		var qPwd1 = req.body.password;
		var qPwd2 = req.body.password2;
		var qToken = req.body.token;
		var qID = req.body.id;
		var salt = bCrypt.genSaltSync(8);
		var hPassword = bCrypt.hashSync(qPwd1, salt, null);
		myConnectionPool.query("UPDATE users SET passwordhash=?, emailhash=NULL WHERE id=? AND emailhash=? LIMIT 1", [hPassword,qID,qToken], function(err, rows) {
	        if (err) {
				console.log("sql error " + err);
				res.redirect('/?error');
				return res.end();
			}
	        req.session.flash_info = 'Password successfully reset.  Please login using new password.';
            return res.redirect('/');
	    });
	});


	// Last resort 404
	app.use(function(req, res, next) {
		res.status(404).render('pages/error404', { title: 'Not found', locals: { nocache: true } });
	});

};
