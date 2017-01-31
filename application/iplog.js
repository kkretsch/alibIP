/*jshint esversion: 6 */

"use strict";

// application/iplog.js

module.exports = function(app, passport, myConnectionPool) {

	const routes = require('../routes');

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
				res.send("error getting user");
				res.end();
			} else {
				if(0 === rows.length) {
					console.log("no user found");
					res.status(404);
					res.send("User not found");
					res.end();
				} else {
					var iduser = rows[0].id;
					myConnectionPool.query("INSERT INTO entries (fkuser,ipv4) VALUES(?,?)", [iduser,qIP], function(err, rows) {
						res.send("OK");
						res.end();
					});
				} // if found
			} // if error
		});
	});

};