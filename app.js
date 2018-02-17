const express = require('express'),
      fs = require('fs'),
      http = express(),
      https = require('https'),
      httpsOption = {
          key: fs.readFileSync('/home/ec2-user/ssl-keys/privkey.pem'),
          cert: fs.readFileSync('/home/ec2-user/ssl-keys/cert.pem'),
      },
      app = express(),
      bodyParser = require('body-parser');

// Log ip and url of all traffic
var trafficLog = function(req, res, next) {
    var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
    console.log(ip + ':\t' + req.url);
    next();
}

// Redirects all traffic to https
var redirectHttps = function(req, res, next) {
    console.log('\t\t redirect');
    res.writeHead(302, {Location: 'https://' + req.headers.host + req.url});
    res.end();
}

// Redirects bad paths to 404 not found page
var default404 = function(req, res, next) {
    res.writeHead(302, {Location: 'https://' + req.headers.host + '/404.html'});
    res.end();
}

// Start http server for redirect
http.listen(8000);
http.use(trafficLog);
http.use(redirectHttps);

// Start server with options
https.createServer(httpsOption, app).listen(8001);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Express middleware
app.use(trafficLog);
require('./route')(app);
app.use(express.static(__dirname + '/static'));
app.use(default404);
require('./rcdb').connect();

// Shut down routine
process.on('SIGINT', function() {
        require('./rcdb').disconnect();
        console.log('Server shutdown');
        process.exit();
        });

require('./rcdb').temp();
