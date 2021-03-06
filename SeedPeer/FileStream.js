var request = require('request');
var url = require('url');
var mkdirp = require('mkdirp');
var path = require('path');
var hyperdrive = require('hyperdrive')
var discovery = require('hyperdiscovery')
var serve = require('hyperdrive-http')
var http = require('http')
var ws = require('websocket-stream')
var pump = require('pump')

var fs = hyperdrive('./data.drive')
// var playlistUrl = 'http://drevent-lh.akamaihd.net/i/event12_0@427365/master.m3u8';
var playlistUrl = 'http://dr02-lh.akamaihd.net/i/dr02_0@147055/master.m3u8?b=100-3000'

crawl(playlistUrl,
    function loop () {
        setTimeout(function() {
            crawl(playlistUrl, loop)
        }, 3000)
    });

fs.on('ready', function () {
  console.log(fs.key.toString('hex'))
  var server = http.createServer(serve(fs))
  server.listen(10000)
  discovery(fs, {live: true})

    if (process.argv.indexOf('--ssl') > -1) {
        var f = require('fs')
        var server = require('https').createServer({
            key: f.readFileSync('/etc/letsencrypt/live/hasselhoff.mafintosh.com/privkey.pem'),
            cert: f.readFileSync('/etc/letsencrypt/live/hasselhoff.mafintosh.com/fullchain.pem')
        })
        server.listen(30000)
        ws.createServer({server: server}, handle)
    } else {
        ws.createServer({port: 30000}, handle)
    }

    function handle(stream) {
      var s = fs.replicate({live: true, encrypt: false})
      pump(s, stream, s)
    }

})

// fs.readdir('/data/', console.log)

//================
//public functions
//=================
// module.exports = {
//     Get: function (playlistUrl) {
//     }
// };



//==================
//Private functions
//==================



function crawl(url, cb) {
    var pls = {}

    visit({ url: url, playlist: true }, function (err) {
        if (err) return cb(err)

        var files = Object.keys(pls)
        loop()

        function loop (err) {
            if (err) return cb(err)
            var name = files.shift()
            if (!name) return cb(null)
            fs.writeFile(name, pls[name], loop)
        }
    });

    function visit(opts, cb) {
        requestAndWrite(opts.url, pls, function (err, body) {
            if (err) return cb(err)
            if (!opts.playlist) return cb(null)

            var res = ParseURLs(body, opts.url)
            var pending = 5
            var error = null

            loop(null)
            loop(null)
            loop(null)
            loop(null)
            loop(null)

            function loop(err) {
                if (err) error = err
                if (res.length) return visit(res.shift(), loop)
                if (!--pending) cb(error)
            }
        })
    }
}

function requestAndWrite(url, pls, cb) {
    var filename = ParseFilename(url)

    console.log(url + ' --> ' + filename)

    fs.readFile(filename, function (_, body) {
        if (body && filename.endsWith('ts')) return cb(null, body) //do not cache playlists
        // mkdirp(path.dirname(filename), function (err) {
            // if (err) return cb(err)
            request(url, { encoding: null, jar: true }, function (err, res, body) {
                if (err) return cb(err)
                if (res.statusCode !== 200) return cb(new Error('Bad status: ' + res.statusCode))

                if (filename.endsWith('m3u8')) {
                    body = body.toString().replace(/http:\/\/drevent-lh\.akamaihd\.net\/i\/event12_0@427365\//g, "");
                    body = body.replace(/http:\/\/dr02-lh\.akamaihd\.net\/i\/dr02_0@147055\//g, "")
                    body = body.replace(/\?.+/g, '')
                }

                fs.readFile(filename, function (_, old) {
                    if (old && typeof body === 'string' && old.toString() === body) return cb(null, body)

                    if (filename.endsWith('m3u8')) {
                        pls[filename] = body
                        return cb(null, body)
                    } else {
                        fs.writeFile(filename, body, function (err) {
                            if (err) return cb(err)
                            cb(null, body)
                        })
                    }
                })
                //     if (err) return cb(err)
                //     fs.rename(filename + '.tmp', filename, function (err) {
                //         if (err) return cb(err)
                //         cb(null, body)
                //     })
                // })
            })
        // })
    })
}

function ParseFilename(u) {
    return '/' + u.split('/').slice(2).join('/').split('?')[0].replace().split('/').pop()
}

function ParseURLs(body, baseUrl) {
    return body.toString().trim().split('\n')
        .map(function (line) {
            line = line.trim()
            if (line[0] === '#') return (line.match(/URI="([^"]+)"/) || [])[1]
            return line
        })
        .filter(function (line) {
            return line
        })
        .map(function (u) {
            return {
                playlist: /\.m3u8$/.test(u.split('?')[0]),
                name: u,
                url: url.resolve(baseUrl, u)
            }
        })
}
