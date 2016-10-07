/**
 * Created by levi_ on 14/09/2016.
 */
module.exports = function (sql, level, debug) {
    var Debug = false;
    if (debug != undefined) {
        Debug = debug;
    }
    var EE = require('./ErrorEvent');
    var ErrorEvent = new EE('ErrorHandler');
    var DB = require('./DBTools');
    var db = new DB();
    db.ErrorEvent.SetOnError(ErrorEvent.HError);
    //ErrorEvent.Pipe(db.ErrorEvent);
    this.Level = level;
    var Handle = function (message, level) {
        var request = new sql.Request();
        request.input('error', sql.VarChar, message);
        request.input('level', sql.VarChar, level);
        request.input('date', sql.DateTime, new Date());
        request.query("INSERT INTO Errors (Error, Level, Time) VALUES (@error,@level,@date);", function (err, recordset) {
            if (err != undefined) {
                console.log(JSON.stringify(err));
            }
        });
    };
    /*
    this.Pipe = function (Event) {
        ErrorEvent.Pipe(Event);
    };
    */
    if (!Debug) {
        ErrorEvent.SetOnError(Handle);
    }

    db.Exists(sql, 'Errors', 'CREATE TABLE Errors(Error varchar(512), Level varchar(255), Time datetime);');

    this.HError = function (err, level) {
        ErrorEvent.HError(err, level);
    };
    return this;
};