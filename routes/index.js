/*jshint esversion: 6 */

/*
 * GET home page.
 */

"use strict";

const mjml = require('mjml')
, fs = require('fs')
, appRoot = require('app-root-path')
, email = require('emailjs');

var myApp;
var myPassport;

/*
 * https://darrenderidder.github.io/talks/ModulePatterns/
 * Pattern 4: Export an Anonymous Object
 * or
 * Pattern 6: Export an Anonymous Prototype
 */
function MyRoutes(app, passport) {
	console.log("In Konstruktor MyRoutes");
	myApp = app;
	myPassport = passport;
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
		res.render('pages/index_user', { title: 'Home user', user: req.user });
	} else {
		res.redirect('/');
		res.end();
	} // if
};

MyRoutes.prototype.mailtest = function(req, res) {
	var sFilepath = appRoot + '/mailtpl/register.mjml';
	console.log("read file from path=" + sFilepath + "!");
	var contents = fs.readFileSync(sFilepath, 'utf8');
	const htmlOutput = mjml.mjml2html(contents);

	var sMailserver = myApp.locals.conf.get('MAILSERVER');
	console.log("mailserver=" + sMailserver);
	// Mail senden
	var server = email.server.connect({
		host: "localhost",
		ssl: false
	});
	var message = {
			text: "See html content",
			from: "noreply@iplog.info",
			to: "kai@kaikretschmann.de",
			subject: "Registration confirmation",
			attachment: [
				{data: htmlOutput, alternative: true}
			]
	};
	server.send(message, function(err,message) {
		console.log(err || message);
		return res.send(htmlOutput.html);
	});

};


module.exports = MyRoutes;
