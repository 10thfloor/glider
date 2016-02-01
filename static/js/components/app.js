'use strict';

import React from 'react';
import socketCluster from 'socketcluster-client';
var socket;

module.exports = React.createClass({

  getInitialState: function() {
    return {
      blur:'blur'
    };
  },

  componentDidMount: function() {
    socket = socketCluster.connect();
  },

  ping: function(){
      socket.emit('ping', 'hello from react !');
      this.blurtoggle();
  },

  blurtoggle: function(){
    var blur = this.state.blur === 'blur' ? '' : 'blur';
    this.setState({ blur: blur });
  },

  render: function() {
    return (
      <div>
        <h3 className={this.state.blur}>React app</h3>
        <button onClick={this.ping}>Ping socket server</button>
      </div>
    );
  }
});
