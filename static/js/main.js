import socketCluster from 'socketcluster-client';

import React from 'react';
import ReactDOM from 'react-dom';

import App from './components/app';

var socket = socketCluster.connect();
socket.emit('ping', 'Ping socket server ! ');


ReactDOM.render(<App/>, document.querySelector('#mount'));

if (module.hot) {
  module.hot.accept();
}
