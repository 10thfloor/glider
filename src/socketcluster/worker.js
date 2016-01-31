'use strict';

var serveStatic = require('serve-static');

var path = require('path');

module.exports.run = function (worker) {
  console.log('   >> Worker PID:', process.pid);

  var app = require('express')();

  var httpServer = worker.httpServer;
  var scServer = worker.scServer;

  app.use(serveStatic(path.resolve(__dirname, '../../static')));

  app.get('*', function(req, res) {
    res.sendFile(path.resolve(__dirname, '../../static/index.html'));
  });

  httpServer.on('request', app);

  var count = 0;
  scServer.on('connection', function (socket) {
    console.log('got socketcluster connection...');

    socket.on('disconnect', function () {
        console.log('socketcluster disconnect...');
    });

    socket.on('ping', function (data) {
      count++;
      console.log('PING', data);
      //scServer.exchange.publish('pong', count);
    });

  });


};
