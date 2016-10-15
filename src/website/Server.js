var fs = require("fs");
var express = require('express');
var bodyparser = require('body-parser');
var app = express();

app.use(bodyparser.json());

var debug = true;

app.get('/', function (req, res) {
    res.sendFile(__dirname + "/" + "index.html");
});

app.use(function(req,res,next){
    res.header("Acces-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    next();
});

function Log(err) {
    console.log(err);
}

app.post("/register",function (req, res) {
    console.log("----------------body--------------");
    var name = req.body.Name;
    var pass = req.body.Password;
    //console.log(req);
    //var answer = req;
    console.log(name +" - " + pass);
    console.log("----------------------------------");
    res.send();
});

app.get("/login", function (req, res) {
    var name = req.body.Name;
    var pass = req.body.Password;

});

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
PublishDir("/images");

if(debug){
    PublishDir("/Debug");
}


app.listen(80, function () {
    console.log('Example app listening on port 80!');
});