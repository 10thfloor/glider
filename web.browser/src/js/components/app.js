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
    socket.on('hello', function(data){
        console.log(data.message);
    });
  },

  ping: function(){
      socket.emit('hello', { message: 'Hello from React!'});
      this.blurtoggle();
  },

  blurtoggle: function(){
    var blur = this.state.blur === 'blur' ? '' : 'blur';
    this.setState({ blur });
  },

  render: function() {
    return (
      <div>
        <h3 className={this.state.blur}>React app</h3>
        <button onClick={this.ping}>Ping socket server ...</button>
      </div>
    );
  }
});
