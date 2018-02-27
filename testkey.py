#!/usr/bin/env python


import os
import sys
import ctypes

BUFFER_SIZE = 512

# Used for emulating key presses. This gives us access to user32.dll
user32 = ctypes.windll.user32

# User32.dll Virtual keys
#got these from https://msdn.microsoft.com/en-us/library/windows/desktop/dd375731(v=vs.85).aspx
VK_VOLUME_MUTE = 0xAD
VK_VOLUME_DOWN = 0xAE
VK_VOLUME_UP = 0xAF
VK_MEDIA_NEXT_TRACK = 0xB0
VK_MEDIA_PREV_TRACK = 0xB1
VK_MEDIA_STOP = 0xB2
VK_MEDIA_PLAY_PAUSE = 0xB3
VK_PLAY = 0xFA
VK_SLEEP = 0x5F



# Mapping expected input to actions
bytes_to_keys = {}
bytes_to_keys["1"] = VK_MEDIA_PLAY_PAUSE
bytes_to_keys["2"] = VK_MEDIA_NEXT_TRACK
bytes_to_keys["3"] = VK_MEDIA_PREV_TRACK
bytes_to_keys["4"] = VK_MEDIA_STOP
bytes_to_keys["5"] = VK_VOLUME_UP
bytes_to_keys["6"] = VK_VOLUME_DOWN
bytes_to_keys["7"] = VK_VOLUME_MUTE
bytes_to_keys["8"] = VK_SLEEP
str_to_cmd = {}
str_to_cmd["logout"] = r"shutdown /l"
str_to_cmd["shutdown"] = r"shutdown /s"

def run_command(cmd):
	os.system(cmd)

def map_to_action(inst):
	'''Takes a 1-character code and executes the action assoliated with it'''
	if len(inst) == 1:
		if inst in bytes_to_keys:
			key_code = bytes_to_keys[inst]
		user32.keybd_event(key_code, 0, 0, 0) # press
		user32.keybd_event(key_code, 0, 2, 0) # release
	elif inst in str_to_cmd:
		run_command(inst)
	else:
		print("unknown instruction:", inst)



##########################################
################## Main ##################
##########################################

inst = input("Enter 1-8 or cmd you want to test: ")
inst = str(inst)
while inst != "exit" :
	map_to_action(inst)
	inst = input("Enter 1-8 or cmd you want to test: ")

print("Exit")
