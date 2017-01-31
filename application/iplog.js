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
		var qIP = req.query.ip;

		myConnectionPool.query("SELECT * FROM users WHERE email=?", [req.username], function(err, rows) {
			if(err) {
				console.log("error getting user");
				res.status(500);
				res.send(RC_ERROR);
				res.end();
				next();
			} // if backend error
			if(0 === rows.length) {
				console.log("no user found");
				res.status(404);
				res.send(RC_BADAUTH);
				res.end();
				next();
			} // if user not found

			var iduser = rows[0].id;
			var hDbPwd = rows[0].passwordhash;
			console.log("compare " + qPasswd + " to " + hDbPwd);
			if(!bcrypt.compareSync(qPasswd, hDbPwd)) {
				console.log("wrong password hash");
				res.status(404);
				res.send(RC_BADAUTH);
				res.end();
				next();
			} // if pwd wrong

			myConnectionPool.query("SELECT ipv4 FROM entries WHERE fkuser=? ORDER BY ts DESC LIMIT 1", [iduser], function(err, rows) {
				if(err) {
					console.log("error getting last ip");
					res.status(500);
					res.send(RC_ERROR);
					res.end();
					next();
				} // if backend error

				if(0 === rows.length) {
					console.log("very first entry, OK");
				} else {
					var lastIP = rows[0].ipv4;
					if(lastIP === qIP) {
						res.send(RC_NOCHNG);
						res.end();
						next();
					}
				} // if multiple entries

				myConnectionPool.query("INSERT INTO entries (fkuser,ipv4) VALUES(?,?)", [iduser,qIP], function(err, rows) {
					if(err) {
						console.log("error inserting ip");
						res.status(500);
						res.send(RC_ERROR);
						res.end();
						next();
					} // if backend error

					res.send(RC_OK);
					res.end();
				}); // Query INSERT ip

			}); // Query SELECT ip

		}); // Query SELECT user
	});

};