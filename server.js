var http = require("http");
var https = require("https");
var http2 = require("http2");
var url = require("url");
var fs = require("fs");

function handleRequest(req, res) {
  var q = url.parse(req.url, true);
  console.log(q);
  var filename = "." + q.pathname;
  fs.readFile(filename, function(err, data) {
    if (err) {
      res.writeHead(404, {'Content-Type': 'text/html'});
      return res.end("404 Not Found");
    }
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    return res.end();
  });
}

http.createServer(handleRequest).listen(80);
http2.createServer(handleRequest).listen(443);
