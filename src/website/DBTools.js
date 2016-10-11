/**
 * Created by levi_ on 14/09/2016.
 */
var EE = require('./ErrorEvent');

module.exports = function () {
    var ErrorEvent = new EE('DBTools');
    this.ErrorEvent = ErrorEvent;
    function CheckTable(sql, table, callback) {
        new sql.Request().query('select 1 from ' + table, function (err, recordset) {
            if (err !== undefined) {
                ErrorEvent.HError(err, ErrorEvent.DataBaseError);
                callback(false);
                return;
            }
            callback(true);
            return;
        });
    }

    this.CheckTable = CheckTable;

    this.Exists = function (sql, table, creation, maintenance, callback) {
        CheckTable(sql, table, function (success) {
            if (!success) {
                new sql.Request().query(creation, function (err) {
                    if (err != undefined) {
                        ErrorEvent.HError(err, ErrorEvent.DataBaseError);
                        if (callback !== undefined) {
                            callback(err);
                        }
                    }
                    else {
                        if (callback !== undefined) {
                            callback();
                        }
                    }
                });
            }
            else if (maintenance !== undefined) {
                new sql.Request().query(maintenance, function (err) {
                    if (err != undefined) {
                        ErrorEvent.HError(err, ErrorEvent.DataBaseError);
                        if (callback !== undefined) {
                            callback(err);
                        }
                    }
                    else {
                        if (callback !== undefined) {
                            callback();
                        }
                    }
                });
            }

        });
    };
    return this;
};