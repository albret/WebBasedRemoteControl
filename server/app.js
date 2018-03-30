const express = require('express'),
      fs = require('fs'),
      http = express(),
      https = require('https'),
      conf = require('./config'),
      httpsOption = {
          key: fs.readFileSync(conf.https.key),
          cert: fs.readFileSync(conf.https.cert),
      },
      app = express(),
      cookieParser = require('cookie-parser'),
      WebSocketServer = require('websocket').server;

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
http.listen(conf.server.http);
http.use(trafficLog);
http.use(redirectHttps);

// Start server with options
var secureServer = https.createServer(httpsOption, app).listen(conf.server.https);
app.set('views', __dirname + '/../views');
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser(conf.cookie.signkey));

// Websocket server startup
wsServer = new WebSocketServer({
    httpServer: secureServer,
    autoAcceptConnections: false
});

//Websocket receive connection request
wsServer.on('request', require('./wshandler').handle_request);

// Express middleware
app.use(trafficLog);
require('./route')(app);
app.use(express.static(__dirname + '/../static'));
app.use(default404);
require('./rcdb').connect();

// Shut down routine
var shutdown_routine = function() {
    require('./rcdb').disconnect();
    console.log('Server shutdown');
    process.exit();
};
process.on('SIGINT', shutdown_routine);

exports.server = app;
exports.shutdown = shutdown_routine;
