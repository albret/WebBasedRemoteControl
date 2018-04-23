const mysql = require('mysql'),
      bcrypt = require('bcrypt'),
      conf = require('./config'),
      nodemailer = require('nodemailer'),
      cs355 = require('crypto');

exports.connect = async function connect() {
    con = mysql.createPool({
        connectionLimit : 32,
        host            : conf.mysql.host,
        port            : conf.mysql.port,
        user            : conf.mysql.user,
        password        : conf.mysql.password,
        database        : conf.mysql.database
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
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
};

exports.login = async function(email, password, keep, req, res) {
    try {
        var getUserPromise = rcdb_query("SELECT hash, id FROM users WHERE email = ? AND active = 1", [email]);
        var checkCookie = await is_logged_in(req, res);
        if (checkCookie.auth)
            return res.send("already logged in");

        var user = await getUserPromise;
        if (user.length == 0)
            return res.status(500).send("unable to login");

        var checkHash = await bcrypt_comp(password, user[0].hash);
        if (!checkHash)
            return res.status(500).send("unable to login");

        var end = new Date(Date.now() + (keep ? 2628000000 : 86400000));
        var endTime = end.getTime();
        var randomStr = cs355.randomBytes(25).toString('hex');
        var token = lockit(email + randomStr);
        var add_session = await rcdb_query("INSERT INTO sessions (user_id, token, expire) values (?, ?, ?)", 
            [user[0].id, randomStr, endTime]);
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
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.logout = async function(req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.send("not logged in anyways");
        var dbcheck = await rcdb_query("SELECT * FROM sessions WHERE user_id = ? AND token = ?",
            [check.user_id, check.token]);
        if (dbcheck.length != 0)
            await rcdb_query("DELETE FROM sessions WHERE user_id = ? AND token = ?",
                [check.user_id, check.token]);
        return res.send("logged out");
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.change_password = async function(oldPass, newPass, req, res) {
    try {
        var checkPromise = is_logged_in(req, res);
        var newHashPromise = bcrypt_hash(newPass);

        var check = await checkPromise;
        if (!check.auth)
            return res.status(500).send('not logged in');

        var oldHash = await rcdb_query("SELECT hash FROM users WHERE email = ? AND active = 1", [check.email]);
        if (oldHash.length == 0)
            return res.status(500).send('can\'t find user from email');

        var oldPassCheck = await bcrypt_comp(oldPass, oldHash[0].hash);
        if (!oldPassCheck)
            return res.status(500).send('incorrect password');
        
        var newHash = await newHashPromise;
        var updateHash = rcdb_query('UPDATE users SET hash = ? WHERE email = ?', [newHash, check.email]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.delete_account = async function(username, email, password, req, res) {
    try {
        var getHashPromise = rcdb_query("SELECT hash FROM users WHERE email = ? AND username = ?", 
            [email, username]);
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send("not logged in");
        if (check.email != email)
            return res.status(500).send("Wrong username or email");

        var hash = await getHashPromise;
        if (hash.length == 0)
            return res.status(500).send("Wrong username or email");

        var checkHash = await bcrypt_comp(password, hash[0].hash);
        if (!checkHash)
            return res.status(500).send("Wrong password");
        
        var setInactive = await rcdb_query("UPDATE users SET active = 0 WHERE username = ?", [username]);
        var removeAllSessions = await rcdb_query("DELETE FROM sessions WHERE user_id = ?", [check.user_id]);
        return res.send("success");
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.forgot_password = async function(email, req, res) {
    try {
        var result = await rcdb_query("SELECT email FROM users WHERE email = ?", [email]);
        if (result.length == 0)
            return res.status(500).send("Email not associated with an account");

        var randomStr = cs355.randomBytes(32).toString('hex');
        var endTime = Date.now() + 900000;
        var result = await rcdb_query("INSERT INTO resetPassword (email, token, expire) values (?, ?, ?)",
            [email, randomStr, endTime]);

        var link = 'http://' + req.hostname + '/resetPassword';
        var subject = 'RCWeb - Reset your password';
        var content = `<p>To reset your password, use the following code in the reset password page.</p>
                       <p>${randomStr}</p>
                       <a href=\"${link}\">${link}</a>
                       <p>If you did not request to reset your password you can safely ignore this message</p>
                       <p>This code will expire after 15 minutes</p>`;
        await send_mail(email, subject, content);
        return res.send('done');
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.reset_password = async function(token, password, req, res) {
    try {
        var tokenValid = await rcdb_query('SELECT user_id, expire FROM resetPassword WHERE token = ?', [token]);
        if (tokenValid.length == 0)
            return res.status(500).send("Invalid token");

        var newHash = await bcrypt_hash(password);
        await rcdb_query('UPDATE users SET hash = ? WHERE email = ?', [newHash, tokenValid[0].email]);
        await rcdb_query('DELETE FROM resetPassword WHERE token = ?', [token]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, "Internal server error", res);
    }
}

exports.get_user_data = async function(req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send("not logged in");
        return check.email;
    } catch (err) {
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

        var currTime = Date.now();
        console.log(currTime + "|" + checkKey[0].expire);
        if (checkKey[0].user_id != -1 && currTime < checkKey[0].expire)
            return res.status(500).send("Internal server error: bad connection key");
        var removeConnectionKey = await rcdb_query(
            'UPDATE wsSessions SET user_id = ? WHERE user_id = ?',
            [-1, check.user_id]);
        var expTime = Date.now() + 43200000;
        var addConnectionKey = await rcdb_query(
            'UPDATE wsSessions SET user_id = ?, expire = ? WHERE connection_key = ?', 
            [check.user_id, expTime, key]);
        var response = await require('./wshandler.js').send_command(key, check.username);
        if (response) return res.send("success");
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.send_command = async function(command, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send("not logged in");
        var getKey = await rcdb_query('SELECT * FROM wsSessions WHERE user_id = ?', [check.user_id]);
        if (getKey.length == 0) 
            return res.status(500).send("Internal server error: connection key not found");
        console.log(command);
        var response = await require('./wshandler.js').send_command(getKey[0].connection_key, command);
        if (response)
            return res.send("success");
        return res.status(500).send("Connection has already been closed");
    } catch (err) {
        return send_error(err, 500, "Internal server error");
    }
}

exports.close_connection = async function(req, res) {
    try {    
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send("not logged in");
        var getKey = await rcdb_query('SELECT * FROM wsSessions WHERE user_id = ?', [check.user_id]);
        if (getKey.length == 0)
            return res.status(500).send("Internal server error: connection key not found");
        var removeConnectionKey = await rcdb_query(
            'UPDATE wsSessions SET user_id = ? WHERE connection_key = ?',
            [-1, getKey[0].connection_key]);
        var response = await require('./wshandler.js').close_connection(getKey[0].connection_key);
        return res.send("success");
      } catch (err) {
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
            var check = await rcdb_query('SELECT users.id, users.username, sessions.expire FROM sessions INNER JOIN users ON sessions.user_id = users.id WHERE users.email = ? AND sessions.token = ? AND users.active = 1', 
                [email, randomStr]);
            var curtime = Date.now();
            var auth_check = (check.length != 0 && check[0].expire > curtime);
            return resolve({auth: auth_check, 
                            email: email, 
                            token: randomStr,
                            username: auth_check ? check[0].username : '',
                            user_id: auth_check ? check[0].id : -1});
        } catch (err) {
            return reject(err);
        }
    });
}

exports.get_layout = async function(id, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        if (typeof id == 'undefined') {
            var data = await rcdb_query('SELECT id, data, layout_name, layout_description FROM layouts WHERE user_id = ? AND l_active = 1', [check.user_id]);
            if (data.length == 0)
                return res.send('no layouts associated with your username');
            var resp_data = [];
            for (var x = 0; x < data.length; x++) {
                var cleanstr = data[x].data.slice(1, -1).replace(/\\/g, '');
                var jdata = JSON.parse(cleanstr);
                var layout = {};
                layout['elements'] = jdata[0];
                layout['types'] = jdata[1];
                layout['names'] = jdata[2];
                layout['elementCmds'] = jdata[3];
                layout['heights'] = jdata[4];
                layout['widths'] = jdata[5];
                layout['mtops'] = jdata[6];
                layout['mlefts'] = jdata[7];
                layout['name'] = data[x].layout_name;
                layout['description'] = data[x].layout_description;
                layout['id'] = data[x].id;
                resp_data.push(layout);
            }
            return res.json(resp_data);
        } else {
            var data = await rcdb_query('SELECT data, layout_name, layout_description FROM layouts WHERE (user_id = ? AND id = ?) OR p_active = 1',
                [check.user_id, id]);
            if (data.length == 0)
                return res.send('layout not found from your library');
            var cleanstr = data[0].data.slice(1, -1).replace(/\\/g, '');
            var jdata = JSON.parse(cleanstr);
            var layout = {};
            layout['elements'] = jdata[0];
            layout['types'] = jdata[1];
            layout['names'] = jdata[2];
            layout['elementCmds'] = jdata[3];
            layout['heights'] = jdata[4];
            layout['widths'] = jdata[5];
            layout['mtops'] = jdata[6];
            layout['mlefts'] = jdata[7];
            layout['name'] = data[0].layout_name;
            layout['description'] = data[0].layout_description;
            return res.json(layout);
        }
    } catch (err) {
        return send_error(err, 500, 'Internal server error');
    }
}

exports.save_layout = async function(data, layout_id, name, description, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        if (layout_id == -1) {
            var result = await rcdb_query('INSERT INTO layouts (user_id, data, layout_name, layout_description) values (?, ?, ?, ?)',
                [check.user_id, JSON.stringify(data), name, description]);
            return res.send('success id=' + result.insertId);
        } else {
            var owned = await rcdb_query('SELECT * FROM layouts WHERE user_id = ? AND id = ?',
                [check.id, layout.id]);
            if (owned.length == 0)
                return res.status(500).send('cannot find layout from your library');
            await rcdb_query('UPDATE layouts SET data = ?, name = ?, description = ? WHERE user_id = ? AND id = ?',
                [JSON.stringify(data), name, description, check.id, layout_id]);
            return res.send('success');
        }
    } catch (err) {
        return send_error(err, 500, 'Internal server error');
    }
}

exports.publish_layout = async function(layout_id, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        var post = await rcdb_query('SELECT * FROM layouts WHERE user_id = ? AND id = ? AND l_active = 1',
            [check.user_id, layout_id]);
        if (post.length == 0)
            return res.status(500).send('cannot find layout from your library');
        if (!post[0].p_active) {
            var curtime = Date.now();
            await rcdb_query('UPDATE layouts SET p_active = 1, age = ? WHERE user_id = ? AND id = ?',
                [curtime, check.user_id, layout_id]);
            await rcdb_query('INSERT INTO post_votes (user_id, layout_id, vote) values (?, ?, 1)', 
                [check.user_id, layout_id]);
            return res.send('success'); 
        } else {
            return res.status(500).send('active post exists');
        }
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, 'Internal server error');
    }
}

exports.unpublish_layout = async function(layout_id, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        var db_check = await rcdb_query('SELECT * FROM layouts WHERE user_id = ? AND id = ? AND p_active = 1',
            [check.user_id, layout_id]);
        if (db_check.length == 0)
            return res.status(500).send('post not found');
        await rcdb_query('UPDATE layouts SET p_active = 0 WHERE user_id = ? AND id = ?',
            [check.user_id, layout_id]);
        await rcdb_query('DELETE FROM post_votes WHERE user_id = ? AND layout_id = ?',
            [check.user_id, layout_id]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, 'Internal server error');
    }
}

exports.delete_layout = async function(layout_id, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        var db_check = await rcdb_query('SELECT * FROM layouts WHERE user_id = ? AND id = ? AND l_active = 1',
            [check.user_id, layout_id]);
        if (db_check.length == 0)
            return res.status(500).send('post not found');
        await rcdb_query('UPDATE layouts SET l_active = 0, p_active = 0 WHERE user_id = ? AND id = ?',
            [check.user_id, layout_id]);
        await rcdb_query('DELETE FROM post_votes WHERE user_id = ? AND layout_id = ?',
            [check.user_id, layout_id]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, 'Internal server error');
    }
}

exports.claim_layout = async function(layout_id, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        var layout = await rcdb_query('SELECT * FROM layouts WHERE id = ? AND p_active = 1',
            [check.user_id]);
        if (layout.length == 0)
            return res.status(500).send('post not found');
        await rcdb_query('INSERT INTO layouts (user_id, data) values (?, ?)',
            [check.user_id, layout.data]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, 'Internal server error');
    }
}

exports.post_comment = async function(layout_id, text, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        var layout = await rcdb_query('SELECT * FROM layouts WHERE id = ? AND p_active = 1',
            [layout_id]);
        if (layout.length == 0)
            return res.status(500).send('post not found');
        var curtime = Date.now();
        await rcdb_query('INSERT INTO comments (user_id, text, age, layout_id) values (?, ?, ?, ?)',
            [check.user_id, text, curtime, layout_id]);
        await rcdb_query('INSERT INTO comment_votes (user_id, comment_id, vote) SELECT ?, id, 1 FROM comments WHERE user_id = ? AND curtime = ?',
            [check.user_id, check.user_id, curtime]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, 'Internal server error');
    }
}

exports.vote_post = async function(layout_id, vote, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        var layout = await rcdb_query('SELECT * FROM layouts WHERE id = ? AND p_active = 1',
            [layout_id]);
        if (layout.length == 0)
            return res.status(500).send('post not found');
        var original_vote = await rcdb_query('SELECT vote, count(vote) AS cnt FROM post_votes WHERE user_id = ? AND layout_id = ?', [check.user_id, layout_id]);
        var diff = vote - (original_vote[0].cnt == 0 ? 0 : vote);
        await rcdb_query('INSERT INTO post_votes (user_id, layout_id, vote) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE vote = ?', [check.user_id, layout_id, vote, vote]);
        await rcdb_query('UPDATE layouts SET score = score + ? WHERE layout_id = ?', [diff, layout_id]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, 'Internal server error');
    }
}

exports.vote_comment = async function(comment_id, vote, req, res) {
    try {
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        var post_check = await rcdb_query('SELECT * FROM layouts INNER JOIN comments ON layouts.id = comments.layout_id WHERE comments.id = ? AND layouts.p_active = 1', [comment_id]);
        var comment = await rcdb_query('SELECT * FROM comments WHERE id = ?', [comment_id]);
        if (comment.length == 0)
            return res.status(500).send('comment not found');
        var original_vote = await rcdb_query('SELECT vote, count(vote) AS cnt FROM comment_votes WHERE user_id = ? AND comment_id = ?', [check.user_id, comment_id]);
        var diff = vote - (original_vote[0].cnt == 0 ? 0 : vote);
        await rcdb_query('INSERT INTO comment_votes (user_id, comment_id, vote) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE vote = ?', [check.user_id, comment_id, vote, vote]);
        await rcdb_query('UPDATE comments SET score = score + ? WHERE comment_id = ?', [diff, comment_id]);
        return res.send('success');
    } catch (err) {
        return send_error(err, 500, 'Internal server error');
    }
}

exports.get_posts = async function(sort, last_id, req, res) {
    try {//sort: 0 = vote, 1 = date
        var check = await is_logged_in(req, res);
        if (!check.auth)
            return res.status(500).send('not logged in');
        if (sort == 0) {//by vote
            if (typeof last_id == 'undefined') {
                var results = await rcdb_query(
                    `SELECT U.username, L.layout_name, L.layout_description, L.age, L.score, L.id
                    FROM layouts AS L INNER JOIN users AS U ON L.user_id = U.id
                    WHERE L.p_active = 1
                    ORDER BY L.score DESC, L.age DESC
                    LIMIT 10`, []);
                return res.json(results);
            } else {
                var results = await rcdb_query(
                    `SELECT U.username, L.layout_name, L.layout_description, L.age, L.score, L.id
                    FROM layouts AS L INNER JOIN users AS U ON L.user_id = U.id
                    WHERE L.score <= (SELECT score FROM layouts WHERE id = ? limit 1)
                        AND L.age <= (SELECT age FROM layouts WHERE id = ? limit 1)
                        AND L.p_active = 1
                    ORDER BY L.score DESC, L.age DESC
                    LIMIT 10`, [last_id, last_id]);
                return res.json(results);
            }
        } else if (sort == 1) {//by date
            if (typeof last_id == 'undefined') {
                var results = await rcdb_query(
                    `SELECT U.username, L.layout_name, L.layout_description, L.age, L.score, L.id
                    FROM layouts AS L INNER JOIN users AS U ON L.user_id = U.id
                    WHERE L.p_active = 1
                    ORDER BY L.age DESC
                    LIMIT 10`, []);
                return res.json(results);
            } else {
                var results = await rcdb_query(
                    `SELECT U.username, L.layout_name, L.layout_description, L.age, L.score, L.id
                    FROM layouts AS L INNER JOIN users AS U ON L.user_id = U.id
                    WHERE L.age <= (SELECT age FROM layouts WHERE id = ? limit 1) AND L.p_active = 1
                    ORDER BY L.age DESC
                    LIMIT 10`, [last_id]);
                return res.json(results);
            }
        }
        return res.status(500).send('unknown error'); 
    } catch (err) {
        return send_err(err, 500, 'Internal server error');
    }
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

function send_mail(recipient, subject, body) {
    return new Promise(function(resolve, reject) {
        var transporter = nodemailer.createTransport({
            host: 'smtp.zoho.com',
            port: 465,
            secure: true,
            auth: {
                user: conf.email.user,
                pass: conf.email.pass
            }
        });
        var mailOptions = {
            from: 'admin <admin@rcweb.xyz>',
            to: recipient,
            subject: subject,
            html: body
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                return reject(error);
            } else {
                return resolve();
            }
        });
    });
}

function lockit(str) {
    var cipher = cs355.createCipher('aes192', conf.cookie.encryptkey);
    var encrypted = cipher.update(str, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

function unlockit(str) {
    var decipher = cs355.createDecipher('aes192', conf.cookie.encryptkey);
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

