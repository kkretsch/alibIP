/**
 * http://usejsdoc.org/
 */

exports.index = function(req, res) {
//	var myObject = JSON.stringify(req.user);
//	console.log(myObject);

	res.render('pages/classroom',
	{
		title: 'Classroom - Vocab Guru',
		user: req.user
	}
	);

};


exports.list = function(req, res) {
	console.log('nun hier');
	res.render('pages/classroomlist',
			{
				title: 'Classroom - Vocab Guru',
				vcards: req.session.vcards
			}
			);
};