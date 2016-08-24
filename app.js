
/**
 * Module dependencies.
 */

//const app = require('./app');
//const http = require('http');


var express = require('express')
  , favicon = require('serve-favicon')
  , morgan = require('morgan')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , errorhandler = require('errorhandler')
  , routes = require('./routes')
  , user = require('./routes/user')
  , intern = require('./routes/intern')
  , http = require('http')
  , path = require('path');

const passport = require('passport');
const XmppStrategy = require('passport-xmpp').Strategy;

var fs  = require('fs'),
  nconf = require('nconf');
nconf.argv()
  .env()
  .file({ file: __dirname + '/config.json' });

var app = express();

var vocabClient = require('./application/xmpp');
vocabClient.initialize(app);

var oQueue = new Array();
app.set('queue', oQueue);

app.use(passport.initialize());
passport.use(new XmppStrategy());

// all environments
app.set('port', process.env.PORT || 3001);
app.set('iface', process.env.IFACE || '::1');
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(morgan('combined'));	// Logging

app.use(bodyParser.urlencoded({ extended: false }));

app.use(methodOverride());

app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(errorhandler());
} // if


app.get('/', function(req, res) {
	res.redirect('http://blog.vocab.guru/');
	res.end();
});

app.get('/home', routes.index);
app.get('/users', user.list);
app.post('/u/register', user.register);
app.post('/u/login', user.login); // TODO
app.get('/u/unique', user.unique);
app.get('/intern',
		passport.authenticate('xmpp', { failureRedirect: '/home?login' } ),
		intern.index
);


http.createServer(app).listen(app.get('port'), app.get('iface'), function(){
  console.log('Express server listening at ' + app.get('iface') + ' on port ' + app.get('port'));
});
