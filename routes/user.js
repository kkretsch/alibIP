
/*
 * GET users listing and more
 */

exports.register = function(req, res) {
	var newUserName = req.body.name;
	var newUserPass = req.body.pwd1;
	var Client = require('node-xmpp-client');
	
	  var stanza = new Client.Stanza('iq', {type: 'set', id: 'reg1', to: 'vocab.guru'})
	  .c('query', {xmlns: 'jabber:iq:register'})
	  .c('username').t(newUserName).up()
	  .c('password').t(newUserPass);
	  req.app.get('xmppconnection').send(stanza);

	res.send("register");
};


exports.unique = function(req, res) {
	var newUserName = req.query.search; // query/GET oder body/POST
	var sID = "user-unique-" + Date.now() + Math.random();
	var Client = require('node-xmpp-client');

	console.log("async search for " + newUserName);
	var oQueue = req.app.get('queue');
	oQueue.push({
		id: sID,
		name: newUserName,
		actionOK: function() {
			console.log("In OK Callback");
			res.send("OK");
			res.end();
		},
		actionERROR: function() {
			console.log("In Error Callback");
			res.send("ERROR");
			res.end();
		}
	});
	console.log("Queue length now " + oQueue.length);
	req.app.set('queue', oQueue);

	var stanza = new Client.Stanza('iq', {type: 'get', id: sID, to: newUserName+'@vocab.guru'})
	.c('vcard', {xmlns: 'vcard-temp'});

	req.app.get('xmppconnection').send(stanza);
};