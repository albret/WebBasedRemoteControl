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
   
    app.get('/displayLayout', async function(req, res) {
        var email = await rcdb.get_user_data(req,res);
        res.render('displayLayout', {email: email});
    });    

    app.get('/displayLayout/:layout_id', async function(req, res) {
        var layout_id = req.params.layout_id;
        var email = await rcdb.get_user_data(req, res);
        res.render('displayLayout', {email: email, layout_id: layout_id});
    });

    app.get('/home', async function(req, res) {
        var email = await rcdb.get_user_data(req, res);
        res.render('home', {email: email});
    });
 
    app.get('/profile', async function(req, res) {
        var email = await rcdb.get_user_data(req, res);
        res.render('profile', {email: email});
    });
    
    app.get('/resetPassword', async function(req, res) {
        var email = await rcdb.get_user_data(req, res);
        res.render('resetPassword', {email: email});
    });
    
    app.get('/deleteAccount', async function(req, res) {
        var email = await rcdb.get_user_data(req, res);
        res.render('deleteAccount', {email: email});
    });

    app.get('/createPage', async function(req,res) {
        var email = await rcdb.get_user_data(req, res);
        res.render('createPage', {email: email});
    });

    /////////////////////////////////////////////////////////////////////////////////////
    /////////////////////////////////////API Routes//////////////////////////////////////
    /////////////////////////////////////////////////////////////////////////////////////
    
    /////////////////////////////////User Account Routes/////////////////////////////////

    app.get('/api/user_exist/:user', function(req, res) {
        var username = req.params.user;
        return dbres = rcdb.user_exist(username, res);
    });
    
    app.get('/api/email_exist/:email', function(req, res) {
        var email = req.params.email;
        return dbres = rcdb.email_exist(email, res);
    });

    app.post('/api/create_account', async function(req, res) {
        var email = req.body.email;
        var user = req.body.username;
        var pass = req.body.password;
        await rcdb.create_account(user, email, pass, req, res);
        return rcdb.login(email, pass, false, req, res);
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
    
    app.post('/api/change_password', function(req, res) {
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
    
    app.post('/api/delete_account', function(req, res) {
        var username = req.body.username;
        var email = req.body.email;
        var password  = req.body.password;
        return rcdb.delete_account(username, email, password, req, res);
    });

    /////////////////////////////////Layout Editor routes////////////////////////////////

    //TODO /api/get_recent : get x most recent layouts

    app.get('/api/get_layout/:layout_id?', function(req, res) {
        console.log("getting!");
        var layout_id = req.params.layout_id;
        return rcdb.get_layout(layout_id, req, res);
    });
    
    app.post('/api/save_layout', function(req, res) {
        //console.log(req.body);
        var data = [];
        data[0] = req.body.elements;
        data[1] = req.body.types;
        data[2] = req.body.names;
        data[3] = req.body.elementCmds;
        data[4] = req.body.heights;
        data[5] = req.body.widths;
        data[6] = req.body.mtops;
        data[7] = req.body.mlefts;
        //console.log(data);
        var layout_data = JSON.stringify(data);
        //console.log(layout_data);
        var layout_id = req.body.layout_id;
        var name = req.body.name;
        var description = req.body.description;
        return rcdb.save_layout(layout_data, layout_id, name, description, req, res);
    });

    ///////////////////////////////////Community routes//////////////////////////////////
    app.post('/api/publish_layout', function(req, res) {
        var title = req.body.title;
        var layout_id = req.body.layout_id;
        var text = req.body.text;
        return rcdb.publish_layout(title, layout_id, text, req, res);
    });

    app.post('/api/unpublish_layout', function(req, res) {
        var layout_id = req.body.layout_id;
        return rcdb.unpublish_layout(layout_id, req, res);
    });

    app.post('/api/vote_post/', function(req, res) {
        var vote = req.body.vote;
        var layout_id = req.body.layout_id;
        return rcdb.vote_post(layout_id, vote, req, res); 
    });

    app.post('/api/claim_layout', function(req, res) {
        var layout_id = req.body.layout_id;
        return rcdb.save_layout(layout_id, req, res);
    });

    app.post('/api/post_comment', function(req, res) {
        var layout_id = req.body.layout_id;
        var text = req.body.text;
        return rcdb.post_comment(layout_id, text, req, res);
    });

    app.post('/api/vote_comment', function(req, res) {
        var comment_id = req.body.comment_id;
        var vote = req.body.vote;
        return rcdb.vote_comment(comment_id, vote, req, res);
    });

    ////////////////////////////////Desktop Client routes////////////////////////////////
    
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

    ///////////////////////////////////////Testing///////////////////////////////////////

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
