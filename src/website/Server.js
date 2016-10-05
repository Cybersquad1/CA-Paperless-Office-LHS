var fs = require("fs");
var express = require('express');
var app = express();

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/" + "index.html");
});

function Log(err) {
    console.log(err);
}

function PublishDir(dir) {
    if (fs.statSync(__dirname + dir).isDirectory()) {
        app.get(dir + "/*", function (req, res) {
            if (fs.existsSync(__dirname + req.path)) {
                res.sendFile(__dirname + req.path);
            }
        });
        return;
    }
    Log("ERROR: FAILED!");
}

PublishDir("/js");
PublishDir("/css");
PublishDir("/fonts");



app.listen(80, function () {
    console.log('Example app listening on port 3000!');
});