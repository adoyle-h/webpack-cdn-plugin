import path from 'path';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import WebpackCdnPlugin from '../module';

const cssMatcher = /<link href="(.+?)" rel="stylesheet">/g;
const jsMatcher = /<script type="text\/javascript" src="(.+?)">/g;

let cssAssets;
let jsAssets;

WebpackCdnPlugin.node_modules = path.join(__dirname, '../node_modules');

const versions = {
  jasmine: WebpackCdnPlugin.getVersion('jasmine'),
  jasmineSpecReporter: WebpackCdnPlugin.getVersion('jasmine-spec-reporter'),
  nyc: WebpackCdnPlugin.getVersion('nyc'),
};

const fs = new webpack.MemoryOutputFileSystem();

function runWebpack(callback, config) {
  cssAssets = [];
  jsAssets = [];

  const compiler = webpack(config);
  compiler.outputFileSystem = fs;

  compiler.run((err, stats) => {
    const html = stats.compilation.assets['../index.html'].source();

    let matches;
    while (matches = cssMatcher.exec(html)) {
      cssAssets.push(matches[1]);
    }

    while (matches = jsMatcher.exec(html)) {
      jsAssets.push(matches[1]);
    }

    callback();
  });
}

function getConfig({ prod, publicPath = '/node_modules', publicPath2 = '/assets', prodUrl }) {
  const output = {
    path: path.join(__dirname, 'dist/assets'),
    filename: 'app.js',
  };

  if (publicPath2) {
    output.publicPath = publicPath2;
  }

  const options = {
    modules: [
      { name: 'jasmine-spec-reporter', path: 'index.js' },
      { name: 'nyc', style: 'style.css', localStyle: 'local.css', localScript: 'local.js' },
      { name: 'jasmine', cdn: 'jasmine2', style: 'style.css' },
    ],
    prod,
    prodUrl,
  };

  if (publicPath) {
    options.publicPath = publicPath;
  }

  return {
    entry: path.join(__dirname, '../example/app.js'),
    output,
    plugins: [
      new HtmlWebpackPlugin({ filename: '../index.html' }),
      new WebpackCdnPlugin(options),
    ],
  };
}


describe('Webpack Integration', () => {
  describe('When `prod` is true', () => {
    describe('When `prodUrl` is default', () => {
      beforeAll((done) => {
        runWebpack(done, getConfig({ prod: true }));
      });

      it('should output the right assets (css)', () => {
        expect(cssAssets).toEqual([
          `/assets/local.css`,
          `//unpkg.com/nyc@${versions.nyc}/style.css`,
          `//unpkg.com/jasmine2@${versions.jasmine}/style.css`,
        ]);
      });

      it('should output the right assets (js)', () => {
        expect(jsAssets).toEqual([
          `/assets/local.js`,
          `//unpkg.com/jasmine-spec-reporter@${versions.jasmineSpecReporter}/index.js`,
          `//unpkg.com/nyc@${versions.nyc}/index.js`,
          `//unpkg.com/jasmine2@${versions.jasmine}/lib/jasmine.js`,
          '/assets/app.js',
        ]);
      });
    });

    describe('When `prodUrl` is set', () => {
      beforeAll((done) => {
        runWebpack(done, getConfig({ prod: true, prodUrl: '//cdnjs.cloudflare.com/ajax/libs/:name/:version/:path' }));
      });

      it('should output the right assets (css)', () => {
        expect(cssAssets).toEqual([
          `/assets/local.css`,
          `//cdnjs.cloudflare.com/ajax/libs/nyc/${versions.nyc}/style.css`,
          `//cdnjs.cloudflare.com/ajax/libs/jasmine2/${versions.jasmine}/style.css`,
        ]);
      });

      it('should output the right assets (js)', () => {
        expect(jsAssets).toEqual([
          `/assets/local.js`,
          `//cdnjs.cloudflare.com/ajax/libs/jasmine-spec-reporter/${versions.jasmineSpecReporter}/index.js`,
          `//cdnjs.cloudflare.com/ajax/libs/nyc/${versions.nyc}/index.js`,
          `//cdnjs.cloudflare.com/ajax/libs/jasmine2/${versions.jasmine}/lib/jasmine.js`,
          '/assets/app.js',
        ]);
      });
    });
  });

  describe('When `prod` is false', () => {
    describe('When `publicPath` is default', () => {
      beforeAll((done) => {
        runWebpack(done, getConfig({ prod: false, publicPath: null, publicPath2: null }));
      });

      it('should output the right assets (css)', () => {
        expect(cssAssets).toEqual([
          `/local.css`,
          '/nyc/style.css',
          '/jasmine/style.css',
        ]);
      });

      it('should output the right assets (js)', () => {
        expect(jsAssets).toEqual([
          `/local.js`,
          '/jasmine-spec-reporter/index.js',
          '/nyc/index.js',
          '/jasmine/lib/jasmine.js',
          '/app.js',
        ]);
      });
    });

    describe('When `publicPath` is `/`', () => {
      beforeAll((done) => {
        runWebpack(done, getConfig({ prod: false, publicPath: null, publicPath2: '/' }));
      });

      it('should output the right assets (css)', () => {
        expect(cssAssets).toEqual([
          `/local.css`,
          '/nyc/style.css',
          '/jasmine/style.css',
        ]);
      });

      it('should output the right assets (js)', () => {
        expect(jsAssets).toEqual([
          `/local.js`,
          '/jasmine-spec-reporter/index.js',
          '/nyc/index.js',
          '/jasmine/lib/jasmine.js',
          '/app.js',
        ]);
      });
    });

    describe('When `publicPath` is set', () => {
      beforeAll((done) => {
        runWebpack(done, getConfig({ prod: false }));
      });

      it('should output the right assets (css)', () => {
        expect(cssAssets).toEqual([
          `/assets/local.css`,
          '/node_modules/nyc/style.css',
          '/node_modules/jasmine/style.css',
        ]);
      });

      it('should output the right assets (js)', () => {
        expect(jsAssets).toEqual([
          `/assets/local.js`,
          '/node_modules/jasmine-spec-reporter/index.js',
          '/node_modules/nyc/index.js',
          '/node_modules/jasmine/lib/jasmine.js',
          '/assets/app.js',
        ]);
      });
    });
  });
});
