const mysql = require('mysql'),
      bcrypt = require('bcrypt'),
      options = require('./config'),
      cs355 = require('crypto');

exports.connect = function() {
    con = mysql.createPool({
        connectionLimit : 64,
        host            : options.conf.mysqlconfig.host,
        port            : 3306,
        user            : options.conf.mysqlconfig.user,
        password        : options.conf.mysqlconfig.password
    });
    con.query("use rcdb", function(err, result, fields) {
        if (err) {
            console.log("Cannot connect to mysql\n" + err);
        } else {
            console.log("Connected to mysql");
        }
    });
};

exports.disconnect = function() {
    console.log('Disconnect from mysql');
    con.end();
};

exports.user_exist = function(user, res) {
    con.query("SELECT username FROM users WHERE username = ?", [user], function (err, result, fields) {
        if (err)
            return send_error(err, 500, "Internal server error: mysql failed", res);
        res.send(result.length == 0 ? "no" : "yes");
    });
};

exports.email_exist = function(email, res) {
    con.query("SELECT email FROM users WHERE email = ?", [email], function (err, result, fields) {
        if (err)
            return send_error(err, 500, "internal server error: mysql failed", res);
        res.send(result.length == 0 ? "no" : "yes");
    });
};

exports.create_account = function(user, email, password, res) {
    bcrypt.hash(password, 10, function(err, hash) {
        if (err)
            return send_error(err, 500, "Internal server error: bcrypt failed");
        con.query("INSERT INTO users (username, email, hash) values (?, ?, ?)", [user, email, hash],
            function (err, result, fields) {
                if (err) {
                    return send_error(err, 500, err.sqlMessage, res);
                } else {
                    return res.send("success");
                }
            });
    });
};

exports.login = function(email, password, keep, aes) {
    var hashed = bcrypt.hash(password, 10, function(err, hash) {
        if (err)
            return send_error(err, 500, "Internal server error: bcrypt failed");
        con.query("SELECT * FROM users WHERE password = ? AND email = ?", [hashed, email],
            function(err, result, fields) {
                if (err)
                    return send_error(err, 500, "Unable to login", res);
                var end = new Date(Date.now() + (keep ? 2628000000 : 86400000));
                var endTime = end.getTime();
                var token = lockit(email + endTime);
                con.query("INSERT INTO sessions (email, token, expire) values (?, ?, ?)", [email, token, endTime],
                    function (err, result, fields) {
                        if (err)
                            return send_error(err, 500, "Internal server error: try again");
                        res.cookie('auth', token, 
                            {httpOnly: true, secure: true, signed: true, expires: end});
                        res.send("success");
                });
        });
    });
};

exports.check_login = function(req, res) {
    var encrypted = req.signedCookies.auth;
    if (!encrypted || encrypted.length < 64)
        return res.status(200).send('you are not logged in');
    var decrypted = unlockit(encrypted);
    var email = decrypted.slice(0, decrypted.length - 13);
    var expire = decrypted.slice(decrypted.length - 13, decrypted.length);
    console.log(encrypted);
    console.log(email);
    console.log(expire);
    con.query("SELECT * FROM sessions WHERE email = ? AND token = ? AND expire = ?", [email, encrypted, expire],
        function (err, result, fields) {
            if (err)
                return send_error(err, 500, "Internal server error: mysql failed", res);
            res.send(result.length == 0 ? "you are not logged in" : "you are logged in");
    });
}

//TODO check if i needd to take care of errors coming out of cipher
function lockit(str) {
    var cipher = cs355.createCipher('ae192', options.conf.cookieconfig.encryptkey);
    var encrypted = cipher.update(str, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function unlockit(str) {
    var decipher = cs355.createDecipher('aes192', options.conf.cookieconfig.encryptkey);
    var decrypted = decipher.update(str, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

function send_error(err, code, str, res) {
    console.log("\n\n\n>>>>>>>>>>>>>>>>>>>>>ERROR LOGS<<<<<<<<<<<<<<<<<<<<<<<<<");
    console.log(err);
    console.log(">>>>>>>>>>>>>>>>>>>>>END ERROR LOGS<<<<<<<<<<<<<<<<<<<<<\n\n\n");
    return res.status(code).send({error: str});
}


