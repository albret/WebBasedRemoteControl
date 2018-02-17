var mysql = require('mysql'),
    bcrypt = require('bcrypt'),
    options = require('./config');

exports.connect = function() {
    con = mysql.createPool({
        connectionLimit : 64,
        host            : options.mysqlconfig.host,
        port            : 3306,
        user            : options.mysqlconfig.user,
        password        : options.mysqlconfig.password
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

function send_error(err, err_code, err_str, res) {
    console.log("\n\n\n>>>>>>>>>>>>>>>>>>>>>ERROR LOGS<<<<<<<<<<<<<<<<<<<<<<<<<");
    console.log(err);
    console.log(">>>>>>>>>>>>>>>>>>>>>END ERROR LOGS<<<<<<<<<<<<<<<<<<<<<\n\n\n");
    return res.status(err_code).send({error: err_str});
}

//Testing bcrypt hash
exports.temp = function() {
    bcrypt.hash('fuckalbert', 10, function(err, hash) {
        bcrypt.compare('fuckalbert', hash, function(err, res) {
            if (res) {
//                console.log('correct match');
            } else {
//                console.log('incorrect not match');
            }
        });
    });
};

