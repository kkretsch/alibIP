
/**
 * Module dependencies.
 */

var express = require('express')
  , favicon = require('serve-favicon')
  , morgan = require('morgan')
  , bodyParser = require('body-parser')
  , methodOverride = require('method-override')
  , errorhandler = require('errorhandler')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , Core = require('node-xmpp-core')
  , Client = require('node-xmpp-client')
  , Component = require('node-xmpp-component');

var fs  = require('fs'),
  nconf = require('nconf');
nconf.argv()
  .env()
  .file({ file: __dirname + '/config.json' });

var app = express();

var xmpp_user = nconf.get('XMPPUSER');
var xmpp_pwd = nconf.get('XMPPPWD');

// XMPP stuff #1
console.log('XMPP login as ' + xmpp_user);
var client = new Client({
	  jid: xmpp_user,
	  password: xmpp_pwd,
	  reconnect: true
	});



client.on('stanza', function (stanza) {
	  console.log('Received stanza: ');
});

client.on('online', function () {
  console.log('Client is online');
  app.set('xmppconnection', client);
});

client.on('offline', function () {
  console.log('Client is offline');
});

client.on('connect', function () {
  console.log('Client is connected');
});

client.on('reconnect', function () {
  console.log('Client reconnects …');
});

client.on('disconnect', function (e) {
  console.log('Client is disconnected', client.connection.reconnect, e);
});

client.on('error', function (e) {
  console.error(e);
  process.exit(1);
});

process.on('exit', function () {
  client.end();
});



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

/*app.param('name', function(req,res,next,name) {
	console.log("app="+name);
	next();
});*/

app.get('/', function(req, res) {
	res.redirect('http://blog.vocab.guru/');
	res.end();
});

app.get('/home', routes.index);
app.get('/users', user.list);
app.post('/u/register', user.register);
app.post('/u/login', user.login);


http.createServer(app).listen(app.get('port'), app.get('iface'), function(){
  console.log('Express server listening at ' + app.get('iface') + ' on port ' + app.get('port'));
});
