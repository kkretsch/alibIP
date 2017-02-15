/*jshint esversion: 6 */

"use strict";

// application/auth.js

module.exports = function(app, passport, myConnectionPool) {
	const bCrypt = require('bcrypt-nodejs');
	const LocalStrategy = require('passport-local').Strategy;
	const mjml = require('mjml')
	, mjmlUtils = require('mjml-utils')
	, fs = require('fs')
	, appRoot = require('app-root-path')
	, createHash = require('sha.js')
	, emailjs = require('emailjs');

	function sendmail(email, uid, sHash) {
		var sFilepath = appRoot + '/mailrun/register.html';
		var sProject = app.locals.conf.get('PROJECTNAME');
		var sDomain = app.locals.conf.get('PROJECTDOMAIN');
		mjmlUtils.inject(sFilepath, {
			project: sProject,
			domain: sDomain,
			email: email,
			uid: uid,
			hash: sHash,
		}).then(finalTemplate => {
			var sMailserver = app.locals.conf.get('MAILSERVER');

			// Mail senden
			var server = emailjs.server.connect({
				host: sMailserver,
				ssl: false
			});
			var message = {
				text: "See html content",
				from: sProject + " <noreply@" + sDomain + ">",
				to: email,
				subject: "Registration confirmation",
				attachment: [
					{data: finalTemplate, alternative: true}
				]
			};
			server.send(message, function(err,message) {
				if(err)	{
					console.log(err || message);
				}
				var sMsgId = message.header["message-id"];
				console.log("Sending mail ID " + sMsgId);
				return true;
			});
		});

	} // function
	
	
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
				req.session.flash_error = 'That email is already taken.';
				return done(null, false, { message: 'That email is already taken.' });
			} else {
				var newUserMysql = {};
				newUserMysql.email = email;
				newUserMysql.password = password;
				var salt = bCrypt.genSaltSync(8);
				console.log("Salt=" + salt);
				var hPassword = bCrypt.hashSync(password, salt, null);
				console.log("hash=" + hPassword);
				var sha256 = createHash('sha256');
				var sRegisterHash = sha256.update("IplogSecret:"+email+Date.now(), 'utf8').digest('hex');
				myConnectionPool.query("INSERT INTO users (email,passwordhash,emailhash) VALUES(?,?,?)", [email,hPassword,sRegisterHash], function(err, rows) {
					newUserMysql.id = rows.insertId;
					sendmail(email, newUserMysql.id, sRegisterHash);
					req.session.flash_info = 'Wait for your optin email.';
					return done(null, false, {message: 'Wait for your optin email.'});
					//return done(null, newUserMysql);
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
				req.session.flash_error = 'No user found.';
				return done(null, false, { message: 'No user found.' });
			}
			var sHashedPasswd = rows[0].passwordhash;
			console.log("compare clear with hashed="+sHashedPasswd);
			if(!bCrypt.compareSync(password, sHashedPasswd)) {
				console.log("compare failed");
				req.session.flash_error = 'Oops! Wrong password.';
				return done(null, false, { message: 'Oops! Wrong password.' });
			}
			if(rows[0].emailhash) {
				var id = rows[0].id; 
				myConnectionPool.query("UPDATE users SET emailhash=NULL WHERE id=? LIMIT 1", [id], function(err, rows) {
					if(err) {
						console.log("resetting hash to null failed?! " + err);
					}
				});
			} // if
			return done(null, rows[0]);
		});
	}));
};