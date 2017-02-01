/*jshint esversion: 6 */

"use strict";

// application/routes.js

module.exports = function(app, passport) {

	//const routes = require('../routes/index.js')(app, passport);
	const routes = require('../routes/index.js');
	
	// Protected Paths?
	app.use('/my', function(req, res, next) {
		if(req.isAuthenticated()) {
			next();
		} else {
			res.redirect('/?login');
			res.end();
		} // if
	} // function
	);
	app.use('/my/*', function(req, res, next) {
			if(req.isAuthenticated()) {
				next();
			} else {
				res.redirect('/?login');
				res.end();
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
			res.end();
		});
	}); 

	// Last resort 404
	app.use(function(req, res, next) {
		res.status(404).render('pages/error404', { title: 'Not found', locals: { nocache: true } });
	});

};
