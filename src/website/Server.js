var debug = process.env.NODE_ENV === "development";
//var debug = true;
var fs = require("fs");
var express = require('express');
var bodyparser = require('body-parser');
var app = express();

var UH = require('./UserHandler.js');
var EE = require('./ErrorEvent.js');
var UserHandler = new UH(debug);

app.use(bodyparser.json());

app.use(function(req,res,next){
    res.header("Acces-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    next();
});

app.post("/register",function (req, res) {
    
    var name = req.body.Name;
    var pass = req.body.Password;
    var email = req.body.Email;
    UH.Register(name,pass,email,function callback(registered,error){
        if(registered){
            response= {registered: registered};
        }
        else{
            response = {registered: registered, error: error};
        }
    })
    /*console.log("----------------body--------------");
    //console.log(req);
    //var answer = req;
    console.log(name +" - " + pass);
    console.log("----------------------------------");*/
    
    res.send(response);
});

app.get("/login", function (req, res) {
    var name = req.body.Name;
    var pass = req.body.Password;    
    UH.Login(name,pass,function callback(loggedin, user){
        if(loggedin){
            var response = {loggedin: loggedin, user: user};
        }
        else{
            var response = {loggedin: loggedin, error: user};
        }            
    });
    res.send(response);
});

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
/*
function Log(err) {
    console.log(err);    
*/
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
    if(debug){
        PublishDir("/Debug");
    }

    var port = process.env.port || 80;
    app.listen(port, function () {
        Log('Server running on port ' + port);
    });
});