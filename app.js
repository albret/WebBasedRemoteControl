const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const baseDirectory = __dirname

// redirect all http request to https
http.createServer((req, res) => {
	console.log('http redirect');
	if (req.url == '/')
		redirectTo(req, res, '/index.html');
	else
		redirectTo(req, res, req.url);
}).listen(8000);

const options = {
	key: fs.readFileSync('/home/ec2-user/ssl-keys/privkey.pem'),
	cert: fs.readFileSync('/home/ec2-user/ssl-keys/cert.pem'),
};

https.createServer(options, (req, res) => {
	console.log(req.headers.host + '\t' + req.url);
	try {
		var pagePath = path.normalize(req.url);
		var fullPath = baseDirectory + '/var' + pagePath;
		if (pagePath == '/') {
			redirectTo(req, res, '/index.html');
		} else if (pagePath.slice(0, 3) == '/r/') {
			apiHandle(req, res);
		} else {
			var fileStream = fs.createReadStream(fullPath);
			fileStream.pipe(res);
			fileStream.on('open', function() {
				res.writeHead(200, {'Content-Type': 'text/html'});
			});
			fileStream.on('error', function(e) {
				redirectTo(req, res, '/404.html');
			})
		}
	} catch(e) {
		res.writeHead(500);
		res.end();
		console.log(e.stack);
	}
}).listen(8001);

function redirectTo(req, res, url) {
	console.log('redirect');
	res.writeHead(302, {Location: 'https://' + req.headers.host + url});
	res.end();
}

// all api requests should start with /r/
function apiHandle(req, res) {
	console.log('api');
	res.end();
}
