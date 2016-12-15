/**
 * Created by levi_ on 7/10/2016.
 */

var EE = require('./ErrorEvent.js');
var DB = require('./DBTools.js');
var Eh = require("./ErrorHandler.js");
var sql = require('mssql');
var dbconfig = require('./DBCredentials.json');
var sessionsecret = require('./SessionSecret.json');
var Exsession = require('express-session');
var MSSQLStore = require('connect-mssql')(Exsession);
var azure = require('azure-storage');
var azureconfig = require('./azure.json');
var blobSvc = azure.createBlobService(azureconfig.connectionstring);
var crypto = require('crypto');
var request = require('request');
var apikey = require('./ApiKey.json');
var fs = require('fs');

/**
 * @constructor
 * @param {bool} debug enable for development mode
 */
module.exports = function (debug) {
    var ErrorEvent = new EE('UserHandler');
    var db = new DB();
    db.ErrorEvent.SetOnError(ErrorEvent.HError);
    var UserHandler = this;
    this.Init = function (app, initCallback) {

        ConnectDataBase();

        function ConnectDataBase() {
            sql.connect(dbconfig, function (err) {
                // ... error checks
                if (err !== undefined && err !== null) {
                    console.error(err); // can't log to errorhandling because database isn't connected :p
                    throw err;
                }
                db.Exists(sql, 'sessions',
                    'CREATE TABLE [dbo].[sessions]([sid] [varchar](255) NOT NULL PRIMARY KEY,[session] [varchar](max) NOT NULL,[expires] [datetime] NOT NULL)',
                    'DELETE FROM sessions WHERE expires < getdate();',
                    function (error) {
                        if (error !== undefined) {
                            initCallback(error);
                            return;
                        }
                        SetupErrorHandler();
                    });
            });

            sql.on('error', function (err) {
                ErrorEvent.HError(err, 'DatabaseError');
            });
        }

        function SetupErrorHandler() {
            UserHandler.ErrorHandler = new Eh(sql, 0, debug);
            ErrorEvent.SetOnError(UserHandler.ErrorHandler.HError);
            CheckUserTable();
        }

        function CheckUserTable() {
            db.Exists(sql,
                'users',
                'CREATE TABLE users([id] int IDENTITY(1,1) PRIMARY KEY, email varchar(255), username varchar(255), password varchar(255), salt varchar(255), totalebestanden int, groottebestanden int, dataplan tinyint);', undefined,
                function (err) {
                    if (err !== undefined) {
                        initCallback(err);
                        return;
                    }
                    CheckDocumentTable();
                });
        }

        function CheckDocumentTable() {
            db.Exists(sql,
                'documents',
                'CREATE TABLE documents([id] int IDENTITY(1,1) PRIMARY KEY, name varchar(255), userid INT, date DATETIME, content varchar(1000));', undefined,
                function (err) {
                    if (err !== undefined) {
                        initCallback(err);
                        return;
                    }
                    CheckFileTable();
                });
        }

        function CheckFileTable() {
            db.Exists(sql,
                'files',
                'CREATE TABLE files([id] int IDENTITY(1,1) PRIMARY KEY, document int, type int, name varchar(255), size int);', undefined,
                function (err) {
                    if (err !== undefined) {
                        initCallback(err);
                        return;
                    }
                    CheckTagTable();
                });
        }

        function CheckTagTable() {
            db.Exists(sql,
                'tags',
                'CREATE TABLE tags([id] int IDENTITY(1,1) PRIMARY KEY, tag varchar(255), color varchar(255), userid INT);', undefined,
                function (err) {
                    if (err !== undefined) {
                        initCallback(err);
                        return;
                    }
                    CheckTagLinkedTable();
                });
        }

        function CheckTagLinkedTable() {
            db.Exists(sql,
                'linked',
                'CREATE TABLE linked([id] int IDENTITY(1,1) PRIMARY KEY, documentid int, tagid int);', undefined,
                function (err) {
                    if (err !== undefined) {
                        initCallback(err);
                        return;
                    }
                    CheckContainer();
                });
        }

        function CheckContainer() {
            blobSvc.createContainerIfNotExists('paperless', function (error, result, response) {
                if (!error) {
                    // Container exists and is private
                    CreateSessions();
                }
            });
        }

        function CreateSessions() {
            app.use(Exsession({
                "resave": false,
                "saveUninitialized": false,
                "secret": sessionsecret.secret,
                "store": new MSSQLStore(dbconfig) // options are optional
            }));
            initCallback();
        }

        function CheckString(value, name) {
            if (value.length < 5) {
                return { "error": name + " has a minimum of 5 characters." };
            }
            if (value.length > 200) {
                return { "error": name + " has a maximum of 200 characters." };
            }
            var match = value.match(/^[0-9,\+-@_.A-Za-z ]+$/);
            if (match === null || match === undefined) {
                return { "error": name + " contains illegal characters. Only letters, numbers, spaces and +-_\\@. are allowed." };
            }
        }

        function createDocument(name, userid, date, callback) {
            var document = {
                "name": name,
                "userid": userid,
                "date": date
            };
            db.InsertObject(sql, 'documents', document, function (match, recordset) {
                if (!match || recordset.length < 1) {
                    callback(false, "Data not found");
                    return;
                }
                callback(true, recordset[recordset.length - 1].id);
                return;
            }, { "inserted": "id" });
        }

        function GetTags(userid, documentid, callback) {
            var options = { "select": "*", "table": "tags", "equals": [{ "userid": userid }] };
            if (documentid) {
                options.join = { "table": "linked", "on": ["tags.id", "linked.tagid"] };
                options.equals.push({ "documentid": documentid });
            }
            db.QueryObject(sql, options, callback);
            //db.Query(sql, "SELECT tag,color FROM linked INNER JOIN tags ON linked.tagid=tags.id WHERE linked.documentid = @did;", { "did": documentid }, callback);
        }

        this.GetTags = function (session, userid, documentid, callback) {
            if (this.GetIdFromSession(session) !== userid || userid === -1) {
                callback(false, "User id's not the same");
                return;
            }
            GetTags(userid, documentid, callback);
        }

        function AddTag(name, color, userid, callback) {
            var tag = {
                "tag": name,
                "color": color,
                "userid": userid
            };
            db.QueryObject(sql, { "insert": tag, "table": "tags" }, callback);
        }

        this.AddTag = function (session, name, color, userid, callback) {
            if (this.GetIdFromSession(session) != userid) {
                callback(false, "User id's not the same");
                return;
            }
            AddTag(name, color, userid, callback);
        }

        function AddTagToDocument(documentid, tagid, callback) {
            var tag = {
                "documentid": documentid,
                "tagid": tagid
            };
            db.QueryObject(sql, { "insert": tag, "table": "linked" }, callback);
        }

        this.AddTagToDocument = function (session, documentid, tagid, userid, callback) {
            if (this.GetIdFromSession(session) != userid) {
                callback(false, "User id's not the same");
                return;
            }
            AddTagToDocument(documentid, tagid, callback);
        }

        function getDocument(object, callback) {
            var row = object.row || 0;
            var options = { "sort": 'id', "limit": { "low": ((row - 1) * 20) + 1, "high": row * 20 }, "join": [], "equals": [], "like": [], "between": [], "distinct": true, "select": "documents.date,documents.id,documents.name", "table": "documents", "sort": "documents.id" };
            if (!object.userid) {
                callback(false, "No userid");
            }
            options.equals.push({ "documents.userid": object.userid });
            if (object.name) {
                options.like.push({ "name": object.name });
            }
            if (object.tag) {
                options.join.push({ "table": "linked", "on": ["linked.documentid", "documents.id"] });
                options.join.push({ "table": "tags", "on": ["linked.tagid", "tags.id"] });
                options.equals.push({ "tag": object.tag });
            }
            if (object.date) {
                options.between.push({ "date": [new Date(object.date.from), new Date(object.date.to)] });
            }
            if (object.content) {
                options.like.push({ "content": object.content });
            }
            db.QueryObject(sql, options, function (match, recordset) {
                if (!match) {
                    callback(false, "Data not found");
                    return;
                }
                var length = recordset.length;
                var done = 0;
                for (let i = 0; i < length; i++) {
                    delete recordset[i].RowNumber;
                    GetTags(object.userid, recordset[i].id, function (mmm, rs) {
                        if (mmm) {
                            recordset[i].tags = rs;
                        }
                        else {
                            recordset[i].tags = [];
                        }
                        done++;
                        if (done === length) {
                            callback(true, recordset);
                            return;
                        }
                    });
                }
            });
        }

        function GetDetailDocument(userid, documentid, callback) {
            db.QueryObject(sql, { "equals": { "userid": userid, "id": documentid }, "select": "documents.*", "table": "documents" }, function (match, recordset) {
                if (!match || recordset.length !== 1) {
                    callback(false, "Data not found");
                    return;
                }
                GetTags(userid, recordset[0].id, function (mmm, rs) {
                    if (mmm) {
                        recordset[0].tags = rs;
                    }
                    else {
                        recordset[0].tags = [];
                    }
                    callback(true, recordset);
                    return;
                });
            });
        }

        function checkDocument(userid, documentid, callback) {
            db.QueryObject(sql, { "equals": { "userid": userid, "id": documentid }, "select": "documents.*", "table": "documents" }, function (match, recordset) {
                if (!match || recordset.length !== 1) {
                    callback(false);
                    return;
                }
                callback(true, recordset[0]);
            });
        }

        function createFile(document, type, name, size, callback) {
            var file = {
                "document": document,
                "type": type,
                "name": name,
                "size": size
            };
            db.InsertObject(sql, 'files', file, function (success, result) {
                if (!success || result.length < 1) {
                    callback(false, "Database query failed");
                    return;
                }
                callback(true, result[0].id);
            }, { "inserted": "id" });
        }

        /**
         * Gets The user if logged in with a session
         * @returns {void}
         * @param {object} session the session from request
         * @param {function} callback gets called with ({bool}matchfound, {user}user)
         */
        this.GetUserFromSession = function (session, callback) {
            if (session.user && session.user.id && session.user.loggedin) {
                db.MatchObject(sql, 'users', { 'id': session.user.id }, function (match, users) {
                    var user;
                    if (match) {
                        user = users[0];
                        delete user.password;
                        delete user.salt;
                    }
                    callback(match, user);
                });
            }
            else {
                callback(false);
                return;
            }
        };

        this.GetIdFromSession = function (session) {
            if (session.user && session.user.id && session.user.loggedin) {
                return session.user.id;
            }
            else {
                return -1;
            }
        };

        this.SetSessionUser = function (session, user) {
            if (user !== undefined && user !== null) {
                session.user = {
                    "id": user.id,
                    "loggedin": true
                };
            }
            else {
                delete session.user;
            }
        };

        function HashPass(password, salt) {
            var sha256 = crypto.createHash('sha256');
            sha256.update(salt + password + salt);
            return sha256.digest('hex');
        }

        /**
         * attemps database search for given username and password
         * @returns {void}
         * @param {string} username the username of the user
         * @param {string} password the password of the user
         * @param {function} callback the function that gets called on completion calls ({bool}loggedin, {user}user or {string}error)
         */
        this.Login = function (username, password, callback) {
            var usernamei = CheckString(username, "Username");
            if (usernamei !== undefined && usernamei.error !== undefined) {
                callback(false, usernamei.error);
                return;
            }
            var passwordi = CheckString(password, "Password");
            if (passwordi !== undefined && passwordi.error !== undefined) {
                callback(false, passwordi.error);
                return;
            }
            db.MatchObject(sql, 'users', { "username": username, "email": username }, function (match, recordset) {
                if (match) {
                    var user = recordset[0];
                    var hash = HashPass(password, user.salt);
                    if (hash === user.password) {
                        delete user.password;
                        delete user.salt;
                        callback(true, user);
                        return;
                    }
                }
                callback(false, "Username or Password incorrect");
                return;
            }, { "operator": "OR" });
        };

        /**
         * attemps user insertion in database
         * @returns {void}
         * @param {string} username the username of the user
         * @param {string} password the password of the user
         * @param {string} email the email of the user
         * @param {function} callback the function that gets called on completion calls ({bool}success,{string}error or {undefined})
         */
        this.Register = function (username, password, email, callback) {
            var usernamei = CheckString(username, "Username");
            if (usernamei !== undefined && usernamei.error !== undefined) {
                callback(false, usernamei.error);
                return;
            }
            var passwordi = CheckString(password, "Password");
            if (passwordi !== undefined && passwordi.error !== undefined) {
                callback(false, passwordi.error);
                return;
            }
            var emaili = CheckString(email, "Email");
            if (emaili !== undefined && emaili.error !== undefined) {
                callback(false, emaili.error);
                return;
            }
            var salt = crypto.randomBytes(16).toString('hex');
            var hashedpass = HashPass(password, salt);
            var user = {
                "email": email,
                "username": username,
                "password": hashedpass,
                "salt": salt,
                "totalebestanden": 0,
                "groottebestanden": 0,
                "dataplan": 0
            };
            db.MatchObject(sql, 'users', { "username": username }, function (match) {
                if (match) {
                    callback(false, "Username is already in use");
                    return;
                }
                db.MatchObject(sql, 'users', { "email": email }, function (match2) {
                    if (match2) {
                        callback(false, "Email is already in use");
                        return;
                    }
                    db.InsertObject(sql, 'users', user, function (success, result) {
                        if (!success) {
                            callback(false, "Database query failed");
                            return;
                        }
                        delete user.password;
                        delete user.salt;
                        user.id = result[0].id;
                        callback(true, user);
                        return;
                    }, { "inserted": "id" });
                });
            });
        };

        function rawUpload(documentid, type, stream, callback) {
            createFile(documentid, type, stream.originalFilename, stream.size, function (success, id) {
                if (!success) {
                    callback(false, id);
                    return;
                }
                blobSvc.createBlockBlobFromStream('paperless', id + ".blob", stream, stream.size, function (error) {
                    if (error) {
                        ErrorEvent.HError(error, 1);
                        callback(false, 'error uploading to blob');
                        return;
                    }
                    var str = fs.createReadStream(stream.path);
                    GenerateKeywords(documentid, str, callback);
                    //callback(true, documentid, id);
                });
            });
        }

        // upload types
        var original = 1;
        var imagepage = 2;
        var thumbnail = 3;

        this.Upload = function (session, data, userid, documentid, callback) {
            if (callback === undefined) {
                callback = documentid;
                documentid = undefined;
            }
            if (this.GetIdFromSession(session) !== userid || userid === -1) {
                callback(false, "User id's not the same");
                return;
            }
            if (documentid !== undefined) {
                rawUpload(documentid, original, data.stream, callback);
            }
            else {
                createDocument(data.filename, userid, data.date, function (success, id) {
                    if (!success) {
                        callback(false, id);
                        return;
                    }
                    rawUpload(id, original, data.stream, callback);
                });
            }
        };

        this.Download = function (session, userid, documentid, fileid, callback) {
            if (this.GetIdFromSession(session) !== userid || userid === -1) {
                callback(false, "User id's not the same");
                return;
            }
            checkDocument(userid, documentid, function (m, d) {
                if (!m) {
                    callback(false, "document not from user");
                    return;
                }
                db.QueryObject(sql, { "equals": { "document": documentid, "id": fileid }, "select": "name", "table": "files" }, function (match, recordset) {
                    if (!match || recordset.length !== 1) {
                        callback(false, "File not found");
                        return;
                    }
                    var stream = blobSvc.createReadStream('paperless', fileid + '.blob');
                    callback(true, stream, recordset[0].name);
                });
            });
        };

        this.GetDocuments = function (session, userid, filter, callback) {
            if (this.GetIdFromSession(session) !== userid || userid === -1) {
                callback(false, "User id's not the same");
                return;
            }
            filter = filter || {};
            filter.userid = userid;
            getDocument(filter, callback);
        };

        this.GetDetailDocument = function (session, userid, documentid, callback) {
            if (this.GetIdFromSession(session) !== userid || userid === -1) {
                callback(false, "User id's not the same");
                return;
            }
            GetDetailDocument(userid, documentid, callback);
        };

        this.GetFiles = function (session, userid, documentid, callback) {
            if (this.GetIdFromSession(session) !== userid || userid === -1) {
                callback(false, "User id's not the same");
                return;
            }
            checkDocument(userid, documentid, function (match) {
                if (!match) {
                    callback(false, "Data not found");
                    return;
                }
                db.MatchObject(sql, 'files', { "document": documentid }, callback);
            });
        };

        function GenerateThumbnail(documentid, stream, callback) {
            request({
                method: 'POST',
                url: 'https://api.projectoxford.ai/vision/v1.0/generateThumbnail?width=500&height=500&smartCropping=true',
                headers: {
                    'Content-type': 'application/octet-stream',
                    'Ocp-Apim-Subscription-Key': apikey.api_key_cv
                },
                body: stream
            }, function (error, response, result) {
                if (!error && response.statusCode === 200) {
                    var buf = Buffer.from(result);
                    //Image upload naar database
                    buf.originalFilename = "thumbnail.jpg";
                    rawUpload(documentid, thumbnail, buf, callback)
                }
                else {
                    callback(false, "Generating thumbnail failed");
                    return;
                }
            });
        }

        function GenerateKeywords(documentid, stream, callback) {
            request({
                method: 'POST',
                url: 'https://api.projectoxford.ai/vision/v1.0/ocr?language=en&detectOrientation=true',
                headers: {
                    'Content-type': 'application/octet-stream',
                    'Ocp-Apim-Subscription-Key': apikey.api_key_cv
                },
                body: stream
            }, function (error, response, result) {
                //console.log(result);
                if (!error && response.statusCode === 200) {
                    var jsondata = JSON.parse(result);
                    var text = [];
                    for (var i = 0; i < jsondata.regions.length; i++) {
                        for (var o = 0; o < jsondata.regions[i].lines.length; o++) {
                            for (var p = 0; p < jsondata.regions[i].lines[o].words.length; p++) {
                                text.push(jsondata.regions[i].lines[o].words[p].text);
                            }
                            text[text.length - 1] += '.';
                        }
                    }
                    text = text.join(' ');
                    if (text.length > 0) {
                        request({
                            method: 'POST',
                            url: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/keyPhrases',
                            headers: {
                                'Content-type': 'application/json',
                                'Ocp-Apim-Subscription-Key': apikey.api_key_text
                            },
                            body: JSON.stringify({
                                "documents": [
                                    {
                                        "language": "en",
                                        "id": "1",
                                        "text": text
                                    }
                                ]
                            })
                        }, function (error, response, result) {
                            if (!error && response.statusCode === 200) {
                                var res = JSON.parse(result);
                                var finaltext = [];
                                for (var i = 0; i < res.documents.length; i++) {
                                    for (var o = 0; o < res.documents[i].keyPhrases.length; o++) {
                                        finaltext.push(res.documents[i].keyPhrases[o]);
                                    }
                                }
                                finaltext = finaltext.join(' ');
                                db.Query(sql, "UPDATE documents SET content=@content WHERE id=@id", { 'id': documentid, 'content': finaltext }, function (success) {
                                    if (success) {
                                        callback(true);
                                        return;
                                    }
                                    callback(false, "Update failed");
                                    return;
                                });
                                console.log(finaltext);
                            }
                            else {
                                callback(false, "Failed to generate keywords");
                                return;
                            }
                        });
                    }
                }
                else {
                    callback(false, "Invalid file type");
                    return;
                }
            }
            )
        }
    };
    return this;
};