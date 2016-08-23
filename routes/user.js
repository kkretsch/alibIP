
/*
 * GET users listing and more
 */

exports.list = function(req, res) {
  res.send("respond with a resource");
};

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

exports.login = function(req, res) {
	var name = req.body.lname;
	res.send("login " + name);
	res.end();
};

exports.unique = function(req, res) {
	var newUserName = req.body.name;
	var async = require('async');
	var Client = require('node-xmpp-client');
	var stanza = new Client.Stanza('iq', {type: 'get', id: 'reg1', to: 'vocab.guru'})
	.c('query', {xmlns: 'jabber:iq:search'})
	.c('x', {xmlns: 'jabber:x:data', type: 'submit'})
	.c('field', {var: 'search'}).t(newUserName);

	req.app.get('xmppconnection').send(stanza);

	res.send("OK");
	res.end();
};