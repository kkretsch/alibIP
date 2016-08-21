
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path')
  , Client = require('node-xmpp-client');

var app = express();

// XMPP stuff #1
var client = new Client({
//	  jid: 'tester@vocab.guru',
//	  password: 'xxx',
	  jid: 'admin@vocab.guru',
	  password: 'g3h3im',
	  reconnect: true
	});

var component = 'whatever';
var x = 0;
var old = x;
var average = 0;
var interval;
var firstMessage = true;
var c = 0;

client.on('stanza', function (stanza) {
	  console.log('Received stanza: ', c++, stanza.toString());
//	  if (stanza.is('message') && stanza.attrs.type === 'chat' && !stanza.getChild('delay')) {
//	    clearInterval(interval);
//	    if (firstMessage) {
//	    	console.log('Someone started chatting …');
//	    }
//	    firstMessage = false;
//	    var i = parseInt(stanza.getChildText('body'), 10);
//	    x = i;
//	    var reply = new Client.Stanza('message', {
//	      to: stanza.attrs.from,
//	      from: stanza.attrs.to,
//	      type: 'chat'
//	    });
//	    reply.c('body').t(isNaN(i) ? 'i can count!' : ('' + (i + 1)));
//	    setTimeout(function () {
//	      client.send(reply);
//	    }, 321);
//	  }
	});

client.on('online', function () {
  console.log('Client is online');
  firstMessage = true;
  // client.send('<presence/>');

  var stanza = new Client.Stanza('iq', {type: 'set', id: 'reg1', to: 'vocab.guru'})
  .c('query', {xmlns: 'jabber:iq:register'})
  .c('username').t('user').up()
  .c('password').t('1234');
  client.send(stanza);

/*
  interval = setInterval(function () {
    if (!firstMessage) {
    	return;
    }
    //         firstMessage = false
    console.log('Start chatting …');
    var reply = new Client.Stanza('message', {
      to: component,
      type: 'chat'
    });
    reply.c('body').t('0');
    client.send(reply);
  }, 321);*/
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
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' === app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), app.get('iface'), function(){
  console.log('Express server listening at ' + app.get('iface') + ' on port ' + app.get('port'));
});
