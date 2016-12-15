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

    this.QueryObject = function (sql, Options, callback) {
        if (!Options.table) {
            callback(false, "No Table specified");
            return;
        }
        if (!Options.insert && !Options.select) {
            Options.select = "*";
        }
        var query = [];
        var first = true;
        var vars = {};
        if (Options.insert) {
            query.push("INSERT INTO " + Options.table + " (");
            var index = 0;
            for (var key in Options.insert) {
                if (index > 0) {
                    query.push(",");
                }
                query.push(key);
                index++;
            }
            query.push(")");
            if (Options.inserted || Options.output) {
                query.push("OUTPUT");
                if (Options.inserted) {
                    query.push("INSERTED." + Options.inserted);
                    if (Options.output) {
                        query.push(",");
                    }
                }
                if (Options.output) {
                    query.push(Options.output);
                }
            }
            query.push("VALUES (");
            index = 0;
            for (var key2 in Options.insert) {
                if (index > 0) {
                    query.push(",");
                }
                query.push("@" + key2);
                vars[key2] = Options.insert[key2];
                index++;
            }
            query.push(")");
        }
        if (Options.select) {
            query.push("SELECT");
            if (Options.distinct) {
                query.push("DISTINCT");
            }
            query.push(Options.select);
            query.push("FROM");
            query.push(Options.table);
        }
        if (Options.join) {
            var join = MakeArray(Options.join);
            for (var i = 0; i < join.length; i++) {
                if (join[i].table) {
                    query.push("INNER JOIN");
                    query.push(join[i].table);
                    if (join[i].on) {
                        query.push("ON");
                        query.push(join[i].on[0]);
                        query.push("=");
                        query.push(join[i].on[1]);
                    }
                }
            }
        }
        if (Options.equals) {
            var equals = MakeArray(Options.equals);
            for (var i = 0; i < equals.length; i++) {
                var operator = equals[i].op || "AND";
                for (var key in equals[i]) {
                    var name = key.replace(".", "");
                    if (first) {
                        first = false;
                        query.push("WHERE");
                    }
                    else {
                        query.push(operator);
                    }
                    query.push(key + " = @" + name);
                    vars[name] = equals[i][key];
                }
            }
        }
        if (Options.like) {
            var like = MakeArray(Options.like);
            for (var i = 0; i < like.length; i++) {
                var operator = like[i].op || "AND";
                for (var key in like[i]) {
                    if (first) {
                        first = false;
                        query.push("WHERE");
                    }
                    else {
                        query.push(operator);
                    }
                    query.push(key + " like @" + key);
                    vars[key] = "%" + like[i][key] + "%";
                }
            }
        }
        if (Options.between) {
            var between = MakeArray(Options.between);
            for (var i = 0; i < between.length; i++) {
                var operator = between[i].op || "AND";
                for (var key in between[i]) {
                    if (first) {
                        first = false;
                        query.push("WHERE");
                    }
                    else {
                        query.push(operator);
                    }
                    query.push(key + " between @" + key + "1 and @" + key + "2");
                    vars[key + "1"] = between[i][key][0];
                    vars[key + "2"] = between[i][key][1];
                }
            }
        }
        query = query.join(" ");
        if (Options.limit) {
            query = "WITH NumberedMyTable AS(" + query.replace("FROM", ",ROW_NUMBER() OVER (ORDER BY " + Options.sort + ") AS RowNumber FROM") + ") SELECT * FROM NumberedMyTable WHERE RowNumber BETWEEN " + Options.limit.low + " AND " + Options.limit.high;
        }
        else if (Options.sort) {
            query += " ORDER BY " + Options.sort;
        }
        query += ";";
        this.Query(sql, query, vars, callback);
    };

    this.MatchObject = function (sql, table, object, callback, Options) {
        var options = Options;
        if (typeof options === "string") {
            options = { "sort": options };
        }
        options = options || {};
        options.select = options.select || "*";
        options.operator = options.operator || "AND";

        var query = "SELECT " + options.select + " FROM " + table;
        var index = 0;
        for (var key in object) {
            if (index > 0) {
                query += " " + options.operator + " ";
            }
            else {
                query += " WHERE ";
            }
            query += key + " = @" + key;
            index++;
        }
        if (options.like) {
            for (var lkey in options.like) {
                if (index > 0) {
                    query += " " + options.operator + " ";
                }
                else {
                    query += " WHERE ";
                }
                query += lkey + " like @" + lkey;
                object[lkey] = "%" + options.like[lkey] + "%";
                index++;
            }
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
                if (recordset === undefined) {
                    callback(true);
                    return;
                }
                callback(recordset.length > 0, recordset);
                return;
            }
        });
    };

    return this;
};