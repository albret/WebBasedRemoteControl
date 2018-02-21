#!/usr/bin/python

from websocket import create_connection
ws = create_connection("wss://applepie.albert.tech", subprotocols=["random-number"])
print "Requesting numbers..."
ws.send("Give me numbers")
print "Requested"
print "Receiving..."
while 1:
    result =  ws.recv()
    print "Received '%s'" % result
ws.close()
