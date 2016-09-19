/*
 * Export vocab content stuff as an anonymous object
 */

"use strict";

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

/* IN: de-es
 * OUT: id aus VLANG Tabelle
 */
VocabContent.prototype.getLanguage = function(req, languages) {
	var aLangs = languages.split('-');
	var sLangFrom = aLangs[0];
	var sLangTo = aLangs[1];
	myConnectionPool.query('SELECT id FROM vlang WHERE langfrom=? AND langto=?', [sLangFrom, sLangTo], function(err, rows, fields) {
		if(err) {
			console.log('getLanguage end ' + err);
		} // if
		console.log('getLanguage count=' + rows.length);
		req.idlang = rows[0].id;
		console.log('ID=' + req.idlang);
	});
};

VocabContent.prototype.getVocabs = function(req, vcount) {
	myConnectionPool.query('SELECT * FROM vcard WHERE idlang=? ORDER BY RAND() LIMIT ?', [1, vcount], function(err, rows, fields) {
		if(err) {
			console.log('getVocabs end ' + err);
		} // if
		console.log('getVocabs ' + rows.length);
		req.session.vcards = rows;
	});
};


module.exports = new VocabContent();