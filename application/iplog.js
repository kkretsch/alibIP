/*jshint esversion: 6 */

"use strict";

// application/iplog.js

module.exports = function(app, passport, myConnectionPool) {

	const routes = require('../routes')
	    , bcrypt = require('bcrypt-nodejs');

	const	RC_OK      = 'good',
			RC_NOCHNG  = 'nochg',
			RC_BADAUTH = 'badauth',
			RC_ERROR   = '911';

	// Parameters
	app.param('username', function(req, res, next, username) {
		req.username = username;
		next();
	});
	app.param('domain', function(req, res, next, domain) {
		req.domain = domain;
		next();
	});

	// DynDNS API
	app.get('/api/update/:username/:domain', function(req, res, next) {
		var qPasswd = req.query.passwd;
		var qIPv4 = req.query.ip;
		var qIPv6 = req.query.ipv6;

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

				myConnectionPool.query("INSERT INTO entries (fkuser,ipv4,ipv6) VALUES(?,?,?)", [iduser,qIPv4,qIPv6], function(err, rows) {
					if(err) {
						console.log("error inserting ip" + err);
						res.status(500);
						res.send(RC_ERROR);
						return res.end();
					} // if backend error

					res.send(RC_OK);
					res.end();
				}); // Query INSERT ip

			}); // Query SELECT ip

		}); // Query SELECT user
	});

};