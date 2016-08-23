
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

var oQueue = new Array();
app.set('queue', oQueue);


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
	  console.log('Received stanza: ' +  stanza);
	  var sID = stanza.attrs.id;
	  if(sID && sID.startsWith("user-unique-")) {
		  myQueue = app.get('queue');
		  console.log("Unique reply to " + sID);
		  console.log("Queue length to search into is " + myQueue.length);
		  var oWaiting = myQueue.filter(function(obj) {
			  return obj.id === sID;
		  })[0];
		  if(oWaiting) {
		  	console.log("found reply for " + oWaiting.name);
		  	var oVcardN = stanza.getChild("vCard").getChild('N');
		  	console.log("has children? " + oVcardN);
		  	if(oVcardN) {
			  	console.log("!! found entry for " + oWaiting.name);
		  		oWaiting.actionOK();
		  	} else {
		  		oWaiting.actionERROR();
		  	} // if
		  	myQueue = myQueue.filter(function(obj) {
				  return obj.id !== sID;
			});
		  	app.set('queue', myQueue);
		  } // if
	  } // if user-unique-*
});

client.on('online', function () {
  console.log('Client is online');
  app.set('xmppconnection', client);

  setInterval(function() { // send keepalive data or server will disconnect
	  
	  var o = new Client.Stanza('presence', { type: 'available' })
	  .c('show').t('dnd').up()
	  .c('status').t('Daemon');
	  client.send(o);
	  console.log('Client keepalive sent');
  }, 30000);
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
app.get('/u/unique', user.unique);


http.createServer(app).listen(app.get('port'), app.get('iface'), function(){
  console.log('Express server listening at ' + app.get('iface') + ' on port ' + app.get('port'));
});
