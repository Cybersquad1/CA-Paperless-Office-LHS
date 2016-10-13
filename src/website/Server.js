var debug = process.env.NODE_ENV === "development";

var fs = require("fs");
var express = require('express');
var app = express();

var UH = require('./UserHandler.js');
var EE = require('./ErrorEvent.js');
var UserHandler = new UH(debug);
if (debug) {
    console.log('Application is running in debug mode!');
}
UserHandler.Init(function (err) {
    if (err !== undefined) {
        console.error(err);
        throw err;
    }
    var Error = new EE('Server');
    app.get('/', function (req, res) {
        res.sendFile(__dirname + "/" + "index.html");
    });

    function Log(log) {
        if (Error !== undefined) {
            Error.HError(log);
        }
        else {
            console.log(log);
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


    var port = process.env.port || 80;
    app.listen(port, function () {
        Log('Server running on port ' + port);
    });
});