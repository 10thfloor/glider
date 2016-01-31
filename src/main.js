// Server code
'use strict';

var SocketCluster = require('socketcluster').SocketCluster;

var socketCluster = new SocketCluster({
  workers: 1,
  brokers: 1,
  port: 8000,
  appName: 'app',
  workerController: __dirname + '/socketcluster/worker.js',
  brokerController: __dirname + '/socketcluster/broker.js',
  socketChannelLimit: 1000,
  rebootWorkerOnCrash: true
});

process.on('SIGUSR2', function () {
    socketCluster.killWorkers();
    socketCluster.killBrokers();
    process.exit(0);
});

if(module.hot) {
    module.hot.decline();
}
