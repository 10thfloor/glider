'use strict';

import React from 'react';
import socketCluster from 'socketcluster-client';
var socket;

module.exports = React.createClass({

  componentDidMount: function() {
    socket = socketCluster.connect();
  },

  ping: function(){
      socket.emit('ping', 'hello from react !');
  },

  render: function() {
    return (
      <div>
        <button onClick={this.ping}>Ping socket server ... </button>
      </div>
    );
  }
});
