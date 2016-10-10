/**
 * Created by levi_ on 7/10/2016.
 */

module.exports = function () {
    var EE = require('./ErrorEvent');
    var ErrorEvent = new EE('UserDB');
    var DB = require('./DBTools');
    var Eh = require("./ErrorHandler");
    var db = new DB();
    db.ErrorEvent.SetOnError(ErrorEvent.HError);
    var sql;
    var UserHandler = this;
    this.Init = function (callback) {
        ConnectDataBase();
        function ConnectDataBase() {
            sql = require('mssql');

            var fs = require('fs');
            var config = JSON.parse(fs.readFileSync('DBCredentials.json', 'utf8'));

            sql.connect(config, function (err) {
                // ... error checks
                if (err != undefined) {
                    console.error(err); // can't log to errorhandling because database isn't connected :p
                    throw (err);
                }
                db.Exists(sql, 'sessions',
                    'CREATE TABLE [dbo].[sessions]([sid] [varchar](255) NOT NULL PRIMARY KEY,[session] [varchar](max) NOT NULL,[expires] [datetime] NOT NULL)',
                    'DELETE FROM sessions WHERE expires < getdate();',
                    function (err) {
                        if (err !== undefined) {
                            callback(err);
                        }
                        else {
                            SetupErrorHandler();
                        }
                    })
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
                    }
                    else {
                        CheckDocumentTable();
                    }
                });
        }

        function CheckDocumentTable() {
            //todo: check the table
            callback();
        }
    };
};