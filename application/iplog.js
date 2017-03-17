/*jshint esversion: 6 */

"use strict";

// application/iplog.js

module.exports = function(app, passport, myConnectionPool) {

	const validator = require('validator');

	// Parameters
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
		myConnectionPool.query('SELECT id,ts,ipv4,ipv6,tsrefresh,countrefresh FROM entries WHERE fkuser=? ORDER BY ts DESC LIMIT ?,?', [req.user.id,iFrom,req.pagelen], function(err, rows) {
			if (err) {
				console.log(err);
				return res.status(500).end();
			}
			res.setHeader('Content-Type', 'application/json');
			res.setHeader('Cache-Control', 'private, max-age=60');
			res.json(rows);
		});
	});

};