/**
 * http://usejsdoc.org/
 */

var myConnectionPool;

exports.initialize = function() {
	var nconf = require('nconf'),
		mysql = require('mysql');

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


exports.index = function(req, res) {
//	var myObject = JSON.stringify(req.user);
//	console.log(myObject);

	res.render('pages/classroom',
	{
		title: 'Classroom',
		user: req.user
	}
	);

};


exports.list = function(req, res) {
	console.log('nun hier in classroom list');
	var vcount=5;
	myConnectionPool.query('SELECT * FROM vcard WHERE idlang=? ORDER BY RAND() LIMIT ?', [1, vcount], function(err, rows, fields) {
		if(err) {
			console.log('getVocabs end ' + err);
		} // if
		console.log('getVocabs ' + rows.length);
		res.render('pages/classroomlist',
		{
				title: 'Classroom List',
				vcards: rows
		});
	});
};