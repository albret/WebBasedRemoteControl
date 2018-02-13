module.exports = function(app) {

	//TODO add more routes for each page and api call and create ejs template file for each page	

	app.get('/test', function(req, res) {
    	res.render('index', {message: 'Hello World        --Kevin\n'});
	});
	
	app.get('/account/:user', function(req, res) {
		var username = req.params.user;
		//TODO
	});
};
