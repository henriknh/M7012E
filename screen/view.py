import eventlet
eventlet.sleep() # DONT REMOVE
eventlet.monkey_patch()

import game
import lobby
from registration import *

from flask import Flask, render_template, request
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import os, time, json, logging, getpass
from flask_socketio import SocketIO, emit

#log = logging.getLogger('werkzeug')
#log.setLevel(logging.ERROR)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'hotsecret!'
socketio = SocketIO(app, engineio_logger=False, ping_timeout=5, ping_interval=1, async_mode="eventlet")

def broadcast(topic, message, namespace=None, room=None):
    socketio.emit(topic, json.dumps(message), namespace=namespace, room=room)

class View(object):

    games = ['quiz', 'space']

    lobby = None
    game = None
    reg = None
    state = 'lobby'
    playing = False
    port = 5050

    def __init__(self):
        self.game = game.Game(self)
        self.lobby = lobby.Lobby(self)
        self.reg = Registration()

    def getState(self):
        return self.state

    def setState(self, state):
        self.state = state
        self.broadcast('lobbystate', state, '/screen')
        for sid in self.lobby.getGameQueue():
            self.broadcast('lobbystate', state, '/controller', sid)
        return self.state

    def setGameOver(self):
        self.playing = False

        self.lobby.gameEnded()


    def getLobby(self):
        return self.lobby

    def getGame(self):
        return self.game

    def getRegistration(self):
        return self.reg

    def getPort(self):
        return self.port

    def getSocketIO(self):
        return socketio

    def checkEnoughPlayers(self):
        if self.lobby.isEnough() and self.playing == False:
            self.playing = True
            gameModule = self.games.pop()
            self.games.insert(0, gameModule)
            print(self.games)
            socketio.start_background_task(game.play, gameModule)

    def broadcast(self, topic, message, namespace=None, room=None):
        broadcast(topic, message, namespace, room)

    def startFlask(self, port):
        self.port = port
        if getpass.getuser() == 'pi' and False:
            self.openBrowser('localhost:'+port+'/lobby')
        self.reg.register(self.port)
        socketio.run(app, host='0.0.0.0', port=self.port)

    def openBrowser(self, url):
        opts = Options()
        opts.binary_location = "/usr/bin/chromium-browser"
        opts.add_argument("disable-infobars")
        #opts.add_argument("--kiosk") # Fullscreen mode
        driver = webdriver.Chrome(chrome_options=opts, executable_path=os.getcwd()+"/chromedriver")
        driver.get(url)

view = View()

from handlers import handlers

app.register_blueprint(handlers)

view.startFlask(5050)
#socketio.start_background_task(startFlask)
