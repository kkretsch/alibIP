/*jshint esversion: 6 */

/*
 * GET home page.
 */

"use strict";

const mjml = require('mjml')
    , fs = require('fs')
    , appRoot = require('app-root-path');

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
	var sFilepath = appRoot + '/mailtpl/register.mjml';
	console.log("read file from path=" + sFilepath + "!");
	var contents = fs.readFileSync(sFilepath, 'utf8');
	const htmlOutput = mjml.mjml2html(contents);
	return res.send(htmlOutput.html);
};