// Server code
'use strict';

var SocketCluster = require('socketcluster').SocketCluster;

var STATIC_PATHS = {};
if(process.env.NODE_ENV === 'production'){
  STATIC_PATHS.worker = __dirname + '/socketcluster/worker.js';
  STATIC_PATHS.broker = __dirname + '/socketcluster/broker.js';
}else{
  STATIC_PATHS.worker = __dirname + '/socketcluster/worker.js';
  STATIC_PATHS.broker = __dirname + '/socketcluster/broker.js';
}

var socketCluster = new SocketCluster({
  workers: 1,
  brokers: 1,
  port: 8000,
  appName: 'app',
  workerController: STATIC_PATHS.worker,
  brokerController: STATIC_PATHS.broker,
  socketChannelLimit: 1000,
  rebootWorkerOnCrash: true
});

process.on('SIGUSR2', function () {
    socketCluster.killWorkers();
    socketCluster.killBrokers();
    process.exit(0);
});

/* remove-prod */
if (module.hot) {
  module.hot.decline();
}
/* end-remove-prod */
