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

    this.MatchObject = function (sql, table, object, callback, Options) {
        var options = Options;
        if (typeof options === "string") {
            options = { "sort": options };
        }
        options = options || {};
        options.select = options.select || "*";
        options.operator = options.operator || "AND";

        var query = "SELECT " + options.select + " FROM " + table + " WHERE ";
        var index = 0;
        for (var key in object) {
            if (index > 0) {
                query += " " + options.operator + " ";
            }
            query += key + " = @" + key;
            index++;
        }
        if (options.limit) {
            query = "WITH NumberedMyTable AS(" + query.replace("FROM", ",ROW_NUMBER() OVER (ORDER BY " + options.sort + ") AS RowNumber FROM") + ") " + query.split("FROM")[0] + "FROM NumberedMyTable WHERE RowNumber BETWEEN " + options.limit.low + " AND " + options.limit.high;
        }
        else if (options.sort !== undefined) {
            query += " ORDER BY " + options.sort;
        }
        query += ";";
        this.Query(sql, query, object, callback);
    };

    this.InsertObject = function (sql, table, object, callback, Options) {
        var options = Options || {};
        var query = "INSERT INTO " + table + " (";
        var index = 0;
        for (var key in object) {
            if (index > 0) {
                query += ",";
            }
            query += key;
            index++;
        }
        query += ") ";
        if (options.inserted || options.output) {
            query += "OUTPUT ";
            if (options.inserted) {
                query += "INSERTED." + options.inserted;
                if (options.output) {
                    query += ", ";
                }
            }
            if (options.output) {
                query += options.output;
            }
            query += " ";
        }
        query += "VALUES (";
        index = 0;
        for (var key2 in object) {
            if (index > 0) {
                query += ",";
            }
            query += "@" + key2;
            index++;
        }
        query += ");";
        this.Query(sql, query, object, callback);
    };

    this.Query = function (sql, query, object, callback) {
        var request = new sql.Request();
        for (var key in object) {
            request.input(key, object[key]);
        }
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