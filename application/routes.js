/*jshint esversion: 6 */

"use strict";

// application/routes.js

module.exports = function(app, passport, myConnectionPool) {

	var MyRoutes = require('../routes/index.js');
	var routes = new MyRoutes(app, passport);
	
	// Protected Paths?
	app.use('/my', function(req, res, next) {
		if(req.isAuthenticated()) {
			next();
		} else {
			res.redirect('/?login');
			return res.end();
		} // if
	} // function
	);
	app.use('/my/*', function(req, res, next) {
			if(req.isAuthenticated()) {
				next();
			} else {
				res.redirect('/?login');
				return res.end();
			} // if
		} // function
	);

	// real Routes HOME
	app.get('/', routes.index);
	app.get('/my', routes.myhome);
	app.get('/mail', routes.mailtest);

	// Login/Logout/Register
	app.post('/u/register', passport.authenticate('local-signup', {
		successRedirect: '/my',
		failureRedirect: '/?signup',
		failureFlash: true
	}));
	app.post('/u/login', passport.authenticate('local-login', {
		successRedirect: '/my',
		failureRedirect: '/?login',
			failureFlash: true
	}));
	app.get('/u/logout', function(req, res) {
		console.log('logging out');
		req.logout();
		req.session.destroy(function (err) {
			res.redirect('/?logout');
			return res.end();
		});
	}); 
	app.get('/u/confirm', function(req, res) {
		var qID = req.query.id;
		var qHash = req.query.hash;
		myConnectionPool.query("SELECT id FROM users WHERE id=? AND emailhash=? AND status='inregistration'", [qID,qHash], function(err, rows) {
			if(err) {
				res.redirect('/?error');
				return res.end();
			}
			if(!rows.length) {
				res.redirect('/?error');
				return res.end();
//				return done(null, false, req.flash('loginMessage', 'No user found.'));
			}
			var id=rows[0];
			myConnectionPool.query("UPDATE users SET status='active', emailhash=NULL WHERE id=? LIMIT 1", [id], function(err, rows) {
				res.redirect('/?registered');
				return res.end();
			});
		});

		res.redirect('/?confirmed');
		return res.end();
	});

	// Last resort 404
	app.use(function(req, res, next) {
		res.status(404).render('pages/error404', { title: 'Not found', locals: { nocache: true } });
	});

};
