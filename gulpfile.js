'use strict';

var gulp = require('gulp');
var webpack = require('webpack');
var path = require('path');
var fs = require('fs');
var DeepMerge = require('deep-merge');
var nodemon = require('nodemon');
var WebpackDevServer = require('webpack-dev-server');
var httpProxy = require('http-proxy');
var http = require('http');
var browserSync = require('browser-sync');

// postcss
var precss = require('precss');
var autoprefixer = require('autoprefixer');
var autoreset = require('postcss-autoreset');
var cssnext = require('postcss-cssnext');

// util

var deepmerge = new DeepMerge(function(target, source) {
  if(target instanceof Array) {
    return [].concat(target, source);
  }
  return source;
});

function onBuild(done) {
  return function(err, stats) {
    if(err) {
      console.log('Error', err);
    }
    else {
      console.log(stats.toString());
    }

    if(done) {
      done();
    }
  };
}

// generic config

var defaultConfig = {};

if(process.env.NODE_ENV !== 'production') {
  defaultConfig.devtool = 'eval-source-map';
  defaultConfig.debug = true;
}

function config(overrides) {
  return deepmerge(defaultConfig, overrides || {});
}

// frontend config

var frontendConfig = config({
  entry: [
   './static/main.js',
   'webpack-dev-server/client?http://0.0.0.0:9000',
   'webpack/hot/dev-server'
   ],
   output: {
     path: path.join(__dirname, 'static/build'),
     publicPath: 'http://localhost:9000/build',
     filename: 'frontend.js'
   },
   module: {
     loaders: [
       {test: /\.js$/, exclude: /node_modules/, loaders: ['babel'] },
       {test: /\.postcss$/, loader: 'style!css!postcss'}
     ]
   },
   postcss: function () {
       return [
          precss,
          cssnext,
          autoprefixer,
          autoreset({
            reset: {
              'box-sizing': 'border-box'
            }
          })
       ];
   },
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.HotModuleReplacementPlugin({quiet: true}),
    new webpack.NoErrorsPlugin()
  ]
});

// backend config

var nodeModules = fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
  });

var backendConfig = config({
  entry: [
    'webpack/hot/signal.js',
    './src/main.js'
  ],
  target: 'node',
  output: {
    path: path.join(__dirname, 'build'),
    filename: 'backend.js'
  },
  node: {
    __dirname: true,
    __filename: true
  },
  externals: [
    function(context, request, callback) {
      var pathStart = request.split('/')[0];
      if (nodeModules.indexOf(pathStart) >= 0 && request !== 'webpack/hot/signal.js') {
        return callback(null, 'commonjs ' + request);
      }
      callback();
    }
  ],
  module: {
    loaders: [
      {test: /\.js$/, exclude: /node_modules/, loaders: ['monkey-hot', 'babel'] }
    ]
  },
  recordsPath: path.join(__dirname, 'build/_records'),
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less)$/),
    new webpack.BannerPlugin('require("source-map-support").install();',
                             { raw: true, entryOnly: false }),
    new webpack.HotModuleReplacementPlugin({ quiet: true })
  ]
});

// gulp tasks

gulp.task('frontend-build', function(done) {
  webpack(frontendConfig).run(onBuild(done));
});

gulp.task('frontend-watch', function() {

  var webProxy = new httpProxy.createProxyServer({
    target: {
      host: 'localhost',
      port: 3000
    }
  });

   var clusterProxy = new httpProxy.createProxyServer({
     target: {
       host: 'localhost',
       port: 8000,
       ws: true
     }
   });

   var hmrProxy = new httpProxy.createProxyServer({
     target: {
       host: 'localhost',
       port: 3000,
       ws: true
     }
   });

  var server = http.createServer(function (req, res) {
    webProxy.web(req, res);
  });

  server.on('upgrade', function (req, socket, head) {
    if((req.url).indexOf('/socketcluster/') !== -1) {
        console.log('proxying to sc server --', req.url);
        clusterProxy.ws(req, socket, head);
    }else{
        console.log('proxying to webpack server --', req.url);
        hmrProxy.ws(req, socket, head);
    }
  });

  server.listen(9000);

  new WebpackDevServer(webpack(frontendConfig), {
    publicPath: frontendConfig.output.publicPath,
    contentBase: './static',
    historyApiFallback: true,
    hot: true,
    stats: {
      progress: true,
      colors: true,
      hash: false,
      timings: true,
      chunks: false,
      chunkModules: false,
      modules: false
    }
  }).listen(3000, 'localhost', function (err) {
    if(err) {
      console.log(err);
    }
    else {
      console.log('webpack dev server listening at localhost:3000');
    }
  });

  browserSync.init({
    baseDir: './static',
    files: ['./static/index.html'],
    proxy: {
        target: 'localhost:9000',
        ws: true
    },
    port: 8080,
    ui: { port: 8081 },
    open: true
  });

});

gulp.task('backend-build', function(done) {
  webpack(backendConfig).run(onBuild(done));
});

gulp.task('backend-watch', function(done) {
  var firedDone = false;
  webpack(backendConfig).watch(100, function() {
    if(!firedDone) {
      firedDone = true;
      done();
    }
    nodemon.restart();
  });
});

gulp.task('build', ['frontend-build', 'backend-build']);
gulp.task('watch', ['frontend-watch', 'backend-watch']);

gulp.task('run', ['backend-watch', 'frontend-watch'], function() {
  nodemon({
    execMap: {
      js: 'node'
    },
    script: path.join(__dirname, 'build/backend'),
    ignore: ['*'],
    watch: ['foo/'],
    ext: 'noop'
  }).on('restart', function() {
    console.log('Server process was monkey-hot-reloaded!');
  });
});
