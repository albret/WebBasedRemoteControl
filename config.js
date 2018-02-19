var fs = require('fs');
var parsed = JSON.parse(fs.readFileSync('./config.json'));
exports.conf = parsed;
