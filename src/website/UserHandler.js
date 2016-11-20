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
var sha256 = crypto.createHash('sha256');

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
            // TODO: check the table
            db.Exists(sql,
                'documents',
                'CREATE TABLE documents([id] int IDENTITY(1,1) PRIMARY KEY, name varchar(255), userid int, size int);', undefined,
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
                'CREATE TABLE files([id] int IDENTITY(1,1) PRIMARY KEY, document int, type int);', undefined,
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
            var match = value.match(/^[0-9,\+-@.A-Za-z ]+$/);
            if (match === null || match === undefined) {
                return { "error": name + " contains illegal characters. Only letters, numbers, spaces and +-\\@. are allowed." };
            }
        }

        function createDocument(name, userid, size, callback) {
            var document = {
                "name": name,
                "userid": userid,
                "size": size
            };
            db.InsertObject(sql, 'documents', document, function (success) {
                if (!success) {
                    callback(false, "Database query failed");
                    return;
                }
                var retries = 0;
                function cb(match, recordset) {
                    if (!match || recordset.length < 1) {
                        if (retries > 5) {
                            callback(false, "Data not found");
                            return;
                        }
                        db.MatchObject(sql, 'documents', document, cb, 'id');
                        retries++;
                        return;
                    }
                    callback(true, recordset[recordset.length - 1].id);
                    return;
                }
                db.MatchObject(sql, 'documents', document, cb, 'id');
            });
        }

        function getDocument(object, callback) {
            db.MatchObject(sql, 'documents', object, function (match, recordset) {
                if (!match) {
                    callback(false, "Data not found");
                    return;
                }
                callback(true, recordset);
                return;
            }, 'id');
        }

        function createFile(document, type, callback) {
            var file = {
                "document": document,
                "type": type
            };
            db.InsertObject(sql, 'files', file, function (success) {
                if (!success) {
                    callback(false, "Database query failed");
                    return;
                }
                var retries = 0;
                function cb(match, recordset) {
                    if (!match || recordset.length < 1) {
                        if (retries > 5) {
                            callback(false, "Data not found");
                            return;
                        }
                        db.MatchObject(sql, 'files', file, cb, 'id');
                        retries++;
                    }
                    callback(true, recordset[recordset.length - 1].id);
                    return;
                }
                db.MatchObject(sql, 'files', file, cb, 'id');
            });
        }

        /**
         * Gets The user if logged in with a session
         * @returns {void}
         * @param {object} session the session from request
         * @param {function} callback gets called with ({bool}matchfound, {user}user)
         */
        this.GetUserFromSession = function (session, callback) {
            if (session.user && session.user.id && session.user.loggedin) {
                db.Match(sql, 'users', 'id', session.user.id, function (match, users) {
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
            db.MatchObject(sql, 'users', { "username": username }, function (match, recordset) {
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
            });
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
                    db.InsertObject(sql, 'users', user, function (success) {
                        if (!success) {
                            callback(false, "Database query failed");
                            return;
                        }
                        delete user.password;
                        delete user.salt;
                        callback(true, user);
                        return;
                    });
                });
            });
        };

        function rawUpload(documentid, type, stream, callback) {
            createFile(documentid, type, function (success, id) {
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
                    callback(true, documentid, id);
                });
            });
        }

        // upload types
        var original = 1;
        var imagepage = 2;

        this.Upload = function (session, stream, userid, documentid, callback) {
            if (callback === undefined) {
                callback = documentid;
                documentid = undefined;
            }
            this.GetUserFromSession(session, function (match, user) {
                if (!match) {
                    callback(false, 'User not logged in');
                    return;
                }
                if (user.id !== userid) {
                    callback(false, "User id's not the same");
                    return;
                }
                if (documentid !== undefined) {
                    rawUpload(documentid, original, stream, callback);
                }
                else {
                    createDocument(stream.filename, user.id, stream.size, function (success, id) {
                        if (!success) {
                            callback(false, id);
                            return;
                        }
                        rawUpload(id, original, stream, callback);
                    });
                }
            });
        };

        this.Download = function (session, userid, documentid, callback) {
            this.GetUserFromSession(session, function (match, user) {
                if (!match) {
                    callback(false, 'User not logged in');
                    return;
                }
                if (user.id !== userid) {
                    callback(false, "User id's not the same");
                    return;
                }
                var filter ={
                    "userid": user.id,
                    "documentid": documentid
                };
                this.getDocument(filter, function (match) {
                    if (match){
                        db.MatchObject(sql, 'files', { "document": documentid}, function (match) {
                            if (match){
                                var stream = blobSvc.createReadStream('paperless', documentid + '.blob');
                                callback(true, stream);
                            }
                            else {
                                callback(false, "No download available");
                                return;
                            }
                        });
                    }
                    else {
                        callback(false, "No download available");
                        return;
                    }
                });
            });
        };

        this.GetDocuments = function (session, userid, filter, callback) {
            this.GetUserFromSession(session, function (match, user) {
                filter = filter || {};
                if (!match) {
                    callback(false, 'User not logged in');
                    return;
                }
                if (user.id !== userid) {
                    callback(false, "User id's not the same");
                    return;
                }
                filter.userid = user.id;
                this.getDocument(filter, callback);
            });
        };

        this.GetFiles = function (session, userid, documentid, callback) {
            this.GetUserFromSession(session, function (match, user) {
                if (!match) {
                    callback(false, 'User not logged in');
                    return;
                }
                if (user.id !== userid) {
                    callback(false, "User id's not the same");
                    return;
                }
                var filter ={
                    "userid": user.id,
                    "documentid": documentid
                };
                this.getDocument(filter, function (match) {
                    if (match){
                        db.MatchObject(sql, 'files', { "document": documentid}, callback );
                    }
                    else {
                        callback(false, "No files available");
                        return;
                    }
                });
            });
        };
    };
    return this;
};