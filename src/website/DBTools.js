/**
 * Created by levi_ on 14/09/2016.
 */


module.exports = function () {
    var EE = require('./ErrorEvent');
    var ErrorEvent = new EE('DBTools');
    this.ErrorEvent = ErrorEvent;
    function CheckTable(sql, table, callback) {
        new sql.Request().query('select 1 from ' + table, function (err, recordset) {
            if (err != undefined) {
                ErrorEvent.HError(err, ErrorEvent._DataBaseError);
                callback(false);
            }
            else {
                callback(true);
            }
        });
    }

    this.CheckTable = CheckTable;

    this.Exists = function (sql, table, creation, maintenance, callback) {
        CheckTable(sql, table, function (success) {
            if (!success) {
                new sql.Request().query(creation, function (err) {
                    if (err != undefined) {
                        ErrorEvent.HError(err, ErrorEvent._DataBaseError);
                        if (callback !== undefined) {
                            callback(err);
                        }
                    }
                    else{
                        if (callback !== undefined){
                            callback();
                        }
                    }
                });
            }
            else if (maintenance !== undefined) {
                new sql.Request().query(maintenance, function (err) {
                    if (err != undefined) {
                        ErrorEvent.HError(err, ErrorEvent._DataBaseError);
                        if (callback !== undefined) {
                            callback(err);
                        }
                    }
                    else{
                        if (callback !== undefined){
                            callback();
                        }
                    }
                });
            }

        });
    };
    return this;
};