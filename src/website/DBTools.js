/**
 * Created by levi_ on 14/09/2016.
 */
var EE = require('./ErrorEvent.js');

module.exports = function () {
    var ErrorEvent = new EE('DBTools');
    this.ErrorEvent = ErrorEvent;
    function CheckTable(sql, table, callback) {
        new sql.Request().query('select 1 from ' + table, function (err) {
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
                    if (err !== undefined) {
                        ErrorEvent.HError(err, ErrorEvent.DataBaseError);
                        if (callback !== undefined) {
                            callback(err);
                            return;
                        }
                    }
                    else if (callback !== undefined) {
                        callback();
                        return;
                    }
                });
            }
            else if (maintenance !== undefined) {
                new sql.Request().query(maintenance, function (err) {
                    if (err !== undefined) {
                        ErrorEvent.HError(err, ErrorEvent.DataBaseError);
                        if (callback !== undefined) {
                            callback(err);
                            return;
                        }
                    }
                    else if (callback !== undefined) {
                        callback();
                        return;
                    }
                });
            }
            else if (callback !== undefined) {
                callback();
                return;
            }
        });
    };

    function MakeArray(value) {
        var internal;
        if (value instanceof Array) {
            internal = value;
        }
        else {
            internal = [value];
        }
        return internal;
    }

    this.Match = function (sql, table, parameters, values, callback) {
        var internalparameters, internalvalues;
        internalparameters = MakeArray(parameters);
        internalvalues = MakeArray(values);
        if (internalparameters.length !== internalvalues.length || internalparameters.length < 1) {
            ErrorEvent.HError("amount of parameters and values not equal or smaller than 1", ErrorEvent.DataBaseError);
            if (callback !== undefined) {
                callback(false);
                return;
            }
        }
        var query = "SELECT * FROM " + table + " WHERE ";
        var request = new sql.Request();
        for (var index = 0; index < internalparameters.length; index++) {
            if (index > 0) {
                query += " AND ";
            }
            request.input(internalparameters[index], sql.VarChar, internalvalues[index]);
            query += internalparameters[index] + " = @" + internalparameters[index];
        }
        query += ";";
        request.query(query, function (err, recordset) {
            if (err !== undefined) {
                ErrorEvent.HError(err, ErrorEvent.DataBaseError);
                if (callback !== undefined) {
                    callback(false);
                    return;
                }
            }
            else if (callback !== undefined) {
                callback(recordset.length > 0, recordset);
                return;
            }
        });
    };

    return this;
};