var connections = {};

//Websocket receive connection requests
exports.handle_request = async function(request) {
    var connection = request.accept('random-number', request.origin);
    console.log('Connection from origin ' + connection.remoteAddress);
    console.log((new Date()) + ' Connection accepted.');
    var connectionKey = await get_valid_key();
    connections[connectionKey] = connection;
    console.log(Object.keys(connections));
    var expTime = (new Date((Date.now() + 300000))).getTime();
    await require('./rcdb').db_query('INSERT INTO wsSessions (user_id, connection_key, expire) VALUES (?, ?, ?)', [-1, connectionKey, expTime]);
    connection.sendUTF('Here is your connection key: ' + connectionKey)
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            for(var i = 0; i < 25; i++) {
                var number = Math.floor(Math.random() * 100);
                connection.sendUTF(number);
            }
            console.log('Numbers sent');
        }
    });
    connection.on('close', async function(reasonCode, description) {
        console.log((new Date()) + connection.remoteAddress + ' disconnected.');
        console.log('User had connection key ' + connectionKey);
        await require('./rcdb').db_query('DELETE FROM wsSessions WHERE connection_key = ?', [connectionKey]);
        delete connections[connectionKey];
        console.log(Object.keys(connections));
    });
}
async function get_valid_key() {
    while (1) {
        var connectionKey = require('crypto').randomBytes(2).toString('hex');
        var validKey = await require('./rcdb').db_query('SELECT * FROM wsSessions WHERE connection_key = ?', [connectionKey]);
        if (validKey.length == 0) return connectionKey;
        var currTime = (new Date((Date.now()))).getTime();
        if (currTime > validKey[0].expire_time) return connectionKey;
    }
}
exports.send_command = async function(connectionKey, command) {
    var connection = connections[connectionKey];
    console.log(connectionKey);
    if (!connection) {
        return 0;
    }
    if (connection.connected) {
        connection.sendUTF(command);
        return 1;
    }
    return 0;
}
exports.close_connection = async function(connectionKey) {
var connection = connections[connectionKey];
    console.log(connectionKey);
    if (connection) {
        if (connection.connected) connection.close();
    }
    delete connections[connectionKey];
}
