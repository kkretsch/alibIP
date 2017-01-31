/*
 * App and express routing intelligence
 */

/*jshint esversion: 6 */

"use strict";

const express = require('express')
      , session = require('express-session')
      , RedisStore = require('connect-redis')(session)
      , lessMiddleware = require('less-middleware')
      , flash = require('connect-flash')
	  , favicon = require('serve-favicon')
	  , morgan = require('morgan')
	  , bodyParser = require('body-parser')
	  , methodOverride = require('method-override')
	  , errorhandler = require('errorhandler')
	  , routes = require('../routes')
	  , user = require('../routes/user')
	  , intern = require('../routes/intern')
	  , http = require('http')
	  , path = require('path')
	  , async = require('async')
	  , mysql = require('mysql')
	  , nconf = require('nconf');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

nconf.argv()
	.env()
	.file({ file: __dirname + '/../config.json' });

const app = express();

var mysql_user = nconf.get('MYSQLUSER');
var mysql_pwd = nconf.get('MYSQLPWD');
var myConnectionPool = mysql.createPool({
	connectionLimit: 10,
	host: 'localhost',
	user: mysql_user,
	password: mysql_pwd,
	database: 'iplog'
});

app.locals.myAppName = 'Iplog Info';

// all environments
app.set('views', __dirname + '/../views');
app.set('view engine', 'ejs');

// exception "/favicon.ico" not served by nginx but nodejs (same to robots.txt)
app.use(favicon(__dirname + '/../public/favicon.ico'));

app.use(morgan('combined'));	// Logging

app.use(bodyParser.urlencoded({ extended: false }));

app.use(methodOverride());

app.use(lessMiddleware(path.join(__dirname, '../public'), {
	  debug: false,
}));

// Served my nginx anyway
app.use(express.static(path.join(__dirname, '../public')));

var sess = {
	  secret: 'Some Secret',
	  cookie: {},
	  resave: false,
	  saveUninitialized: false
};

//development or production?
if ('development' === app.get('env')) {
	console.log('ENV development');
	app.use(errorhandler());
} else {
	console.log('ENV production: ' + app.get('env'));

	sess.store = new RedisStore({
		host: nconf.get('REDISHOST'),
		port: nconf.get('REDISPORT'),
		db: nconf.get('REDISDB'),
		prefix: nconf.get('REDISPFX')
	});
} // if

app.use(session(sess));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

/*
passport.use(new LocalStrategy({
	jidField: 'jid',
	passwordField: 'pwd'
}
));
*/

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
			var newUserMysql = new Object();
			newUserMysql.email = email;
			newUserMysql.password = password;
			myConnectionPool.query("INSERT INTO users (email,password) VALUES(?,?)", [email,password], function(err, rows) {
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
		if (rows[0].password !== password) {
			return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'));
		}
		return done(null, rows[0]);
	});
}));








require('../application/routes.js')(app, passport);

module.exports = app;