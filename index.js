var hyperdrive = require('hyperdrive')
var mirror = require('mirror-folder')
var http = require('http')
var serve = require('hyperdrive-http')
var discovery = require('hyperdiscovery')
var minimist = require('minimist')
var ws = require('websocket-stream')

var argv = minimist(process.argv)
var archive = null
var key = argv._[2]
var folder = argv.folder || './p2phls'

if (key) {
  archive = hyperdrive(folder, key, {sparse: true})
} else {
  archive = hyperdrive(folder)
  mirror('./data', {name: '/', fs: archive}, {watch: true})
}

var wss = ws.createServer({port: 20000}, handle)

function handle(stream) {
  var s = archive.replicate({live: true, encrypt: false})
  s.pipe(stream).pipe(s)
  s.on('error', console.error)
}

archive.on('ready', function () {
  console.log('p2p key:', archive.key.toString('hex'))
  var server = http.createServer(serve(archive))
  server.listen(argv.port || 10000)
  discovery(archive, {live: true}).on('connection', function (c,info) {
    console.log('onconnection', info)
  })
})
