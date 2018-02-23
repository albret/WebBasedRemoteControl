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
    
    app.get('/deleteAccout', function(req, res) {
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
        console.log("Made it!");
        var email = req.body.email;
        var user = req.body.username;
        var pass = req.body.password;
        return rcdb.create_account(user, email, pass, req, res);
    });
    
    app.post('/api/login', function(req, res) {
        var email = req.body.email;
        var pass = req.body.pass;
        var keep_session = req.body.remember;
        console.log("remember: "+keep_session);
        return rcdb.login(email, pass, keep_session, req, res);
    });
    
    app.get('/api/logout', function(req, res) {
        return rcdb.logout(req, res);
    });
    
    app.get('/api/change_password', function(req, res) {//TODO need testing
        var oldpass = req.body.oldPassword;
        var newpass = req.body.newPassword;
        return rcdb.change_password(oldpass, newpass, req, res);
    });
    
    app.get('/api/forget_password', function(req, res) {
        // TODO
    });
    
    app.get('/api/delete_account', function(req, res) {//TODO need testing
        var user = req.body.username;
        var email = req.body.email;
        var pass = req.body.password;
        return rcdb.delete_account(username, email, password, req, res);
    });
    
    app.get('/api/wss_connect', function(req, res) {
        var key = req.body.connectionKey;
        return rcdb.wss_connect(key, req, res);
    });
    
    app.get('/api/close_connection', function(req, res) {
        // TODO
    });
    
    app.get('/api/send_command', function(req, res) {
        // TODO
    });

    app.get('/amiloggedin', function(req, res) {
        rcdb.check_login(req, res);
    });

    app.get('/test1', function(req, res) {
        var cs355 = require('crypto');
        var cipher = cs355.createCipher('aes192', 'a password');
        
        var end = new Date(Date.now() + 2628000000);
        var email = 'kzhang';
        var encrypted = cipher.update(email+end.getTime(), 'utf8', 'hex');
        encrypted += cipher.final('hex');
        console.log(email);
        console.log(encrypted);
        console.log(end.getTime());
        res.cookie('cookie_name_135', encrypted,
            {httpOnly: true, secure: true, signed: true, expires: end});
        res.status(200).send('ok cookie');
    });

    app.get('/test2', function(req, res) {
        var cs355 = require('crypto');
        var decipher = cs355.createDecipher('aes192', 'a password');
        console.time('decrypt');
        var decrypted = decipher.update(req.signedCookies.cookie_name_135, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        console.timeEnd('decrypt');
        console.log(req.signedCookies);
        console.log(decrypted);
        res.end();
    });
    
    app.get('/test3/:key', function(req, res) {
        var key = req.params.key;
        return rcdb.wss_connect(key, req, res);
    });    
};
