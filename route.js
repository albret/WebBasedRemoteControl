module.exports = function(app) {

	var rcdb = require('./rcdb');

	/////////////////////////////////////////////////////////////////////////////////////
	/////////////////////////////////EJS Template Routes/////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////
	
	app.get('/', function(req, res) {
		res.render('RClogin');
	});
	
	app.get('/account/:user', function(req, res) {
		// TODO
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

	/////////////////////////////////////////////////////////////////////////////////////
	/////////////////////////////////////API Routes//////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////
	
	app.get('/api/user_exist/:user', function(req, res) {
		var username = req.params.user;
		var dbres = rcdb.user_exist(username, res);
	});
	
	app.get('/api/email_exist/:email', function(req, res) {
		var email = req.params.email;
		var dbres = rcdb.email_exist(email, res);
	});

	app.get('/api/create_account', function(req, res) {
		// TODO
	});
	
	app.get('/api/login', function(req, res) {
		// TODO
	});
	
	app.get('/api/logout', function(req, res) {
		// TODO
	});
	
	app.get('/api/change_password', function(req, res) {
		// TODO
	});
	
	app.get('/api/reset_password', function(req, res) {
		// TODO
	});
	
	app.get('/api/delete_account', function(req, res) {
		// TODO
	});
	
	app.get('/api/create_connection', function(req, res) {
		// TODO
	});
	
	app.get('/api/connecti_to', function(req, res) {
		// TODO
	});
	
	app.get('/api/close_connection', function(req, res) {
		// TODO
	});
	
	app.get('/api/send_command', function(req, res) {
		// TODO
	});
	
};
