/*jshint esversion: 6 */

/*
 * GET home page.
 */

"use strict";

const mjml = require('mjml')
, mjmlUtils = require('mjml-utils')
, fs = require('fs')
, appRoot = require('app-root-path')
, email = require('emailjs');

var myApp;
var myPassport;
var myConnectionPool;

/*
 * https://darrenderidder.github.io/talks/ModulePatterns/
 * Pattern 4: Export an Anonymous Object
 * or
 * Pattern 6: Export an Anonymous Prototype
 */
function MyRoutes(app, passport, connectionPool) {
	console.log("In Konstruktor MyRoutes");
	myApp = app;
	myPassport = passport;
	myConnectionPool = connectionPool;
}

MyRoutes.prototype.index = function(req, res) {
	if(req.isAuthenticated()) {
		res.render('pages/index_user', { title: 'Home user', user: req.user });
	} else {
		res.render('pages/index_anon', { title: 'Home guest' });
	} // if
};

MyRoutes.prototype.myhome = function(req, res) {
	if(req.isAuthenticated()) {
		console.log("show entries for user " + req.user.id);
		myConnectionPool.query('SELECT * FROM entries WHERE fkuser=? ORDER BY ts DESC', [req.user.id], function(err, rows) {
			if (err) {
				return res.end();
			}
			res.render('pages/index_user', { title: 'Home user', user: req.user, entries: rows});
		});
	} else {
		res.redirect('/');
		res.end();
	} // if
};

MyRoutes.prototype.mailtest = function(req, res) {
	var sFilepath = appRoot + '/mailrun/register.html';

	mjmlUtils.inject(sFilepath, {
		email: 'kai@kaikretschmann.de',
		uid: 123,
		hash: 'abc',
	}).then(finalTemplate => {
		var sMailserver = myApp.locals.conf.get('MAILSERVER');

		// Mail senden
		var server = email.server.connect({
			host: sMailserver,
			ssl: false
		});
		var message = {
			text: "See html content",
			from: "IPlog <noreply@iplog.info>",
			to: "Kai Kretschmann <kai@kaikretschmann.de>",
			cc: "K. Kretschmann <kkr@mit.de>",
			subject: "Registration confirmation",
			attachment: [
				{data: finalTemplate, alternative: true}
			]
		};
		server.send(message, function(err,message) {
			if(err)	console.log(err || message);
			var sMsgId = message.header["message-id"];
			console.log("Sending mail ID " + sMsgId);
			return res.send('OK');
		});
	});

};


module.exports = MyRoutes;
