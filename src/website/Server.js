var fs = require("fs");
var express = require('express');
var app = express();

var UH = require('./UserHandler');
var UserHandler = new UH();
UserHandler.Init(function() {
    
});
var EE = require('./ErrorEvent');
var Error = new EE('Server');

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/" + "index.html");
});

function Log(err) {
    if (Error !== undefined) {
        Error.HError(err);
    }
    else {
        console.log(err);
    }
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
    Log('Server running on port 80');
});