#Please download this to your local computer. This script will not work on the server.
from websocket import create_connection
#connect to server and specify random-number protocol to get random numbers
import ssl
import keyboard
import time

ws = create_connection("wss://applepie.albert.tech", sslopt={"cert_reqs": ssl.CERT_NONE},  subprotocols=["random-number"])
result =  ws.recv()
    #Messages from server will be stored in 'result'. Currently the server sends 25 random numbers between 0 and 99 and then stops.
print "Received '%s'" % result
print "Requesting numbers..."
#Send "Give me numbers" to the server
ws.send("Give me numbers")
print "Requested"
print "Receiving..."
#While loop to continually wait for server to return messages
r = ""
for x in range (0,25):
    result =  ws.recv()
    #Messages from server will be stored in 'result'. Currently the server sends 25 random numbers between 0 and 99 and then stops.
    #print "Received '%s'" % result
    #print result
    r += result
ws.close()
print r
time.sleep(3)
keyboard.write(r)
