/**
 * Created by levi_ on 14/09/2016.
 */
var EE = require('./ErrorEvent.js');
var DB = require('./DBTools.js');

module.exports = function (sql, level, debug) {
    var Debug = false;
    if (debug !== undefined) {
        Debug = debug;
    }
    var ErrorEvent = new EE('ErrorHandler');
    var db = new DB();
    db.ErrorEvent.SetOnError(ErrorEvent.HError);
    this.Level = level;
    function Handle(message, loglevel) {
        var request = new sql.Request();
        request.input('error', sql.VarChar, message);
        request.input('level', sql.VarChar, loglevel);
        request.input('date', sql.DateTime, new Date());
        request.query("INSERT INTO Errors (Error, Level, Time) VALUES (@error,@level,@date);", function (err) {
            if (err !== undefined) {
                console.log(JSON.stringify(err));
            }
        });
    }
    if (!Debug) {
        ErrorEvent.SetOnError(Handle);
    }

    db.Exists(sql, 'Errors', 'CREATE TABLE Errors(Error varchar(512), Level varchar(255), Time datetime);');

    this.HError = function (err, loglevel) {
        ErrorEvent.HError(err, loglevel);
    };
    return this;
};