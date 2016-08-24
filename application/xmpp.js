/*
 * Export an anonymous object
 */

var VocabClient = function () {
	var app = undefined;
	var client = undefined;
};

VocabClient.prototype.initialize = function(globalApp) {
	var Core = require('node-xmpp-core')
	, Client = require('node-xmpp-client')
	, Component = require('node-xmpp-component')
	, nconf = require('nconf');

	app = globalApp;

	nconf.argv()
	.env()
	.file({ file: __dirname + '/../config.json' });

	var xmpp_user = nconf.get('XMPPUSER');
	var xmpp_pwd = nconf.get('XMPPPWD');

	// XMPP stuff #1
	console.log('XMPP login as ' + xmpp_user);

	client = new Client({
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
					oWaiting.actionERROR();
				} else {
					console.log("!! free name " + oWaiting.name);
					oWaiting.actionOK();
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

};

module.exports = new VocabClient();