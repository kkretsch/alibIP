/*jshint esversion: 6 */

"use strict";

// application/routes.js

module.exports = function(app, passport, myConnectionPool) {
	const mjml = require('mjml')
	, mjmlUtils = require('mjml-utils')
	, fs = require('fs')
	, appRoot = require('app-root-path')
	, createHash = require('sha.js')
	, emailjs = require('emailjs');
	const bCrypt = require('bcrypt-nodejs');

	var MyRoutes = require('../routes/index.js');
	var routes = new MyRoutes(app, passport, myConnectionPool);
	var reNumber = new RegExp("^([0-9]+)$");
	var reHexstring = new RegExp("^([a-fA-F0-9]+)$");
	var reToken = new RegExp("^([a-zA-Z0-9]+)==$");

	// Helper functions
	function checkNumber(s) {
		return reNumber.test(s);
	}
	function checkHexstring(s) {
		return reHexstring.test(s);
	}
	function checkToken(s) {
		return reToken.test(s);
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
	} // function
	);
	app.use('/my/*', function(req, res, next) {
			if(req.isAuthenticated()) {
				next();
			} else {
				res.redirect('/?login');
				return res.end();
			} // if
		} // function
	);

	// real Routes HOME
	app.get('/', routes.index);
	app.get('/my', routes.myhome);
	app.get('/mail', routes.mailtest);

	// Login/Logout/Register
	app.post('/u/register', passport.authenticate('local-signup', {
		successRedirect: '/my',
		failureRedirect: '/?signup',
		failureFlash: true
	}));
	app.post('/u/login', passport.authenticate('local-login', {
		successRedirect: '/my',
		failureRedirect: '/?login',
			failureFlash: true
	}));
	app.get('/u/logout', function(req, res) {
		console.log('logging out');
		req.logout();
		req.session.destroy(function (err) {
			res.redirect('/?logout');
			return res.end();
		});
	}); 
	app.get('/u/confirm', function(req, res) {
		var qID = req.query.id;
		var qHash = req.query.hash;

		if(!checkNumber(qID) || !checkHexstring(qHash)) {
			console.log("Warning: parameter attack? " + qID + "/" + qHash);
			res.redirect('/?error');
			return res.end();
		}
		myConnectionPool.query("SELECT id FROM users WHERE id=? AND emailhash=? AND status='inregistration'", [qID,qHash], function(err, rows) {
			if(err) {
				res.redirect('/?error');
				return res.end();
			}
			if(!rows.length) {
				res.redirect('/?error');
				return res.end();
			}
			var id=rows[0].id;
			myConnectionPool.query("UPDATE users SET status='active', emailhash=NULL WHERE id=? LIMIT 1", [id], function(err, rows) {
				res.redirect('/?registered');
				return res.end();
			});
		});
	});

	// Full password recovery cycle
	//  Parameters
	app.param('token', function(req, res, next, token) {
		if(!checkToken(token)) {
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
				req.flash('success', 'Please check your email for further instructions.');
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
	        res.render('pages/reset', { title: 'Reset password', id: id, token: token });
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
            req.flash('success', 'Password successfully reset.  Please login using new password.');
            return res.redirect('/');
	    });
	});

	// Last resort 404
	app.use(function(req, res, next) {
		res.status(404).render('pages/error404', { title: 'Not found', locals: { nocache: true } });
	});

};
