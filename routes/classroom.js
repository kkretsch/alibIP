/**
 * http://usejsdoc.org/
 */

exports.index = function(req, res) {
	res.render('classroom', { title: 'Classroom - Vocab Guru' });
};
