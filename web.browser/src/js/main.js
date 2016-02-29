import React from 'react';
import ReactDOM from 'react-dom';

require('../styles/main.postcss');
import App from './components/app';

ReactDOM.render(<App/>, document.querySelector('#mount'));

/* remove-prod */
if (module.hot) {
  module.hot.accept();
}
/* end-remove-prod */
