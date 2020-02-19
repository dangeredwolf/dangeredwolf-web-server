const http = require("http");
const https = require("https");
const http2 = require("http2");
const url = require("url");
const fs = require("fs");
const {httpCodes, githubURL} = require("./constants.js");
const {config} = require("./config.js");

const options = {};
const fsoptions = {};
const defaultHTML = `<!doctype html>
<html>
<head>
<style>
${config.style}
</style>
</head>
<body>`;
const defaultHTMLFooter = `<h3><a href="${githubURL}">dangeredwolf http server</a></h3>`

function sanitisePathName(name) {
    return decodeURI(name.replace(/\/\.\./,"/").replace(/\/\//g,"/"));
}
function sanitiseEncodedPathName(name) {
    return encodeURI(name.replace(/\/\.\./,"/").replace(/\/\//g,"/"));
}

function sanitiseStringHTML(str) {
    return str.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/,"&quot;")
}

function handleErrorPage(code, res) {
    res.writeHead(code, {'Content-Type': 'text/html'});
    fs.readFile("./err/"+code+".html", fsoptions, function(err, data) {
        if (err) {
            return res.end(
`${defaultHTML}
<h1>${code} ${httpCodes[code] || ""}</h1>
${defaultHTMLFooter}`
            );
        }
        res.writeHead(code, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
    });
}

function handleRequest(req, res) {
    let q;
    try {
        q = new URL(req.url, "file:///.");
    } catch(e) {
        if (e instanceof TypeError) {
            return handleErrorPage(400, res);
        } else {
            return handleErrorPage(500, res);
        }
    }
    console.log(q);
    let filename;
    try {
        filename = "./dir/" + sanitisePathName(q.pathname);
    } catch(e) {
        if (e instanceof URIError) {
            return handleErrorPage(400, res);
        } else {
            return handleErrorPage(500, res);
        }
    }
    try {
        fs.readdirSync(filename, fsoptions);
        fs.readdir(filename, fsoptions, function(err, data) {
            var matched = false;
            for (i in data) {
                if (data[i] === "index.js") {
                    require(filename + "/" + data[i]).default(req, res);
                } else if (data[i].match("index.") !== null) {
                    matched = true;
                    fs.readFile(sanitiseEncodedPathName(filename + "/" + data[i]), fsoptions, function(err, data) {
                        if (err) {
                            console.log(err);
                            return handleErrorPage(404, res);
                        }
                        res.setHead("Server","dangeredwolf-node")
                        res.writeHead(200, {'Content-Type': 'text/html'});
                        res.write(data);
                        return res.end();
                    });
                }
            }
            console.log(matched);
            if (!matched && config.directoryTraversal) {

                let html = defaultHTML;
                html += `<h1>${sanitiseStringHTML(q.pathname)}</h1>`
                for (i in data) {
                    html += `<a href=${sanitiseStringHTML(sanitiseEncodedPathName(q.pathname + "/" + data[i]))}>${sanitiseStringHTML(data[i])}</a><br>`
                }
                html += defaultHTMLFooter;
                res.end(html);
            } else if (!matched) {
                return handleErrorPage(404, res);
            }
        });
    } catch (e) {
        console.log(e);
        fs.readFile(filename, fsoptions, function(err, data) {
            if (err) {
                return handleErrorPage(404, res);
            }
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(data);
            return res.end();
        });
    }

}

function requestWrapper(req, res) {
    try {
        handleRequest(req, res);
    } catch(e) {
        return handleErrorPage(500, res);
    }
}

http.createServer(options, handleRequest).listen(80);
http2.createServer(options, handleRequest).listen(443);
