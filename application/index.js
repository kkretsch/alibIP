/*
 * App and express routing intelligence
 */

/*jshint esversion: 6 */

"use strict";

const express = require('express')
      , session = require('express-session')
      , csrf = require('csurf')
      , RedisStore = require('connect-redis')(session)
      , lessMiddleware = require('less-middleware')
	  , favicon = require('serve-favicon')
	  , morgan = require('morgan')
	  , bodyParser = require('body-parser')
	  , cookieParser = require('cookie-parser')
	  , methodOverride = require('method-override')
	  , errorhandler = require('errorhandler')
	  , http = require('http')
	  , path = require('path')
	  , async = require('async')
	  , i18n = require('i18n')
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
	connectionLimit: nconf.get('MYSQLPOOL'),
	host: nconf.get('MYSQLHOST'),
	user: mysql_user,
	password: mysql_pwd,
	database: nconf.get('MYSQLDB')
});

app.locals.myAppName = nconf.get('PROJECTNAME');
app.locals.conf = nconf;

// all environments
app.set('views', __dirname + '/../views');
app.set('view engine', 'ejs');
app.set('trust proxy', 'loopback');

// exception "/favicon.ico" not served by nginx but nodejs (same to robots.txt)
app.use(favicon(__dirname + '/../public/favicon.ico'));

app.use(morgan('combined'));	// Logging

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(methodOverride());

app.use(lessMiddleware(path.join(__dirname, '../public'), {
	  debug: false,
}));

// Served my nginx anyway
app.use(express.static(path.join(__dirname, '../public')));

var sess = {
	  secret: nconf.get('SESSSECRET'),
	  key: nconf.get('SESSKEY'),
	  cookie: {
		  httpOnly: true,
		  path: '/'
	  },
	  resave: false,
	  saveUninitialized: false
};

i18n.configure({
	locales: ['en', 'de'],
	defaultLocale: 'de',
	autoReload: true,
	updateFiles: true,
	syncFiles: true,
	cookie: 'alibipLocale',
	register: global,
	directory: __dirname + '/../locales'
});
app.use(i18n.init);
console.log(__('configured i18n'));

//development or production?
if ('development' === app.get('env')) {
	console.log('ENV development');

	app.use(errorhandler());
} else {
	console.log('ENV production: ' + app.get('env'));


    if(true === nconf.get('LIMITERACTIVE')) {
    	console.log("ENABLE limit");
    	app.set('redisdb', nconf.get('REDISDB'));
        const redisClient = require('redis').createClient();
        const limiter = require('express-limiter')(app, redisClient);

        limiter({
    		path: '*',
    		method: 'all',
    		lookup: 'headers.x-forwarded-for',
    		total: nconf.get('LIMITERTOTAL'),
    		expire: nconf.get('LIMITEREXPIRE'),
    		onRateLimited: function(req, res, next) {
    			next({message: req.__('Rate limit exceeded'), status: 429});
    		}
    	});
	} // if limiter

	sess.cookie.secure = true;
	sess.cookie.domain = nconf.get('SESSDOMAIN');

	if(true === nconf.get('SESSREDIS')) {
		console.log("ENABLE redis session");
		sess.store = new RedisStore({
			host: nconf.get('REDISHOST'),
			port: nconf.get('REDISPORT'),
			db: nconf.get('REDISDB'),
			prefix: nconf.get('REDISPFX')
		});
	} // if
} // if

app.use(session(sess));
app.use(passport.initialize());
app.use(passport.session());

// Some config values for frontend
app.use(function(req, res, next) {
	res.locals.projectname = nconf.get('PROJECTNAME');
	res.locals.projectdomain = nconf.get('PROJECTDOMAIN');
	res.locals.projectblog = nconf.get('PROJECTBLOG');
	res.locals.projectlang = nconf.get('PROJECTLANG');

	res.locals.authgoogle = nconf.get('AUTHGOOGLE');
	res.locals.authbing = nconf.get('AUTHBING');
	
	res.locals.piwikurl = nconf.get('PIWIKURL');
	res.locals.piwikid = nconf.get('PIWIKID');

	res.locals.googleplus = nconf.get('GOOGLEPLUS');

	next();
});

app.use(function(req, res, next) {
	res.locals.flasherror = req.session.flash_error || '';
	res.locals.flashinfo = req.session.flash_info || '';
	delete req.session.flash_error;
	delete req.session.flash_info;

	next();
});


if(true === nconf.get('CSRFACTIVE')) {
	console.log("ENABLE csrf");
	app.use(csrf());
	app.use(function(req, res, next) {
		// Expose variable to templates via locals
		res.locals.csrftoken = req.csrfToken(); 
		next();
	});
} else {
	app.use(function(req, res, next) {
		res.locals.csrftoken = 'dummy'; 
		next();
	});
} // if

require('../application/auth.js')(app, passport, myConnectionPool);
require('../application/iplog.js')(app, passport, myConnectionPool);
require('../application/routes.js')(app, passport, myConnectionPool);

module.exports = app;