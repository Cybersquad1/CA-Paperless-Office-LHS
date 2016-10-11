/**
 * Created by levi_ on 7/10/2016.
 */
var EE = require('./ErrorEvent');
var DB = require('./DBTools');
var Eh = require("./ErrorHandler");
var sql = require('mssql');
// var fs = require('fs');
var dbconfig = require('./DBCredentials.json');

module.exports = function (debug) {
    var ErrorEvent = new EE('UserHandler');
    var db = new DB();
    db.ErrorEvent.SetOnError(ErrorEvent.HError);
    var UserHandler = this;
    this.Init = function (callback) {
        ConnectDataBase();
        function ConnectDataBase() {

            // var config = JSON.parse(fs.readFileSync('DBCredentials.json', 'utf8'));

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
                            callback(error);
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
                        callback(err);
                        return;
                    }
                    CheckDocumentTable();
                });
        }

        function CheckDocumentTable() {
            // TODO: check the table
            callback();
        }

        this.Login = function (username, password) {

        }

        this.Register = function (username, password, email) {

        }
    };
    return this;
};