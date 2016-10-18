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
                'CREATE TABLE users([id] int IDENTITY(1,1) PRIMARY KEY, email varchar(255), username varchar(255), password varchar(255), totalebestanden int, groottebestanden int, dataplan tinyint);', undefined,
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
            CreateSessions();
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

        /**
         * Gets The user if logged in with a session
         * @returns {void}
         * @param {object} session the session from request
         * @param {function} callback gets called with ({bool}matchfound, {user}user)
         */
        this.GetUserFromSession = function (session, callback) {
            if (session.user && session.user.id && session.user.loggedin) {
                db.Match(sql, 'users', 'id', session.user.id, function (match, user) {
                    callback(match, user);
                });
            }
        };

        /**
         * attemps database search for given username and password
         * @returns {void}
         * @param {string} username the username of the user
         * @param {string} password the password of the user
         * @param {function} callback the function that gets called on completion calls ({bool}loggedin, {user}user or {string}error)
         */
        this.Login = function (username, password, callback) {
            var usernamei = CheckString(username, "Username");
            if (usernamei.error !== undefined) {
                callback(false, usernamei.error);
                return;
            }
            var passwordi = CheckString(password, "Password");
            if (passwordi.error !== undefined) {
                callback(false, passwordi.error);
                return;
            }
            db.Match(sql, 'users', ['username', 'password'], [username, password], function (loggedin, recordset) {
                var user;
                if (loggedin) {
                    user = recordset[0];
                }
                callback(loggedin, user);
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
            if (usernamei.error !== undefined) {
                callback(false, usernamei.error);
                return;
            }
            var passwordi = CheckString(password, "Password");
            if (passwordi.error !== undefined) {
                callback(false, passwordi.error);
                return;
            }
            var emaili = CheckString(email, "Email");
            if (emaili.error !== undefined) {
                callback(false, emaili.error);
                return;
            }
            db.Match(sql, 'users', 'username', username, function (match) {
                if (match) {
                    callback({
                        "error": "Username is already in use",
                        "success": false
                    });
                    return;
                }
                db.Match(sql, 'users', 'email', email, function (match2) {
                    if (match2) {
                        callback({
                            "error": "Email is already in use",
                            "success": false
                        });
                        return;
                    }
                    db.Insert(sql, 'users', ["email", "username", "password", "totalebestanden", "groottebestanden", "dataplan"], [email, username, password, 0, 0, 0], function (success) {
                        if (!success) {
                            callback({
                                "error": "Database query failed",
                                "success": false
                            });
                            return;
                        }
                        callback({ "success": true });
                        return;
                    });
                });
            });
        };
    };
    return this;
};