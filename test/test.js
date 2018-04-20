var should = require('chai').should(),
    expect = require('chai').expect,
    supertest = require('supertest'),
    conf = require('../server/config');

var server_http = supertest.agent('http://localhost:' + conf.server.http);
var server = supertest.agent('https://localhost:' + conf.server.https);

before(function(done) {
    myapp = require('../server/app');
    app = myapp.server;
    setTimeout(function() {
      done();
    }, 1000);
});

after(function(done) {
    myapp.shutdown();
    done();
});

describe('server up', function() {
    it('should redirect http to https', function(done) {
        server_http.get('/')
            .expect(302)
            .end(done);
    });
});


/*
user exist
email exist

create account
login - everything requires login after this
check login
logout
change password
delete account
forgot password
reset password
get user data
??  wss connect, send ocmmand, close connection
is logged in
get layout
save layout
publish layout
unpublish layout
claim layout
post comment
vote post
vote comment
get post








*/
