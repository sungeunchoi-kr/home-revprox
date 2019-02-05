const http = require('http');
const https = require('https');
const httpProxy = require('http-proxy');
const net = require('net');
const fs = require('fs');

const BASE_ADDR = 8080;
const PROXY_ADDR = 8079;
const REDIRECT_ADDR = 8078;

const httpsOptions = {
    key: fs.readFileSync('/etc/letsencrypt/live/home.sungeunchoi.com/privkey.pem', 'utf8'),
    cert: fs.readFileSync('/etc/letsencrypt/live/home.sungeunchoi.com/fullchain.pem', 'utf8'),
    ca: fs.readFileSync('/etc/letsencrypt/live/home.sungeunchoi.com/chain.pem', 'utf8')
};

//
// Create a proxy server with custom application logic
//
var proxy = httpProxy.createProxyServer({});

//
// Create server that will pipe https and http traffic to appropriate servers.
//
net.createServer(function(conn) {
    conn.once('data', function (buf) {
        // A TLS handshake record starts with byte 22.
        var address = (buf[0] === 22) ? PROXY_ADDR : REDIRECT_ADDR;
        var proxy = net.createConnection(address, function () {
            proxy.write(buf);
            conn.pipe(proxy).pipe(conn);
        });
    });
}).listen(BASE_ADDR);

//
// Http server. Serves http subdomains.
//
http.createServer(function(req, res) {
    var fullhost = req.headers.host || '';
    var subdomain = fullhost.split('sungeunchoi.com')[0].slice(0, -1);

    //console.log('subdomain=' + subdomain);

    if (subdomain === 'wastebook') {
        proxy.web(req, res, {
            target: 'http://127.0.0.1:8089'
        });
    } else if (subdomain === 'home') {
        res.writeHead(302, {
            'Location': 'https://home.sungeunchoi.com:8080' + req.url
        });
        res.end();
    }
}).listen(REDIRECT_ADDR);

//
// Https server. Serves https subdomains.
//
https.createServer(httpsOptions, function(req, res) {
    proxy.web(req, res, {
        target: 'https://127.0.0.1:8088'
    });
}).listen(PROXY_ADDR);

