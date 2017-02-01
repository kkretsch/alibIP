/*jshint esversion: 6 */

/*
 * GET home page.
 */

"use strict";

const mjml = require('mjml')
    , fs = require('fs');

exports.index = function(req, res) {
	if(req.isAuthenticated()) {
		res.render('pages/index_user', { title: 'Home user', user: req.user });
	} else {
		res.render('pages/index_anon', { title: 'Home guest' });
	} // if
};

exports.myhome = function(req, res) {
	if(req.isAuthenticated()) {
		res.render('pages/index_user', { title: 'Home user', user: req.user });
	} else {
		res.redirect('/');
		res.end();
	} // if
};

exports.mailtest = function(req, res) {
	var contents = fs.readFileSync('mailtpl/register.mjml', 'utf8');
	const htmlOutput = mjml.mjml2html(contents);
	return res.send(htmlOutput.html);
};