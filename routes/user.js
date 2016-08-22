
/*
 * GET users listing and more
 */

exports.list = function(req, res) {
  res.send("respond with a resource");
};

exports.register = function(req, res) {
	  res.send("register");
};
	
exports.login = function(req, res) {
	var name = req.body.name;
	res.send("login " + name);
	res.end();
};