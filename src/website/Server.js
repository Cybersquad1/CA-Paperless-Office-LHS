var debug = process.env.NODE_ENV === "development";
var fs = require("fs");
var express = require('express');
var bodyparser = require('body-parser');
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

    app.use(bodyparser.json());

    app.use(function (req, res, next) {
        res.header("Acces-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
        next();
    });

    app.get("/getuser", function (req, res) {
        UserHandler.GetUserFromSession(req.session, function (match, user) {
            if (match) {
                var cleanuser = user;
                delete cleanuser.password;
                res.json({
                    "loggedin": true,
                    "user": cleanuser
                });
            }
            else {
                res.json({ "loggedin": false });
            }
        });
    });

    app.post("/register", function (req, res) {
        var name = req.body.username;
        var pass = req.body.password;
        var email = req.body.email;
        var response;
        UserHandler.Register(name, pass, email, function (registered, error) {
            if (registered) {
                response = { "registered": registered };
                // todo: change sessionuser in UserHandler
            }
            else {
                response = {
                    "registered": registered,
                    "error": error
                };
            }
            res.send(response);
        });
    });

    app.post("/login", function (req, res) {
        var name = req.body.username;
        var pass = req.body.password;
        var response;
        UserHandler.Login(name, pass, function (loggedin, user) {
            if (loggedin) {
                response = {
                    "loggedin": loggedin,
                    "user": user
                };
                // todo: change sessionuser in UserHandler
            }
            else {
                response = {
                    "loggedin": loggedin,
                    "error": user
                };
            }
            res.send(response);
        });

    });

    app.get('/', function (req, res) {
        res.sendFile(__dirname + "/" + "index.html");
    });

    PublishDir("/js");
    PublishDir("/css");
    PublishDir("/fonts");
    PublishDir("/images");
    if (debug) {
        PublishDir("/Debug");
    }

    var port = process.env.port || 80;
    app.listen(port, function () {
        Log('Server running on port ' + port);
    });
});