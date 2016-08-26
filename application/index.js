/*
 * App and express routing intelligence
 */

/*jshint esversion: 6 */

const express = require('express')
      , session = require('express-session')
      , RedisStore = require('connect-redis')(session)
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
	  , async = require('async')
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
//	sess.cookie.secure = true; ??
	sess.store = new RedisStore({
		url: nconf.get('REDISURL'),
		secret: nconf.get('REDISPWD')
	});
} // if

app.use(session(sess));

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


var vocabContent = require('./vocab');
vocabContent.initialize(app);


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

app.use('/classroom/list', function(req, res, next) {
	async.series([
	              function(callback) {
	            	  console.log('prefilling');
	            	  callback(null, 'logging');
	              },
	              function(callback) {
	            	  vocabContent.getVocabs(req, 5);
	            	  callback(null, 'filling');
	              },
	              function(callback) {
	            	  next();
	            	  callback(null, 'forwarding');
	              }
	],
	function(err, results) {
		console.log(results);
	});
}
);

app.get('/', function(req, res) {
	res.redirect('http://blog.vocab.guru/');
	res.end();
});


// Routes
app.get('/home', routes.index);

app.post('/u/register', user.register);
app.post('/u/login', 
		passport.authenticate('xmpp', { failureRedirect: '/home?login' } ),
		function(req, res) {
			vocabContent.addUser(req);
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
app.get('/classroom/list', classroom.list);


app.get('/intern', intern.index);


module.exports = app;