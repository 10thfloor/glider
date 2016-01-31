import React from 'react';
import ReactDOM from 'react-dom';

require('./styles/main.scss');
import App from './js/components/app';

ReactDOM.render(<App/>, document.querySelector('#mount'));

if (module.hot) {
  module.hot.accept();
}
