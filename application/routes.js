/*jshint esversion: 6 */

"use strict";

//application /routes.js

module.exports = function(app, passport) {

	const routes = require('../routes');

	// Parameters
	app.param('languages', function(req, res, next, languages) {
		console.log('PARAM middleware languages=' + languages);
		req.languages = languages;
//		vocabContent.getLanguage(req, languages, next);
	});

	// Protected Paths?
	app.use('/classroom', function(req, res, next) {
		if(req.isAuthenticated()) {
			next();
		} else {
			res.redirect('/?login');
			res.end();
		} // if
	} // function
	);
	app.use('/classroom/*', function(req, res, next) {
			if(req.isAuthenticated()) {
				console.log('u=' + req.user.user);
				next();
			} else {
				res.redirect('/?login');
				res.end();
			} // if
		} // function
	);
	app.use('/api/*', function(req, res, next) {
		if(req.isAuthenticated()) {
			next();
		} else {
			res.redirect('/?login');
			res.end();
		} // if
	} // function
	);
	app.use('/intern/*', function(req, res, next) {
			passport.authenticate('xmpp', { failureRedirect: '/?login' } );
			next();
		}
	);
	// real Routes
	app.get('/', routes.index);

	app.post('/u/register', passport.authenticate('local-signup', {
		successRedirect: '/my',
		failureRedirect: '/?signup',
		failureFlash: true
	}));
	app.post('/u/login', passport.authenticate('local', {
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

	app.use(function(req, res, next) {
		res.status(404).render('pages/error404', { title: 'Not found', locals: { nocache: true } });
	});

};
