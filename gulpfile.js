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
var stripCode = require('gulp-strip-code');
var closureCompiler = require('gulp-closure-compiler');
var uglify = require('gulp-uglify');

// postcss

var precss = require('precss');
var autoprefixer = require('autoprefixer');
var autoreset = require('postcss-autoreset');
var cssnext = require('postcss-cssnext');

// util

var defaultConfig = {

};

var nodeModules = fs.readdirSync('node_modules')
  .filter(function(x) {
    return ['.bin'].indexOf(x) === -1;
});

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

function config(overrides) {
  return deepmerge(defaultConfig, overrides || {});
}

// generic config

if(process.env.NODE_ENV !== 'production') {
  defaultConfig.devtool = 'eval-source-map';
  defaultConfig.debug = true;
}

// frontend config

var frontendConfig = config({
  entry: [
   './web.browser/src/js/main.js',
   'webpack-dev-server/client?http://0.0.0.0:9000',
   'webpack/hot/dev-server'
   ],
   output: {
     path: path.resolve(__dirname, './web.browser/build'),
     publicPath: 'http://localhost:3000/',
     filename: 'frontend.js'
   },
   module: {
     loaders: [
       {test: /\.js$/, exclude: /node_modules/, loaders: ['babel'] },
       {test: /\.postcss$/, loader: 'style!css!postcss'}
     ],
     postloaders: [
       {test: /\.js$/, exclude: /node_modules/, loaders: ['uglify'] }
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

var backendConfig = config({
  entry: [
    'webpack/hot/signal.js',
    './server/src/main.js'
  ],
  target: 'node',
  output: {
    path: path.resolve(__dirname, './server/build'),
    publicPath: 'http://localhost:3000/',
    filename: 'app.js'
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
  recordsPath: path.resolve(__dirname, './server/build/_records'),
  plugins: [
    new webpack.IgnorePlugin(/\.(css|less)$/),
    new webpack.BannerPlugin('require("source-map-support").install();',
                             { raw: true, entryOnly: false }),
    new webpack.HotModuleReplacementPlugin({ quiet: true })
  ]
});

// gulp tasks

gulp.task('copy', function () {
  return gulp
    .src('./web.browser/src/index.html')
    .pipe(gulp.dest('./web.browser/build'));
});

gulp.task('build-deploy-bundle', ['frontend-build', 'backend-build-production'], function () {
  gulp
    .src('./web.browser/build/frontend.js')
    .pipe(closureCompiler({
      compilerPath: 'compiler.jar',
      fileName: 'frontend.js',
      compilerFlags: {
        compilation_level: 'ADVANCED_OPTIMIZATIONS',
        output_wrapper: '(function(){%output%}).call(window);',
        warning_level: 'VERBOSE'
      }
    }))
    .pipe(uglify())
    .pipe(gulp.dest('./.deploy/bundle/public'));
  gulp
    .src('./server/build/app.js')
    .pipe(gulp.dest('./.deploy/bundle'));
  gulp
    .src('./server/src/socketcluster/**/*.*')
    .pipe(gulp.dest('./.deploy/bundle/socketcluster'));
});


gulp.task('frontend-build', ['copy'], function(done) {
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
    contentBase: './web.browser/build',
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
    baseDir: './web.browser/build',
    files: ['./web.browser/build/index.html'],
    proxy: {
        target: 'localhost:9000',
        ws: true
    },
    port: 8080,
    ui: { port: 8081 },
    open: true
  });

  gulp.watch('./web.browser/src/index.html', ['copy']);

});

gulp.task('strip', function(){
  gulp.src(['./web.browser/js/**/*.js', './server/src/**/*.js'])
  .pipe(stripCode({
      start_comment: 'remove-prod',
      end_comment: 'end-remove-prod'
    }));
});

gulp.task('backend-build',function(done) {
  webpack(backendConfig).run(onBuild(done));
});

gulp.task('backend-build-production', ['strip'], function(done) {
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
    script: path.join(__dirname, '/server/build/app'),
    ignore: ['*'],
    watch: ['foo/'],
    ext: 'noop'
  }).on('restart', function() {
    console.log('Server process was monkey-hot-reloaded!');
  });
});
