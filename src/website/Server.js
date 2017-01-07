var debug = process.env.NODE_ENV === "development";
var fs = require("fs");
var express = require('express');
var bodyparser = require('body-parser');
var app = express();

var api = require('project-oxford-ocr-api');
var request = require('request');
var apikey = require('./ApiKey.json');

var multiparty = require("multiparty");

var UH = require('./UserHandler.js');
var EE = require('./ErrorEvent.js');
var UserHandler = new UH(debug);

var helmet = require('helmet');

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

    //https

    if (!debug) {
        app.use(function (req, res, next) {
            var isAzure = req.get('x-site-deployment-id');
            var isSsl = req.get('x-arr-ssl');

            if (isAzure && !isSsl) {
                return res.redirect('https://' + req.get('host') + req.url);
            }

            return next();
        });

        app.use(helmet.hsts({
            "maxAge": 10886400000,     // Must be at least 18 weeks to be approved by Google
            "includeSubdomains": true, // Must be enabled to be approved by Google
            "preload": true
        }));
    }

    app.use(bodyparser.json());

    api.API_KEY = apikey.api_key_cv;

    app.get("/getuser", function (req, res) {
        UserHandler.GetUserFromSession(req.session, function (match, user) {
            if (match) {
                res.json({
                    "loggedin": true,
                    "user": user
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
    app.get('/detailview.html', function (req, res) {
        res.sendFile(__dirname + "/" + "detailview.html");
    });

    app.post("/upload", function (req, res) {
        var form = new multiparty.Form();
        var file, id;

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
            if (fields.date === undefined) {
                res.json({ "success": false, "error": "No date supplied" });
            }
            var str = fs.createReadStream(file.path);
            str.size = file.size;
            str.originalFilename = file.originalFilename;
            var data = { "stream": str, "filename": fields.document[0], "date": fields.date };
            UserHandler.Upload(req.session, data, id, documentid, function (success, idOrError, fileid) {
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

    app.post('/getdocuments', function (req, res) {
        UserHandler.GetDocuments(req.session, req.body.userid, req.body.filter, function (match, result) {
            var response;
            if (match) {
                response = {
                    "match": match,
                    "documents": result
                };
            }
            else {
                response = {
                    "match": match,
                    "error": result
                };
            }
            res.json(response);
        });
    });

    app.post('/getdetaildocument', function (req, res) {
        UserHandler.GetDetailDocument(req.session, req.body.userid, req.body.document, function (match, result) {
            var response;
            if (match) {
                UserHandler.GetTags(req.session, req.body.userid, undefined, function (m, rs) {
                    if (m) {
                        response = {
                            "match": match,
                            "document": result[0],
                            "tags": rs
                        };
                    }
                    else {
                        response = {
                            "match": match,
                            "document": result[0],
                            "tags": []
                        };
                    }
                    UserHandler.GetFiles(req.session, req.body.userid, req.body.document, function (ma, r) {
                        response.files = r;
                        res.json(response);
                    });
                });
            }
            else {
                response = {
                    "match": match,
                    "error": result
                };
            }
        });
    });

    app.post('/addtag', function (req, res) {
        UserHandler.AddTag(req.session, req.body.name, req.body.color, req.body.userid, function (match, result) {
            res.json({
                "match": match,
                "result": result
            });
        });
    });

    app.post('/addtagtodocument', function (req, res) {
        UserHandler.AddTagToDocument(req.session, req.body.document, req.body.tag, req.body.userid, function (match, result) {
            res.json({
                "match": match,
                "result": result
            });
        });
    });

    app.get('/download', function (req, res) {
        if (!req.query || !req.query.userid || !req.query.documentid || !req.query.fileid) {
            res.end("File not found");
            return;
        }
        var userid = Number(req.query.userid);
        var documentid = Number(req.query.documentid);
        var fileid = Number(req.query.fileid);
        UserHandler.Download(req.session, userid, documentid, fileid, function (match, stream, name) {
            if (match) {
                res.set('Content-disposition', 'attachment; filename=' + name);
                stream.pipe(res);
            }
            else {
                res.json({
                    "match": match,
                    "error": stream
                });
            }
        });
    });

    app.post('/deletefiles', function (req, res) {
        UserHandler.DeleteFiles(req.session, req.body.userid, req.body.document, function (match, result) {
            res.json({
                "match": match,
                "result": result
            });
        });
    });

    app.post('/updatecontent', function (req, res) {
        UserHandler.UpdateContent(req.session, req.body.userid, req.body.document, req.body.content, function (match, result) {
            res.json({
                "match": match,
                "result": result
            });
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