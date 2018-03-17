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
   
    app.get('/home', async function(req, res) {
        var email = await rcdb.get_user_data(req, res);
        console.log(email);
        res.render('home', {email: email});//TODO put variables in home.ejs to receive data
    });
 
    app.get('/profile', function(req, res) {
        res.render('profile');
    });
    
    app.get('/resetPassword', function(req, res) {
        console.log("Hey, u're in route.js /resetPassword res.render()");
        res.render('resetPassword');
    });
    
    app.get('/deleteAccount', function(req, res) {
      res.render('deleteAccount');
    });

    /////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////API Routes//////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////
    
    app.get('/api/user_exist/:user', function(req, res) {
        var username = req.params.user;
        return dbres = rcdb.user_exist(username, res);
    });
    
    app.get('/api/email_exist/:email', function(req, res) {
        var email = req.params.email;
        return dbres = rcdb.email_exist(email, res);
    });

    app.post('/api/create_account', function(req, res) {
        var email = req.body.email;
        var user = req.body.username;
        var pass = req.body.password;
        return rcdb.create_account(user, email, pass, req, res);
    });
    
    app.post('/api/login', function(req, res) {
        var email = req.body.email;
        var pass = req.body.pass;
        var keep_session = req.body.remember;
        return rcdb.login(email, pass, keep_session, req, res);
    });
    
    app.get('/api/logout', function(req, res) {
        return rcdb.logout(req, res);
    });
    
    app.post('/api/change_password', function(req, res) {//TODO need testing
        var oldpass = req.body.oldPassword;
        var newpass = req.body.newPassword;
        return rcdb.change_password(oldpass, newpass, req, res);
    });
    
    app.post('/api/forgot_password', function(req, res) {
        var email = req.body.email;
        return rcdb.forgot_password(email, req, res);
    });

    app.post('/api/reset_password', function(req, res) {
        var token = req.body.token;
        var password = req.body.password;
        return rcdb.reset_password(token, password, req, res); 
    });
    
    app.post('/api/delete_account', function(req, res) {//TODO need testing
        var user = req.body.username;
        var email = req.body.email;
        var pass = req.body.password;
        return rcdb.delete_account(username, email, password, req, res);
    });
    
    app.post('/api/wss_connect', function(req, res) {
        var key = req.body.connectionKey;
        return rcdb.wss_connect(key, req, res);
    });
    
    app.get('/api/close_connection', function(req, res) {
        var email = req.body.email;
        return rcdb.close_connection(req, res);
    });
    
    app.post('/api/send_command', function(req, res) {
        var command = req.body.command;
        return rcdb.send_command(command, req, res);
    });

    app.get('/amiloggedin', function(req, res) {
        rcdb.check_login(req, res);
    });

    app.get('/test3/:key', function(req, res) {
        var key = req.params.key;
        return rcdb.wss_connect(key, req, res);
    });
    
    app.get('/test4/:command', function(req, res) {
        var command = req.params.command;
        return rcdb.send_command(command, req, res); 
    });   
};
