/**
 * Created by levi_ on 14/09/2016.
 */

module.exports = function (name) {
    var Name = name;
    var onError;
    var HError;

    this.HError = function (err, level) {
        var errorstring = "";
        var temp = "";
        if (typeof err === 'string' || err instanceof String) {
            errorstring = err;
        }
        else {
            errorstring = JSON.stringify(err);
        }
        temp = Name;
        var levelname = 'unknown';
        if (level !== undefined) {
            if (typeof level === 'string' || level instanceof String) {
                levelname = level;
            }
            else if (typeof level === 'number' || level instanceof Number) {
                if (level === 0) {
                    levelname = 'Debug';
                }
                else if (level === 1) {
                    levelname = 'Error';
                }
                else if (level === 2) {
                    levelname = 'ServerError';
                }
                else if (level === 3) {
                    levelname = 'DatabaseError';
                }
                else {
                    HError('level number not recognised', 'Warn');
                    levelname = 'Unknown number';
                }
            }
            else {
                HError('level not string or number', 'Warn');
            }
            temp = temp + ' (' + levelname + ')';
        }
        temp += ':{';
        errorstring = temp + errorstring + '}';
        if (onError !== undefined) {
            // console.log(e);
            onError(errorstring, levelname);
        }
        else {
            console.log(errorstring);
        }
    };

    this.SetOnError = function (callback) {
        // console.log('Setting: ' + Name);
        onError = function (err, level) {
            callback(err, level);
        };
    };

    this.Debug = 0;
    this.Error = 1;
    this.ServerError = 2;
    this.DataBaseError = 3;
    this.WebClientError = 4;
    this.ClientError = 5;

    return this;
};