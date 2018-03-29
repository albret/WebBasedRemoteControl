var fs = require('fs');
var parsed = JSON.parse(fs.readFileSync('../config.json'));
if (process.env.NODE_ENV == 'test') {
    parsed.mysql.database = "Testing";
    parsed.server.http = 8800;
    parsed.server.https = 8801;
}
console.log('Config using db: ' + parsed.mysql.database);
module.exports = parsed;
