#Please download this to your local computer. This script will not work on the server.
from websocket import create_connection
#connect to server and specify random-number protocol to get random numbers
import ssl
import keyboard
import time
import pyautogui
import os
import subprocess
import threading
import time
from Tkinter import *



class App:

	def __init__(self, master):

		frame = Frame(master)
		frame.pack()

		frame2 = Frame(master)
		frame2.pack()

		frame3 = Frame(master)
		frame3.pack()

		frame4 = Frame(master)
		frame4.pack()

		self.button = Button(
			frame, text="QUIT", fg="red", command=frame.quit
			)
		self.button.pack(side=LEFT)

		self.b_Connect = Button(frame, text="Connect", command=self.connect)
		self.b_Connect.pack(side=LEFT)

		self.b_VolUp = Button(frame, text="^", command=self.volume_Up)
		self.b_VolUp.pack(side=RIGHT)

		self.b_VolDown = Button(frame, text="V", command=self.volume_Down)
		self.b_VolDown.pack(side=RIGHT)

		self.b_VolMute = Button(frame, text="Mute", command=self.volume_Mute)
		self.b_VolMute.pack(side=RIGHT)

		self.b_NextTrack = Button(frame, text=">>", command=self.track_Next)
		self.b_NextTrack.pack(side=RIGHT)

		self.b_PrevTrack = Button(frame, text="<<", command=self.track_Prev)
		self.b_PrevTrack.pack(side=RIGHT)

		self.b_moveMouse = Button(frame, text="MoveMouse", command=self.mouse_Move)
		self.b_moveMouse.pack(side=RIGHT)
		self.b_clickMouse = Button(frame, text="ClickMouse", command=self.mouse_Click)
		self.b_clickMouse.pack(side=RIGHT)

		self.cid = "No ID"
		self.l_ID = Label(frame2, text=self.cid)
		self.l_ID.pack(side=BOTTOM)

		self.l_X = Label(frame3, text="Mouse X,")
		self.l_X.pack(side=LEFT)

		self.l_Y = Label(frame3, text="Y")
		self.l_Y.pack(side=LEFT)

		self.mouseX = Entry(frame3)
		self.mouseX.pack(side=LEFT)

		self.mouseY = Entry(frame3)
		self.mouseY.pack(side=LEFT)

		self.l_dir = Label(frame4, text="Program directory")
		self.l_dir.pack(side=LEFT)
		self.dir = Entry(frame4)
		self.dir.pack(side=LEFT)
		self.b_dir = Button(frame4, text="Open", command=self.execute)
		self.b_dir.pack(side=RIGHT)

		self.b_logoff = Button(frame4, text="Logoff", command=self.winLogoff)
		self.b_logoff.pack(side=RIGHT)

	def winLogoff(self):
		subprocess.call(["shutdown", "/l"])

	def execute(self):
		os.startfile(self.dir.get())

	def mouse_Move(self):
		x = int(self.mouseX.get())
		y = int(self.mouseY.get())
		pyautogui.moveTo(x,y,1)

	def mouse_Click(self):
		pyautogui.click()

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

	def recLoop(self, ws):
		while(1):
			text = ws.ping()
			print(text)
			time.sleep(5)
		return

	def on_error(ws, error):
		print error

	def connect(self):
		ws = create_connection("wss://applepie.albert.tech", sslopt={"cert_reqs": ssl.CERT_NONE},  subprotocols=["random-number"], on_error=self.on_error, setTimeout=0)

		result =  ws.recv()
		
		#Messages from server will be stored in 'result'. Currently the server sends 25 random numbers between 0 and 99 and then stops.
		print "Received '%s'" % result

		self.cid = result.split(": ")
		self.l_ID['text'] = self.cid[1]
		print(self.cid[1])

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
		print r
		t = threading.Thread(target=self.recLoop, args=[ws])

		t.start()




root = Tk()
root.geometry("500x500")
app = App(root)
root.mainloop()
root.destroy() # optional; see description below
