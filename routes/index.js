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
		console.log("show entries for user " + req.user.id);
		res.render('pages/index_user', { title: 'Home user', user: req.user});
	} else {
		res.render('pages/index_anon', { title: 'Home guest' });
	} // if
};

MyRoutes.prototype.myhome = function(req, res) {
	if(req.isAuthenticated()) {
		console.log("show entries for user " + req.user.id);
		res.render('pages/index_user', { title: 'Home user', user: req.user, ip: req.ip});
	} else {
		res.redirect('/');
		res.end();
	} // if
};

MyRoutes.prototype.myprofile = function(req, res) {
	if(req.isAuthenticated()) {
		res.render('pages/profile', { title: __('Profile'), user: req.user, ip: req.ip});
	} else {
		res.redirect('/');
		res.end();
	} // if
};

MyRoutes.prototype.mycalendar = function(req, res) {
	if(req.isAuthenticated()) {
		console.log("show entries for user " + req.user.id);
		res.render('pages/calendar', { title: __('Calendar'), user: req.user, ip: req.ip});
	} else {
		res.redirect('/');
		res.end();
	} // if
};

MyRoutes.prototype.mygrants = function(req, res) {
	if(req.isAuthenticated()) {
		res.render('pages/grants', { title: __('Grants'), user: req.user, ip: req.ip});
	} else {
		res.redirect('/');
		res.end();
	} // if
};


module.exports = MyRoutes;
