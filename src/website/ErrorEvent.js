/**
 * Created by levi_ on 14/09/2016.
 */
module.exports = function (name) {
    var Name = name;
    var onError;
    var HError;
    HError = function (err, level) {
        var s, e;
        if (typeof err === 'string' || err instanceof String) {
            e = err
        }
        else {
            e = JSON.stringify(err);
        }
        s = name;
        var levelname = 'unknown';
        if (level !== undefined) {
            if (typeof level === 'string' || level instanceof String) {
                levelname = level;
            }
            else if (typeof level === 'number' || level instanceof Number) {
                if (level == 0) {
                    levelname = 'Debug';
                }
                else if (level == 1) {
                    levelname = 'Error';
                }
                else if (level == 2) {
                    levelname = 'ServerError';
                }
                else if (level == 3) {
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
            s = s + ' (' + levelname + ')';
        }
        s = s + ':{';
        e = s + e + '}';
        if (onError != undefined) {
            //console.log(e);
            onError(e, levelname);
        }
        else {
            console.log(e);
        }
    };

    this.HError = HError;

    this.SetOnError = function (callback) {
        //console.log('Setting: ' + Name);
        onError = function (a,b) {
            callback(a,b);
        };
    };
/*
    this.Pipe = function (Event) {
        Event.SetOnError(HError);
    };
*/
    this._Debug = 0;
    this._Error = 1;
    this._ServerError = 2;
    this._DataBaseError = 3;

    return this;
};