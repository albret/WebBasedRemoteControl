const express = require('express'),
	fs = require('fs'),
	http = express(),
	https = require('https'),
	app = express();

var trafficLog = function(req, res, next) {
	var ip = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        (req.connection.socket ? req.connection.socket.remoteAddress : null);
    console.log(ip + ':\t' + req.url);
	next();
}

var redirectHttps = function(req, res, next) {
	console.log('\t\t redirect');
	if (req.url == '/')
		req.url = '/index.html';
	res.writeHead(302, {Location: 'https://' + req.headers.host + req.url});
	res.end();
}

var default404 = function(req, res, next) {
	res.writeHead(302, {Location: 'https://' + req.headers.host + '/404.html'});
	res.end();
}

http.listen(8000);
http.use(trafficLog);
http.use(redirectHttps);


const httpsOption = {
	key: fs.readFileSync('/home/ec2-user/ssl-keys/privkey.pem'),
    cert: fs.readFileSync('/home/ec2-user/ssl-keys/cert.pem'),
};
https.createServer(httpsOption, app).listen(8001);

app.use(trafficLog);
app.use(express.static(__dirname + '/var'));
app.use(default404);
