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
	var mysql_pwd = nconf.get('MYSQPWD');

	myConnectionPool = mysql.createPool({
		connectionLimit: 10,
		host: 'localhost',
		user: mysql_user,
		password: mysql_pwd,
		database: 'vocab'
	});
};

module.exports = new VocabContent();