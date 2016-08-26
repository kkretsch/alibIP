/*
 * App and express routing intelligence
 */

/*jshint esversion: 6 */

const express = require('express')
      , session = require('express-session')
//      , RedisStore = require('connect-redis')(session)
	  , favicon = require('serve-favicon')
	  , morgan = require('morgan')
	  , bodyParser = require('body-parser')
	  , methodOverride = require('method-override')
	  , errorhandler = require('errorhandler')
	  , routes = require('../routes')
	  , user = require('../routes/user')
	  , classroom = require('../routes/classroom')
	  , intern = require('../routes/intern')
	  , http = require('http')
	  , path = require('path')
	  , nconf = require('nconf');

const passport = require('passport');
const XmppStrategy = require('passport-xmpp').Strategy;

nconf.argv()
	.env()
	.file({ file: __dirname + '/../config.json' });

const app = express();

app.locals.myAppName = 'Vocab Guru';

var oQueue = [];
app.set('queue', oQueue);


// all environments
app.set('views', __dirname + '/../views');
app.set('view engine', 'ejs');

// exception "/favicon.ico" not served by nginx but nodejs (same to robots.txt)
app.use(favicon(__dirname + '/../public/favicon.ico'));

app.use(morgan('combined'));	// Logging

app.use(bodyParser.urlencoded({ extended: false }));

app.use(methodOverride());

// Served my nginx anyway
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
/*	  store: new RedisStore({
		  url: nconf.get('REDISURL'),
		  secret: nconf.get('REDISPWD')
	  }), */
	  secret: 'Some Secret',
	  resave: false,
	  saveUninitialized: false
}));
app.use(passport.initialize());
passport.use(new XmppStrategy({
	jidField: 'jid',
	passwordField: 'pwd'
}
));
app.use(passport.session());

passport.serializeUser(function(user, done) {
	done(null, user);
});
passport.deserializeUser(function(user, done) {
	done(null, user);
});

// development only
if ('development' === app.get('env')) {
	app.use(errorhandler());
} // if


// Protected Path?
app.use('/classroom', function(req, res, next) {
	if(req.isAuthenticated()) {
		next();
	} else {
		res.redirect('/home?login');
		res.end();
	} // if
} // function
);
app.use('/classroom/*', function(req, res, next) {
		if(req.isAuthenticated()) {
			next();
		} else {
			res.redirect('/home?login');
			res.end();
		} // if
	} // function
);
app.use('/intern/*', function(req, res, next) {
		passport.authenticate('xmpp', { failureRedirect: '/home?login' } );
		next();
	}
);

app.get('/', function(req, res) {
	res.redirect('http://blog.vocab.guru/');
	res.end();
});


// Routes
app.get('/home', routes.index);
app.get('/users', user.list);
app.post('/u/register', user.register);
app.post('/u/login', 
		passport.authenticate('xmpp', { failureRedirect: '/home?login' } ),
		function(req, res) {
			res.redirect('/classroom');
			res.end();
		}
);
app.get('/u/logout', function(req, res) {
	console.log('logging out');
	req.logout();
	res.redirect('/home?logout');
	res.end();
}); 

app.get('/u/unique', user.unique);
app.get('/classroom', classroom.index);
app.get('/intern', intern.index);


module.exports = app;