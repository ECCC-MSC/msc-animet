const { defineConfig } = require('@vue/cli-service')
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin")

module.exports = defineConfig({
  publicPath: process.env.NODE_ENV === 'production'
    ? process.env.BASE_URL
    : '/',
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      new NodePolyfillPlugin()
    ],
    resolve: {
      fallback: {
        "fs": false,
        "os": false,
        "path": false,
      }
    }
  }
})