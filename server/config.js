var fs = require('fs');
var parsed = JSON.parse(fs.readFileSync('./config.json'));
exports.mysql = parsed.mysql;
exports.cookie = parsed.cookie;
exports.email = parsed.email;
exports.https = parsed.https;
