#Please download this to your local computer. This script will not work on the server.
from websocket import create_connection
#connect to server and specify random-number protocol to get random numbers
import ssl
import keyboard
import time
import pyautogui
from Tkinter import *

class App:

    def __init__(self, master):

        frame = Frame(master)
        frame.pack()

        self.button = Button(
            frame, text="QUIT", fg="red", command=frame.quit
            )
        self.button.pack(side=LEFT)

        self.b_Connect = Button(frame, text="Hello", command=self.connect)
        self.b_Connect.pack(side=LEFT)

        self.b_VolUp = Button(frame, text="VolUp", command=self.volume_Up)
        self.b_VolUp.pack(side=LEFT)

        self.b_VolDown = Button(frame, text="VolDown", command=self.volume_Down)
        self.b_VolDown.pack(side=LEFT)

        self.b_VolMute = Button(frame, text="VolMute", command=self.volume_Mute)
        self.b_VolMute.pack(side=LEFT)

        self.b_NextTrack = Button(frame, text="TrackNext", command=self.track_Next)
        self.b_NextTrack.pack(side=LEFT)

        self.b_PrevTrack = Button(frame, text="TrackPrev", command=self.track_Prev)
        self.b_PrevTrack.pack(side=LEFT)

        cid = "No ID"
        self.l_ID = Label(frame, text=cid)
        self.l_ID.pack(side=BOTTOM)

    def track_Next(self):
    	pyautogui.press('nexttrack')
    	print("Next track")

    def track_Prev(self):
    	pyautogui.press('prevtrack')
    	print("Prev track")

    def volume_Up(self):
    	pyautogui.press('volumeup')
    	print("Vol up")

    def volume_Down(self):
    	pyautogui.press('volumedown')
    	print("Vol down")

    def volume_Mute(self):
    	pyautogui.press('volumemute')
    	print("Vol mute")

    def connect(self):
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

root = Tk()
app = App(root)
root.mainloop()
root.destroy() # optional; see description below
