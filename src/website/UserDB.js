/**
 * Created by levi_ on 7/10/2016.
 */

module.exports = function (callback) {
    var EE = require('./ErrorEvent');
    var ErrorEvent = new EE('UserDB');
    var DB = require('./DBTools');
    var db = new DB();
    db.ErrorEvent.SetOnError(ErrorEvent.HError);
    this.SetOnError = function (event) {
        ErrorEvent.SetOnError(event);
    }
    this.Init = function() {
        
    };
    function CheckUserTable() {
        db.Exists(sql,
        'users',
        'CREATE TABLE users([sid] int IDENTITY(1,1) PRIMARY KEY, Email varchar(255), NickName varchar(255), Password varchar(255), Privileges tinyint);', 'DELETE FROM sessions WHERE expires < getdate();',
        function(err) {
            if (err !== undefined){
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