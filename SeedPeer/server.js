'use strict';
var http = require('http');
var port = process.env.PORT || 1337;
var fileStream = require('./FileStream');
var playlistUrl = 'http://drevent-lh.akamaihd.net/i/event12_0@427365/master.m3u8';

console.log('Starting server...');

fileStream.Get(playlistUrl)


// http.createServer(function (req, res) {
//     res.writeHead(200, { 'Content-Type': 'text/plain' });

//     res.end();

// }).listen(port);
