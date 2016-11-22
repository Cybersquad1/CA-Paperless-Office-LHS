var debug = process.env.NODE_ENV === "development";
var fs = require("fs");
var express = require('express');
var bodyparser = require('body-parser');
var app = express();

var multiparty = require("multiparty");

var UH = require('./UserHandler.js');
var EE = require('./ErrorEvent.js');
var UserHandler = new UH(debug);

if (debug) {
    console.log('Application is running in debug mode!');
}

UserHandler.Init(app, function (err) {
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

    app.get("/logout", function (req, res) {
        UserHandler.SetSessionUser(req.session, null);
        res.json({ "logout": "done", "loggedin": false });
    });

    app.post("/register", function (req, res) {
        var name = req.body.username;
        var pass = req.body.password;
        var email = req.body.email;
        var response;
        UserHandler.Register(name, pass, email, function (registered, errorOrUser) {
            if (registered) {
                response = {
                    "registered": registered,
                    "user": errorOrUser,
                    "loggedin": registered
                };
                UserHandler.SetSessionUser(req.session, errorOrUser);
            }
            else {
                response = {
                    "registered": registered,
                    "error": errorOrUser,
                    "loggedin": registered
                };
            }
            res.json(response);
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
                UserHandler.SetSessionUser(req.session, user);
            }
            else {
                response = {
                    "loggedin": loggedin,
                    "error": user
                };
            }
            res.json(response);
        });

    });

    app.get('/', function (req, res) {
        res.sendFile(__dirname + "/" + "index.html");
    });
    app.get('/main.html', function (req, res) {
        res.sendFile(__dirname + "/" + "main.html");
    });
    app.get('/index.html', function (req, res) {
        res.sendFile(__dirname + "/" + "index.html");
    });
    app.get('/FileOverview.html', function (req, res) {
        res.sendFile(__dirname + "/" + "FileOverview.html");
    });
    app.get('/paymentplan.html', function (req, res) {
        res.sendFile(__dirname + "/" + "paymentplan.html");
    });


    app.post("/upload", function (req, res) {
        var form = new multiparty.Form();
        var id, file;

        /*form.on('part', function (part) {

            partstream = part;
            if (!part.filename) return;
            var size = part.byteCount;
            var name = part.filename;
            console.log(part);
            console.log("size:" + size + " Filename:" + name);
            UserHandler.Upload(req.session, part,id, function (success, err) {
                if (!success) {
                    console.log(err);
                }
            });

        });
        form.on("field", function (name, value) {
            var id = value
            console.log("name: " + name + ", value: " + value)
        });   
        form.parse(req);
        */

        form.parse(req, function (error, fields, files) {
            if (error) {
                console.error(error.message);
                return;
            }
            // console.log(req.data);
            // console.log(fields);
            id = Number(fields.id[0]);
            file = files.file[0];
            // console.log(files);
            // console.log(typeof id);
            // console.log(Number(id));
            // console.log(id);
            var documentid;
            if (fields.documentid !== undefined) {
                documentid = Number(fields.documentid[0]);
            }
            if (fields.document === undefined) {
                res.json({ "success": false, "error": "No name supplied" });
            }
            var str = fs.createReadStream(file.path);
            str.filename = fields.document[0];
            str.size = file.size;
            str.originalFilename = file.originalFilename;
            UserHandler.Upload(req.session, str, id, documentid, function (success, idOrError, fileid) {
                if (success) {
                    console.log("Uploaded: " + file.originalFilename + ":" + file.size);
                    res.json({ "success": success, "document": idOrError, "file": fileid });
                }
                else {
                    console.log("Failed: " + file.originalFilename + ":" + file.size);
                    res.json({ "success": success, "error": idOrError });
                }
                fs.unlinkSync(file.path);
            });
        });



    });

    app.get('/download', function (req, res) {
        UserHandler.Download(5, function (stream) {
            res.set('Content-disposition', 'attachment; filename=' + 'name.jpg');
            stream.pipe(res);
        });
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