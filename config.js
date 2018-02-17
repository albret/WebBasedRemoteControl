var fs = require('fs');
var parsed = JSON.parse(fs.readFileSync('./config.json'));
exports.mysqlconfig = parsed;
