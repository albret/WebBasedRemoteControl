var mysql = require('mysql');
bcrypt = require('bcrypt');

exports.connect = function() {
    con = mysql.createConnection({
        host: 'rcdb.cmyiasvjovvb.us-east-2.rds.amazonaws.com',
        port: 3306,
        user: 'ScrumMasterEddie',
        password: 'Sofajokeshyfate&'
    });

    con.connect(function(err) {
        if (err) {
            console.log(err);
        } else {
            con.query("use rcdb");
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
        if (err) { 
            console.log(err);
        } else {
            res.send(result.length == 0 ? "no" : "yes");
            res.end();
        }
    });
};

exports.email_exist = function(email, res) {
    con.query("SELECT email FROM users WHERE email = ?", [email], function (err, result, fields) {
        if (err) { 
            console.log(err);
        } else {
            res.send(result.length == 0 ? "no" : "yes");
            res.end();
        }
    });
};

//Testing bcrypt hash
exports.temp = function() {
    console.time('hash');
    bcrypt.hash('fuckalbert', 10, function(err, hash) {
        console.timeEnd('hash');
        console.log('error:' + err + '\nhash:' + hash);
        console.time('hash comp');
        bcrypt.compare('fuckalbert', hash, function(err, res) {
            console.timeEnd('hash comp');
            if (res) {
                console.log('correct match');
            } else {
                console.log('incorrect not match');
            }
        });
    });
};
