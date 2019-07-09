const path = require('path');
const webpack = require('webpack');
const uglifyJsPlugin = require('uglifyjs-webpack-plugin');
module.exports = {
    entry: './index.js',
    output: {
        library: 'SSOConector',
        libraryTarget: 'umd',
        libraryExport: 'default',
        path: path.resolve(__dirname, 'dist'),
        filename: 'index.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: ['babel-loader']
            }
        ]
    },
    plugins: [
        new uglifyJsPlugin(),        
        new webpack.HotModuleReplacementPlugin(),
    ]
};