module.exports = function(app) {

	//TODO add more routes for each page and api call and create ejs template file for each page	

	app.get('/test', function(req, res) {
    	res.render('index', {message: 'Hello World        --Kevin\n'});
	});

	app.get('/', function(req, res) {
		res.render('RClogin');
	});
	
	app.get('/account/:user', function(req, res) {
		var username = req.params.user;
		//TODO
	});

	app.get('/logo', function(req,res) {
		res.sendFile('/home/ec2-user/workspace/WebBasedRemoteControl/views/logo.png');
	});
	
	app.get('/style.css', function(req,res) {
    	res.sendFile('/home/ec2-user/workspace/WebBasedRemoteControl/views/style.css');
    });

	app.get('/createAccount', function(req, res) {
		res.render('AccountCreate');
	});


};
