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
const defaultHTMLFooter = `<h3><a href="${githubURL}">dangeredwolf http server ($PORT)</a></h3>`

function sanitisePathName(name) {
    return decodeURI(name.replace(/\/\.\./,"/").replace(/\/\//g,"/"));
}
function sanitiseEncodedPathName(name) {
    return encodeURI(name.replace(/\/\.\./,"/").replace(/\/\//g,"/"));
}

function sanitiseStringHTML(str) {
    return str.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/,"&quot;").replace(/\%20/," ")
}

function handleErrorPage(code, httpSrc, res) {
    res.writeHead(code, {'Content-Type': 'text/html'});
    fs.readFile("./err/"+code+".html", fsoptions, function(err, data) {
        if (err) {
            return res.end(
`${defaultHTML}
<h1>${code} ${httpCodes[code] || ""}</h1>
${defaultHTMLFooter.replace("$PORT",httpSrc)}`
            );
        }
        res.writeHead(code, {'Content-Type': 'text/html'});
        res.write(data);
        return res.end();
    });
}

function handleRequest(httpSrc, req, res) {
    let q;
    try {
        q = new URL(req.url, "file:///.");
    } catch(e) {
        if (e instanceof TypeError) {
            return handleErrorPage(400, httpSrc, res);
        } else {
            return handleErrorPage(500, httpSrc, res);
        }
    }
    console.log(q);
    let filename;
    try {
        filename = "./dir/" + sanitisePathName(q.pathname);
    } catch(e) {
        if (e instanceof URIError) {
            return handleErrorPage(400, httpSrc, res);
        } else {
            return handleErrorPage(500, httpSrc, res);
        }
    }
    try {
        fs.readdirSync(filename, fsoptions);
        fs.readdir(filename, fsoptions, function(err, data) {
            var matched = false;
            for (i in data) {
                if (data[i] === "index.js" && config.executeIndexJS) {
                    require(filename + "/" + data[i]).default(req, res);
                } else if (data[i].match("index.") !== null) {
                    matched = true;
                    fs.readFile(sanitiseEncodedPathName(filename + "/" + data[i]), fsoptions, function(err, data) {
                        if (err) {
                            console.log(err);
                            return handleErrorPage(404, httpSrc, res);
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
                html += `<a href="..">..</a><br>`
                for (i in data) {
                    html += `<a href=${encodeURI(sanitiseStringHTML(sanitisePathName(q.pathname + "/" + data[i])))}>${sanitiseStringHTML(data[i])}</a><br>`
                }
                html += defaultHTMLFooter.replace("$PORT", httpSrc);
                res.end(html);
            } else if (!matched) {
                return handleErrorPage(404, httpSrc, res);
            }
        });
    } catch (e) {
        console.log(e);
        fs.readFile(filename, fsoptions, function(err, data) {
            if (err) {
                return handleErrorPage(404, httpSrc, res);
            }
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(data);
            return res.end();
        });
    }

}

function requestWrapper(httpSrc, req, res) {
    try {
        handleRequest(httpSrc, req, res);
    } catch(e) {
        return handleErrorPage(500, httpSrc, res);
    }
}

try {
    config.key = fs.readFileSync("privkey.pem")
} catch(e) {
    
}

http.createServer(options, (...args) => {requestWrapper("http:80",...args)}).listen(80);
http2.createSecureServer(options, (...args) => {requestWrapper("http/2:443",...args)}).listen(443);
