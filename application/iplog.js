/*jshint esversion: 6 */

"use strict";

// application/iplog.js

module.exports = function(app, passport, myConnectionPool) {

	const routes = require('../routes')
	    , bcrypt = require('bcrypt-nodejs')
	    , validator = require('validator')
	    , spawn = require('child_process').spawn;

	// Standard replies for dyndns protocol
	const	RC_OK      = 'good',
			RC_NOCHNG  = 'nochg',
			RC_BADAUTH = 'badauth',
			RC_ERROR   = '911';


	// Parameters
	app.param('username', function(req, res, next, username) {
		var bValid = validator.isEmail(username) || validator.isAscii(username);
		if(!bValid) {
			console.log("error username " + username);
			res.status(400);
			res.send(RC_ERROR);
			return res.end();
		} // if
		req.username = username;
		next();
	});
	app.param('domain', function(req, res, next, domain) {
		var bValid = validator.matches(domain, /[a-z]+[a-z0-9\.\-]*[a-z0-9]/i);
		if(!bValid) {
			console.log("error domain " + domain);
			res.status(400);
			res.send(RC_ERROR);
			return res.end();
		} // if
		req.domain = domain;
		var aDomain = domain.split('.');
		req.domainpfx = validator.whitelist(aDomain[0], 'a-z0-9');
		next();
	});
	app.param('pagelen', function(req, res, next, pagelen) {
		var bValid = validator.isInt(pagelen, {min: 2, max: 100});
		if(!bValid) {
			console.log("error pagelen " + pagelen);
			return res.status(400).end();
		} // if
		req.pagelen = validator.toInt(pagelen);
		next();
	});
	app.param('pagenum', function(req, res, next, pagenum) {
		var bValid = validator.isInt(pagenum, {min: 0});
		if(!bValid) {
			console.log("error pagenum " + pagenum);
			return res.status(400).end();
		} // if
		req.pagenum = validator.toInt(pagenum);
		next();
	});

	// Backenend API
	app.get('/my/entries/:pagelen/:pagenum', function(req, res, next) {
		if(!req.isAuthenticated()) {
			return res.status(403).end();
		} // if auth

		var iFrom = req.pagenum*req.pagelen;
		console.log("show entries for user " + req.user.id);
		myConnectionPool.query('SELECT id,ts,ipv4,ipv6 FROM entries WHERE fkuser=? ORDER BY ts DESC LIMIT ?,?', [req.user.id,iFrom,req.pagelen], function(err, rows) {
			if (err) {
				console.log(err);
				return res.status(500).end();
			}
			res.setHeader('Content-Type', 'application/json');
			res.setHeader('Cache-Control', 'private, max-age=60');
			res.json(rows);
		});
	});

	// DynDNS API
	app.get('/api/update/:username/:domain', function(req, res, next) {
		var qPasswd = req.query.passwd;
		var qIPv4 = req.query.ip;
		var qIPv6 = req.query.ipv6;
		var qUserAgent = req.get('User-Agent');

		if(qIPv4 && !validator.isIP(qIPv4, 4)) {
			console.log("error IPv4 " + qIPv4);
			res.status(400);
			res.send(RC_ERROR);
			return res.end();
		} // if
		if(qIPv6 && !validator.isIP(qIPv6, 6)) {
			console.log("error IPv6 " + qIPv6);
			res.status(400);
			res.send(RC_ERROR);
			return res.end();
		} // if

		// Check for user, since we have no login session for api
		myConnectionPool.query("SELECT * FROM users WHERE email=?", [req.username], function(err, rows) {
			if(err) {
				console.log("error getting user");
				res.status(500);
				res.send(RC_ERROR);
				return res.end();
			} // if backend error
			if(0 === rows.length) {
				console.log("no user found");
				res.status(404);
				res.send(RC_BADAUTH);
				return res.end();
			} // if user not found

			var sSubdomain = rows[0].subdomain;
			console.log("compare " + sSubdomain + " to " + req.domainpfx);
			if(sSubdomain !== req.domainpfx) {
				console.log("wrong subdomain");
				res.status(400);
				res.send(RC_ERROR);
				return res.end();
			} // if

			var iduser = rows[0].id;
			var hDbPwd = rows[0].passwordhash;
			console.log("compare " + qPasswd + " to " + hDbPwd);
			if(!bcrypt.compareSync(qPasswd, hDbPwd)) {
				console.log("wrong password hash");
				res.status(500);
				res.send(RC_ERROR);
				return res.end();
			} // if subdomain wrong

			// Get previous ipv6 and/or ipv6
			myConnectionPool.query("SELECT ipv4,ipv6 FROM entries WHERE fkuser=? ORDER BY ts DESC LIMIT 1", [iduser], function(err, rows) {
				if(err) {
					console.log("error getting last ip");
					res.status(500);
					res.send(RC_ERROR);
					return res.end();
				} // if backend error

				if(0 === rows.length) {
					console.log("very first entry, OK");
				} else {
					var lastIPv4 = rows[0].ipv4;
					var lastIPv6 = rows[0].ipv6;
					if(qIPv6) {
						// Compare both IPs
						if((lastIPv4 === qIPv4) && (lastIPv6 === qIPv6)) {
							res.send(RC_NOCHNG);
							return res.end();
						}
					} else {
						// Compare only IPv4
						if(lastIPv4 === qIPv4) {
							res.send(RC_NOCHNG);
							return res.end();
						}
					}
				}

				myConnectionPool.query("INSERT INTO entries (fkuser,ipv4,ipv6,useragent) VALUES(?,?,?,?)", [iduser,qIPv4,qIPv6,qUserAgent], function(err, rows) {
					if(err) {
						console.log("error inserting ip" + err);
						res.status(500);
						res.send(RC_ERROR);
						return res.end();
					} // if backend error

					// Get config values not neeeded elsewhere
					var sDnsZone = app.locals.conf.get('DNSZONE');
					var sDnsServer = app.locals.conf.get('DNSSERVER');
					var sDnsNsupdate = app.locals.conf.get('DNSNSUPDATE');

					// Update DYNDNS
					console.log("spawning nsupdate for " + sSubdomain + " ...");
					var child = spawn(sDnsNsupdate, ['-k','/etc/bind/ddns.key']);
					child.stdin.setEncoding('utf-8');
					child.stdout.pipe(process.stdout);
					child.stdin.write("server " + sDnsServer + "\n");
					child.stdin.write("zone " + sDnsZone + ".\n");
					child.stdin.write("update del " + sSubdomain + "." + sDnsZone + "." + "\n");
					child.stdin.write("update add " + sSubdomain + "." + sDnsZone + ". 60 A " + qIPv4 + "\n");
					if(qIPv6) {
						child.stdin.write("update add " + sSubdomain + "." + sDnsZone + ". 60 AAAA " + qIPv6 + "\n");
					} // if
					child.stdin.write("send\n");
					child.stdin.end();
					child.on('error', (err) => {
						  console.log('Failed to start nsupdate process.' + err);
					});
					child.stdout.on('data', (data) => {
						  console.log('nsupdate: ' + data.toString());
					});
					child.stderr.on('data', (data) => {
						  console.log('nsupdate stderr: ' + data.toString());
					});
					child.on('close', (code) => {
						if (code !== 0) {
							console.log('nsupdate process exited with code ' + code);
						}
					});

					res.setHeader('Cache-Control', 'no-store');
					res.send(RC_OK);
					res.end();
				}); // Query INSERT ip

			}); // Query SELECT ip

		}); // Query SELECT user
	});
	app.put('/api/refresh/:username/:domain', function(req, res, next) {
		var ip = req.headers['x-forwarded-for'] || 
	    	req.connection.remoteAddress || 
	    	req.socket.remoteAddress ||
	    	req.connection.socket.remoteAddress;
		console.log("remote ip=" + ip);

		res.setHeader('Cache-Control', 'no-store');

		// Check for user, since we have no login session for api
		myConnectionPool.query("SELECT * FROM users WHERE email=?", [req.username], function(err, rows) {
			if(err) {
				console.log("error getting user");
				res.status(500);
				res.send(RC_ERROR);
				return res.end();
			} // if backend error
			if(0 === rows.length) {
				console.log("no user found");
				res.status(404);
				res.send(RC_BADAUTH);
				return res.end();
			} // if user not found

			var sSubdomain = rows[0].subdomain;
			console.log("compare " + sSubdomain + " to " + req.domainpfx);
			if(sSubdomain !== req.domainpfx) {
				console.log("wrong subdomain");
				res.status(400);
				res.send(RC_ERROR);
				return res.end();
			} // if

			var iduser = rows[0].id;

			// Get previous/most current ipv6 and/or ipv6
			myConnectionPool.query("SELECT id,ipv4,ipv6 FROM entries WHERE fkuser=? ORDER BY ts DESC LIMIT 1", [iduser], function(err, rows) {
				console.log("get last ip");
				if(err) {
					console.log("error getting last ip");
					res.status(500);
					res.send(RC_ERROR);
					return res.end();
				} // if backend error

				if(0 === rows.length) {
					console.log("nothing found yet");
					res.status(500);
					res.send(RC_ERROR);
					return res.end();
				} // if

				var idEntry = rows[0].id;
				var lastIPv4 = rows[0].ipv4;
				var lastIPv6 = rows[0].ipv6;

				if((lastIPv4 === ip) || (lastIPv6 === ip)) {
					myConnectionPool.query("UPDATE entries SET tsrefresh=NOW() WHERE id=?", [idEntry], function(err, rows) {
						if(err) {
							console.log("error updating last access");
							res.status(500);
							res.send(RC_ERROR);
							return res.end();
						} // if backend error

						res.send(RC_OK);
						res.end();
					});
				} else {
					console.log("IP different");
					res.status(400);
					res.send(RC_ERROR);
					return res.end();
				} // if

			});
		});
	});
};