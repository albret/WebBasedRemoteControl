const mysql = require('mysql'),
      bcrypt = require('bcrypt'),
      options = require('./config'),
      cs355 = require('crypto');

exports.connect = async function connect() {
    con = mysql.createPool({
        connectionLimit : 64,
        host            : options.conf.mysqlconfig.host,
        port            : 3306,
        user            : options.conf.mysqlconfig.user,
        password        : options.conf.mysqlconfig.password,
        database        : options.conf.mysqlconfig.database
    });
    try {
        await rcdb_query('use rcdb', []);
        console.log("Connected to mysql");
    } catch (err) {
        console.log(err);
        console.log("Cannot connect to mysql");
    }
}

exports.disconnect = function() {
    console.log('Disconnect from mysql');
    con.end();
};

exports.user_exist = async function(user, res) {
    try {
        var result = await rcdb_query("SELECT username FROM users WHERE username = ?", [user]);
        return res.send(result.length == 0 ? 'no' : 'yes');
    } catch (err) {
        return send_error(err, 500, "Internal server error", res);
    }
};

exports.email_exist = async function(email, res) {
    try {
        var result = await rcdb_query("SELECT email FROM users WHERE email = ?", [email]);
        return res.send(result.length == 0 ? 'no' : 'yes');
    } catch (err) {
        return send_error(err, 500, "Internal server error", res);
    }
};

exports.create_account = async function(user, email, password, req, res) {
    try {
        var checkCookiePromise = is_logged_in(req, res);
        var userTakenPromise = rcdb_query("SELECT username FROM users WHERE username = ?", [user]);
        var emailTakenPromise = rcdb_query("SELECT email FROM users WHERE email = ?", [email]);
        var hashPromise = bcrypt_hash(password);

        var checkCookie = await checkCookiePromise;
        if (checkCookie.auth)
            return res.status(500).send('already logged in');

        var userTaken = await userTakenPromise;
        var emailTaken = await emailTakenPromise;
        if (userTaken.length != 0)
            return res.status(500).send('username taken');
        if (emailTaken.length != 0)
            return res.status(500).send('email in use');

        var hash = await hashPromise;
        var result = await rcdb_query("INSERT INTO users (username, email, hash) values (?, ?, ?)", 
            [user, email, hash]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
};

exports.login = async function(email, password, keep, req, res) {
    try {
        var getHashPromise = rcdb_query("SELECT hash FROM users WHERE email = ? AND active = 1", [email]);
        var checkCookie = await is_logged_in(req, res);
        if (checkCookie.auth)
            return res.send("already logged in");

        var hash = await getHashPromise;
        if (hash.length == 0)
            return res.status(500).send("unable to login");

        var checkHash = await bcrypt_comp(password, hash[0].hash);
        if (!checkHash)
            return res.status(500).send("unable to login");

        var end = new Date(Date.now() + (keep ? 2628000000 : 86400000));
        var endTime = end.getTime();
        var randomStr = cs355.randomBytes(25).toString('hex');
        var token = lockit(email + randomStr);
        var add_session = await rcdb_query("INSERT INTO sessions (email, token, expire) values (?, ?, ?)", 
            [email, randomStr, endTime]);
        res.cookie('auth', token, 
            {httpOnly: true, secure: true, signed: true, expires: end});
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
};

exports.check_login = async function(req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (check.auth)
            return res.send("you are logged in");
        else
            return res.send("you are not logged in");
    } catch(err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.logout = async function(req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.send("not logged in anyways");
        var dbcheck = await rcdb_query("SELECT * FROM sessions WHERE email = ? AND token = ?",
            [check.email, check.token]);
        if (dbcheck.length != 0)
            await rcdb_query("DELETE FROM sessions WHERE email = ? AND token = ?",
                [email, randomStr]);
        return res.send("logged out");
    } catch(err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.change_password = async function(oldPass, newPass, req, res) {
    try {
        var checkCookiePromise = is_logged_in(req, res);
        var newHashPromise = bcrypt_hash(newPass);

        var checkCookie = await checkCookiePromise;
        if (!checkCookie.auth)
            return res.status(500).send('not logged in');

        var email = checkCookie.email;
        var oldHash = await rcdb_query("SELECT hash FROM users WHERE email = ? AND active = 1", [email]);
        if (oldHash.length == 0)
            return res.status(500).send('can\'t find user from email');

        var oldPassCheck = await bcrypt_comp(oldPass, oldHash[0].hash);
        if (!oldPassCheck)
            return res.status(500).send('incorrect password');
        
        var newHash = await newHashPromise;
        var updateHash = rcdb_query('UPDATE users SET hash = ? WHERE email = ?', [newHash, email]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.delete_account = async function(username, email, password, req, res) {
    try {
        var getHashPromise = rcdb_query("SELECT hash FROM users WHERE email = ? AND username = ?", 
            [email, username]);
        var checkCookie = await is_logged_in(req, res);
        if (!checkCookie.auth)
            return res.status(500).send("not logged in");

        var hash = await getHashPromise;
        if (hash.length == 0)
            return res.status(500).send("Wrong username or email");

        var checkHash = await bcrypt_comp(password, hash[0].hash);
        if (!checkHash)
            return res.status(500).send("Wrong password");

        var setInactive = await rcdb_query("UPDATE users SET active = 0 WHERE username = ?", [username]);
        var removeAllSessions = await rcdb_query("DELETE FROM sessions WHERE email = ?", [email]);
        return res.send("success");
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.get_user_data = async function(req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send("not logged in");
        return check.email;
    } catch(err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.wss_connect = async function(key, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send("not logged in");

        var checkKey = await rcdb_query('SELECT * FROM wsSessions WHERE connection_key = ?', [key]);
        if (checkKey.length == 0)
            return res.status(500).send("Internal server error: connection key not found");

        var currTime = (new Date((Date.now()))).getTime();
        if (checkKey[0].email != 'unused' && currTime < checkKey[0].expire_time)
            return res.status(500).send("Internal server error: bad connection key");

        var expTime = (new Date((Date.now() + 43200000))).getTime();
        var addConnectionKey = await rcdb_query(
            'UPDATE wsSessions SET email = ?, expire = ? WHERE connection_key = ?', 
            [check.email, currTime, key]);
        return res.send("success");
    } catch(err) {
        return send_error(err, 500, "Internal server error");
    }
}

async function is_logged_in(req, res) {
    return new Promise(async function(resolve, reject) {
        if (typeof req.signedCookies == 'undefined')
            return resolve({auth: false, email: null});
        var encrypted = req.signedCookies.auth;
        if (!encrypted || encrypted.length < 64)
            return resolve({auth: false, email: null});
        var decrypted = unlockit(encrypted);
        var email = decrypted.slice(0, decrypted.length - 50);
        var randomStr = decrypted.slice(decrypted.length - 50, decrypted.length);
        try {
            var check = await rcdb_query("SELECT sessions.expire FROM sessions INNER JOIN users WHERE sessions.email = ? AND sessions.token = ? AND sessions.email = users.email AND users.active = 1", 
                [email, randomStr]);
            var curtime = (new Date(Date.now())).getTime();
            return resolve({auth: (check.length != 0 && check[0].expire > curtime), email: email});
        } catch(err) {
            return reject(err);
        }
    });
}

function rcdb_query(qstr, qarg) {
    return new Promise(function(resolve, reject) {
        con.query(qstr, qarg, function (err, result, fields) {
            if (err)
                return reject(err);
            else
                return resolve(result);
        });
    });
}
exports.db_query = async function(qstr, qarg) {
    return rcdb_query(qstr, qarg);
}

function bcrypt_hash(str) {
    return new Promise(function(resolve, reject) {
        bcrypt.hash(str, 10, function(err, hash) {
            if (err)
                return reject(err);
            else
                return resolve(hash);
        });
    });
}

function bcrypt_comp(str, hash) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(str, hash, function(err, res) {
            if (err)
                return reject(err);
            return resolve(res == true);
        });
    });
}

function lockit(str) {
    var cipher = cs355.createCipher('aes192', options.conf.cookieconfig.encryptkey);
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

