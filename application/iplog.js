/*jshint esversion: 6 */

"use strict";

// application/iplog.js

module.exports = function(app, passport, myConnectionPool) {

	const routes = require('../routes')
	    , bcrypt = require('bcrypt-nodejs')
	    , spawn = require('child_process').spawn;

	const	RC_OK      = 'good',
			RC_NOCHNG  = 'nochg',
			RC_BADAUTH = 'badauth',
			RC_ERROR   = '911';

	var reUsername = new RegExp("^([a-zA-Z@\.]+)$");
	var reDomainname = new RegExp("^([a-zA-Z0-9]+)$");
	var reIPv4 = new RegExp("^([0-9\.]+)$");
	var reIPv6 = new RegExp("^([0-9a-fA-F:]+)$");
	var rePagenum = new RegExp("^([0-9]+)$");

	// Helper functions
	function checkUsername(s) {
		return reUsername.test(s);
	}
	function checkDomainname(s) {
		return reDomainname.test(s);
	}
	function checkIPv4(s) {
		return reIPv4.test(s);
	}
	function checkIPv6(s) {
		return reIPv6.test(s);
	}
	function checkPagenum(s) {
		return rePagenum.test(s);
	}

	// Parameters
	app.param('username', function(req, res, next, username) {
		if(!checkUsername(username)) {
			console.log("error username " + username);
			res.status(400);
			res.send(RC_ERROR);
			return res.end();
		} // if
		req.username = username;
		next();
	});
	app.param('domain', function(req, res, next, domain) {
		if(!checkDomainname(domain)) {
			console.log("error domain " + domain);
			res.status(400);
			res.send(RC_ERROR);
			return res.end();
		} // if
		req.domain = domain;
		var aDomain = domain.split('.');
		req.domainpfx = aDomain[0];
		next();
	});
	app.param('pagelen', function(req, res, next, pagelen) {
		if(!checkPagenum(pagelen)) {
			console.log("error pagelen " + pagelen);
			res.status(400);
			res.send(RC_ERROR);
			return res.end();
		} // if
		req.pagelen = parseInt(pagelen);
		next();
	});
	app.param('pagenum', function(req, res, next, pagenum) {
		if(!checkPagenum(pagenum)) {
			console.log("error pagenum " + pagenum);
			res.status(400);
			res.send(RC_ERROR);
			return res.end();
		} // if
		req.pagenum = parseInt(pagenum);
		next();
	});

	// Backenend API
	app.get('/my/entries/:pagelen/:pagenum', function(req, res, next) {
		if(req.isAuthenticated()) {
			var iFrom = req.pagenum*req.pagelen;
			console.log("show entries for user " + req.user.id);
			myConnectionPool.query('SELECT id,ts,ipv4,ipv6 FROM entries WHERE fkuser=? ORDER BY ts DESC LIMIT ?,?', [req.user.id,iFrom,req.pagelen], function(err, rows) {
				if (err) {
					console.log(err);
					return res.status(500).end();
				}
				res.setHeader('Content-Type', 'application/json');
				res.json(rows);
			});
		} else {
			res.status(403);
			return res.end();
		} // if
	});

	// DynDNS API
	app.get('/api/update/:username/:domain', function(req, res, next) {
		var qPasswd = req.query.passwd;
		var qIPv4 = req.query.ip;
		var qIPv6 = req.query.ipv6;
		var qUserAgent = req.get('User-Agent');

		if(qIPv4 && !checkIPv4(qIPv4)) {
			console.log("error IPv4 " + qIPv4);
			res.status(400);
			res.send(RC_ERROR);
			return res.end();
		} // if
		if(qIPv6 && !checkIPv6(qIPv6)) {
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

			var iduser = rows[0].id;
			var hDbPwd = rows[0].passwordhash;
			console.log("compare " + qPasswd + " to " + hDbPwd);
			if(!bcrypt.compareSync(qPasswd, hDbPwd)) {
				console.log("wrong password hash");
				res.status(404);
				res.send(RC_BADAUTH);
				return res.end();
			} // if pwd wrong

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

					// Update DYNDNS
					console.log("spawning nsupdate ...");
					var child = spawn('/usr/bin/nsupdate', ['-k','/etc/bind/ddns.key']);
					child.stdin.setEncoding('utf-8');
					child.stdout.pipe(process.stdout);
					child.stdin.write("server 127.0.0.1\n");
					child.stdin.write("zone dyn.ip-log.info.\n");
					child.stdin.write("update del " + req.domainpfx + ".dyn.ip-log.info." + "\n");
					child.stdin.write("update add " + req.domainpfx + ".dyn.ip-log.info. 60 A " + qIPv4 + "\n");
					child.stdin.write("update add " + req.domainpfx + ".dyn.ip-log.info. 60 AAAA " + qIPv6 + "\n");
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

					res.send(RC_OK);
					res.end();
				}); // Query INSERT ip

			}); // Query SELECT ip

		}); // Query SELECT user
	});

};