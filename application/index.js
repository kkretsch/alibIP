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
app.locals.conf = nconf;

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


require('../application/auth.js')(app, passport, myConnectionPool);
require('../application/iplog.js')(app, passport, myConnectionPool);
require('../application/routes.js')(app, passport);


module.exports = app;