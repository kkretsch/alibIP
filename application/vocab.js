/*
 * Export vocab content stuff as an anonymous object
 */

var VocabContent = function () {};

var myLocalApp;
var myConnectionPool;

VocabContent.prototype.initialize = function(globalApp) {
	var nconf = require('nconf'),
		mysql = require('mysql');

	myLocalApp = globalApp;

	nconf.argv()
	.env()
	.file({ file: __dirname + '/../config.json' });

	var mysql_user = nconf.get('MYSQLUSER');
	var mysql_pwd = nconf.get('MYSQLPWD');

	myConnectionPool = mysql.createPool({
		connectionLimit: 10,
		host: 'localhost',
		user: mysql_user,
		password: mysql_pwd,
		database: 'vocab'
	});
};

VocabContent.prototype.addUser = function(req) {
	// console.log('addUser start ' + req.body.jid);
	myConnectionPool.query('INSERT IGNORE INTO vuser SET jid=?', [req.body.jid], function(err, results, fields) {
		if(err) {
			console.log('addUser end ' + err);
		} // if
	});
};

module.exports = new VocabContent();