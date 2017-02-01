/*jshint esversion: 6 */

"use strict";

// application/auth.js

module.exports = function(app, passport, myConnectionPool) {
	const bCrypt = require('bcrypt-nodejs');
	const LocalStrategy = require('passport-local').Strategy;

	passport.serializeUser(function(user, done) {
		done(null, user.id);
	});
	passport.deserializeUser(function(id, done) {
		myConnectionPool.query("SELECT * FROM users WHERE id=?", [id], function(err, rows) {
			done(err, rows[0]);
		});
	});
	passport.use('local-signup', new LocalStrategy({
		usernameField : 'email',
		passwordField : 'password',
		passReqToCallback : true
	},
	function(req, email, password, done) {
		myConnectionPool.query("SELECT * FROM users WHERE email=?", [email], function(err, rows) {
			if(err) {
				return done(err);
			}
			if(rows.length) {
				return done(null, false, req.flash('signupMessage', 'That email is already taken.'));
			} else {
				var newUserMysql = {};
				newUserMysql.email = email;
				newUserMysql.password = password;
				var salt = bCrypt.genSaltSync(8);
				console.log("Salt=" + salt);
				var hPassword = bCrypt.hashSync(password, salt, null);
				console.log("hash=" + hPassword);
				myConnectionPool.query("INSERT INTO users (email,passwordhash) VALUES(?,?)", [email,hPassword], function(err, rows) {
					newUserMysql.id = rows.insertId;
					return done(null, newUserMysql);
				});
			}
		});
	}));
	passport.use('local-login', new LocalStrategy({
		usernameField : 'email',
		passwordField : 'password',
		passReqToCallback : true
	},
	function(req, email, password, done) {
		myConnectionPool.query("SELECT * FROM users WHERE email=?", [email], function(err, rows) {
			if(err) {
				return done(err);
			}
			if(!rows.length) {
				return done(null, false, req.flash('loginMessage', 'No user found.'));
			}
			var sHashedPasswd = rows[0].passwordhash;
			console.log("compare clear="+password+" with hashed="+sHashedPasswd);
			if(!bCrypt.compareSync(password, sHashedPasswd)) {
				console.log("compare failed");
				return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
			}
			return done(null, rows[0]);
		});
	}));
};