var should = require('chai').should(),
    expect = require('chai').expect,
    supertest = require('supertest'),
    mysql = require('mysql'),
    conf = require('../server/config');

var server_http = supertest.agent('http://localhost:' + conf.server.http);
var server = supertest.agent('https://localhost:' + conf.server.https);
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


before(function(done) {
    myapp = require('../server/app');
    app = myapp.server;
    setTimeout(async function() {
        try {
            await db_setup();
            done();
        } catch (err) {
            console.log(err);
            console.log("Cannot connect to mysql for testing\n");
        }
    }, 1000);
});

after(function(done) {
    setTimeout(async function() {
        try {
            await db_disconnect();
            myapp.shutdown();
            done();
        } catch (err) {
            console.log(err);
        }
    }, 1000);
});

describe('Server up', function() {
    it('should redirect http to https', function(done) {
        server_http.get('/')
            .expect(302)
            .end(done);
    });
    it('home page', function(done) {
        server.get('/')
            .expect(200)
            .end(done);
    });
});

describe('API without auth', function() {
    describe('User exist', function() {
        it('true', function(done) {
            server.get('/api/user_exist/asd001')
                .expect(200)
                .expect('yes')
                .end(done);
        });
        it('false', function(done) {
            server.get('/api/user_exist/zzzzzz')
                .expect(200)
                .expect('no')
                .end(done);
        });
    });
    describe('Email exist', function() {
        it('true', function(done) {
            server.get('/api/email_exist/asd001@example.com')
                .expect(200)
                .expect('yes')
                .end(done);
        });
        it('false', function(done) {
            server.get('/api/email_exist/zzzzzz@example.com')
                .expect(200)
                .expect('no')
                .end(done);
        });
    });
});
//remember to test db if time allow
describe('User Account API', function() {
    describe('Create account', function() {
        it('email in use', function(done) {
            var body = {'email' : 'asd001@example.com', 'username' : 'asd004', 'password' : 'Asd004'};
            server.post('/api/create_account')
                .send(body)
                .expect(500)
                .expect('email in use')
                .end(done);
        });
        it('username in use', function(done) {
            var body = {'email' : 'asd004@example.com', 'username' : 'asd001', 'password' : 'Asd004'};
            server.post('/api/create_account')
                .send(body)
                .expect(500)
                .expect('username taken')
                .end(done);
        });
        it('valid', function(done) {
            var body = {'email' : 'asd004@example.com', 'username' : 'asd004', 'password' : 'Asd004'};
            server.post('/api/create_account')
                .send(body)
                .expect(200)
                .expect('success')
                .end(done);
        });
        it('already logged in', function(done) {
            var body = {'email' : 'asd004@example.com', 'username' : 'asd004', 'password' : 'Asd004'};
            server.post('/api/create_account')
                .send(body)
                .expect(500)
                .expect('already logged in')
                .end(done);
        });
        it('logout', function(done) {
            server.get('/api/logout')
                .expect(200)
                .expect('logged out')
                .end(done);
        });
    });
    describe('Login', function() {
        it('email not in use', function(done) {
            var body = {'email' : 'asd005@example.com', 'pass' : 'Asd005', 'remember' : false};
            server.post('/api/login')
                .send(body)
                .expect(500)
                .expect('unable to login')
                .end(done);
        });
        it('incorrect password', function(done) {
            var body = {'email' : 'asd004@example.com', 'pass' : 'Asd005', 'remember' : false};
            server.post('/api/login')
                .send(body)
                .expect(500)
                .expect('unable to login')
                .end(done);
        });
        it('valid', function(done) {
            var body = {'email' : 'asd004@example.com', 'pass' : 'Asd004', 'remember' : false};
            server.post('/api/login')
                .send(body)
                .expect(200)
                .expect('success')
                .end(done);
        });
        it('already logged in', function(done) {
            var body = {'email' : 'asd004@example.com', 'pass' : 'Asd004', 'remember' : false};
            server.post('/api/login')
                .send(body)
                .expect(200)
                .expect('already logged in')
                .end(done);
        });
    });
    
    describe('Logout', function() {
        it('while logged in', function(done) {
            server.get('/api/logout')
                .expect(200)
                .expect('logged out')
                .end(done);
        });
        it('while logged out', function(done) {
            server.get('/api/logout')
                .expect(200)
                .expect('not logged in anyways')
                .end(done);
        });
    });
    describe('Change password', function() {
        it('not logged in', function(done) {
            server.get('/api/')
                .expect(200)
                .expect('logged out')
                .end(done);
        });
        it('wrong password', function(done) {
            server.get('/api/logout')
                .expect(200)
                .expect('not logged in anyways')
                .end(done);
        });
        it('valid', function(done) {
            server.get('/api/logout')
                .expect(200)
                .expect('not logged in anyways')
                .end(done);
        });
    });
    //change password
    //is not logged in
    //bad password
    //correct

    //delete account
    //is not logged in
    //email doesnt match logged in user
    //bad username
    //bad password
    //correct
    //cannot login again
});

describe('Layout Editor API', function() {
    //get layout
    //save layout
});


describe('Layout Editor API', function() {
    //publish layout
    //unpublish layout
    //delete layout
    //claim layout
    //post comment
    //vote post
    //vote comment
    //get post
});

async function db_connect() {
    con = mysql.createPool({
        connectionLimit : 32,
        host            : conf.mysql.host,
        port            : conf.mysql.port,
        user            : conf.mysql.user,
        password        : conf.mysql.password,
        database        : conf.mysql.database
    });
    return db('use Testing', []);
}

async function db(qstr, qarg) {
    return new Promise(function(resolve, reject) {
        con.query(qstr, qarg, function (err, result, fields) {
            if (err)
                return reject(err);
            else
                return resolve(result);
        });
    });
}

function db_disconnect() {
    return new Promise(async function(resolve, reject) {
        try {
            await db('drop table post_votes');
            await db('drop table comment_votes');
            await db('drop table comments');
            await db('drop table layouts');
            await db('drop table sessions');
            await db('drop table wsSessions');
            await db('drop table resetPassword');
            await db('drop table users');
            con.end();
            console.log('Disconnect from mysql for testing');
            resolve();
        } catch (err) {
            console.log(err);
        }
    });
}

function db_setup() {
    return new Promise(async function(resolve, reject) {
        try {
            await db_connect();
            console.log("Connected to mysql for testing\n");
            await db(
`create table users(
    id INT NOT NULL AUTO_INCREMENT UNIQUE,
    username CHAR(50) UNIQUE,
    email CHAR(100) UNIQUE,
    hash CHAR(64),
    active BOOLEAN NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
)`, []);
            await db(
`create table sessions(
    user_id INT NOT NULL,
    token CHAR(128) NOT NULL,
    expire CHAR(13) NOT NULL,
    PRIMARY KEY (token),
    FOREIGN KEY (user_id) REFERENCES users(id)
)`, []);
            await db(
`create table wsSessions(
    user_id INT NOT NULL,
    connection_key CHAR(4) NOT NULL,
    expire CHAR(13) NOT NULL,
    PRIMARY KEY (connection_key)
)`, []);
            await db(
`create table resetPassword(
    user_id INT NOT NULL UNIQUE,
    token CHAR(64) NOT NULL,
    expire CHAR(13) NOT NULL,
    PRIMARY KEY (token),
    FOREIGN KEY (user_id) REFERENCES users(id)
)`, []);
            await db(
`create table layouts(
    id INT NOT NULL AUTO_INCREMENT UNIQUE,
    user_id INT NOT NULL,
    data TEXT NOT NULL,
    layout_name CHAR(255),
    layout_description TEXT,
    l_active BOOLEAN NOT NULL DEFAULT 1,
    title CHAR(255),
    text TEXT,
    age CHAR(13),
    score INT DEFAULT 1,
    p_active BOOLEAN NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)`, []);
            await db(
`create table comments(
    id INT NOT NULL AUTO_INCREMENT UNIQUE,
    user_id INT NOT NULL,
    text TEXT,
    age CHAR(50),
    score INT DEFAULT 1,
    layout_id INT,
    PRIMARY KEY (id),
    FOREIGN KEY (layout_id) REFERENCES layouts(id)
)`, []);
            await db(
`create table post_votes(
    user_id INT NOT NULL,
    layout_id INT NOT NULL,
    vote INT NOT NULL,
    PRIMARY KEY (user_id, layout_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (layout_id) REFERENCES layouts(id)
)`, []);
            await db(
`create table comment_votes(
    user_id INT NOT NULL,
    comment_id INT NOT NULL,
    vote INT NOT NULL,
    PRIMARY KEY (user_id, comment_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (comment_id) REFERENCES comments(id)
)`, []);
            await db('INSERT INTO users (username, email, hash, active) values (?, ?, ?, ?)', 
                ['asd001', 'asd001@example.com', '$2a$10$HWVPQOHKXMEf/LmJoRjWeuhh.UwxkYADK.C/bp/J6lEAqdZ.sl79a', 1]);
            await db('INSERT INTO users (username, email, hash, active) values (?, ?, ?, ?)', 
                ['asd002', 'asd002@example.com', 'Tvmd.Ne7MBswRbOSSShimedgtU6IBc6xCgA96m3OweKdrLozvxOgq', 1]);
            await db('INSERT INTO users (username, email, hash, active) values (?, ?, ?, ?)', 
                ['asd003', 'asd003@example.com', 'JxhFfgdLeobnIKy3KpACluUv8GC9etx4kiGJFOZWo3RGuMnVGogua', 0]);
            resolve();
        } catch (err) {
            console.log(err);
        }
    });
}

