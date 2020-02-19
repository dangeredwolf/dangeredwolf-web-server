exports.default = ((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write("Hello world!");
    return res.end();
});
