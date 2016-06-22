'use strict';

var serveStatic = require('serve-static');
var path = require('path');

var STATIC_PATHS = {};
if(process.env.NODE_ENV === 'production'){
  STATIC_PATHS.dir = '../public';
  STATIC_PATHS.index = '../public/index.html';
}else{
  STATIC_PATHS.dir = '../../static';
  STATIC_PATHS.index = '../../static/index.html';
}

module.exports.run = function (worker) {
  console.log('   >> Worker PID:', process.pid);

  var app = require('express')();

  var httpServer = worker.httpServer;
  var scServer = worker.scServer;

  app.use(serveStatic(path.resolve(__dirname, STATIC_PATHS.dir)));

  app.get('*', function(req, res) {
    res.sendFile(path.resolve(__dirname, STATIC_PATHS.index));
  });

  httpServer.on('request', app);
  
  scServer.on('connection', function (socket) {

    socket.on('hello', function (data) {
        console.log(data.message);
    });

    socket.emit('hello', { message: 'Hello from your socket server...' });

  });
};
