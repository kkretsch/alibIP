/**
 * http://usejsdoc.org/
 */

"use strict";

var myConnectionPool;
const async = require('async');

function shuffle(array) {
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }

    return array;
}

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

exports.ask = function(req, res) {
	var locals = {};
	var myConn;

	async.series([
		function(callback) {
		  	myConnectionPool.getConnection(function(err, connection) {
				if (err) {
					return callback(err);
				}
				myConn = connection;
			  	callback();
		  	});
		},
		function(callback) {
			myConn.query('SELECT * FROM vcard WHERE idlang=? ORDER BY RAND() LIMIT 1', [1], function(err, rows) {
				if (err) {
					return callback(err);
				}
				if(rows.length !== 1) {
					return callback(new Error('No question found'));
				}
				locals.vcardfrom = rows[0];
				callback();
			});
		},
		function(callback) {
			myConn.query('SELECT * FROM vcard WHERE idlang=? AND id<>? ORDER BY RAND() LIMIT 2', [1, locals.vcardfrom.id], function(err, rows) {
				if (err) {
					return callback(err);
				}
				if(rows.length !== 2) {
					return callback(new Error('No answers found'));
				}
				locals.vcardsto = rows;
				locals.vcardsto.push(locals.vcardfrom);
				locals.vcardsto = shuffle(locals.vcardsto);
				callback();
			});
		}

		], function(err) {
			if(err) {
				return; // next(err);
			}
			res.render('pages/classroomask', {
				title: 'Classroom List',
				vcardfrom: locals.vcardfrom,
				vcards: locals.vcardsto
			});
			myConn.release();
	});

};
