
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
	var name = req.body.name;
	res.send("login " + name);
	res.end();
};