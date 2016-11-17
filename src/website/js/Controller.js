/**
 * Created by Hannelore on 4/10/2016.
 */
var app = angular.module('myApp', ['ngFileUpload']);

app.controller('PaperlessController', function ($scope, $http, Upload, $window, $timeout) {
    function CheckString(value, name) {
        if (value.length < 5) {
            return { "error": name + " has a minimum of 5 characters." };
        }
        if (value.length > 200) {
            return { "error": name + " has a maximum of 200 characters." };
        }
        var match = value.match(/^[0-9,\+-@.A-Za-z ]+$/);
        if (match === null || match === undefined) {
            return { "error": name + " contains illegal characters. Only letters, numbers, spaces and +-\\@. are allowed." };
        }
    }

    $scope.login = function () {
        var password = $scope.loginPassword;
        var username = $scope.loginUsername;

        var passcheck = CheckString(password, "Password");
        var usercheck = CheckString(username, "Username");

        var error = usercheck || passcheck;
        if (error !== undefined) {
            //todo: show error
        }
        else {
            var pass = CryptoJS.SHA512(password).toString();

            $scope.loginData = {
                "username": username,
                "password": pass
            };
            var logindata = JSON.stringify($scope.loginData);

            $http.post('/login', logindata).then(function (logindatares) {
                console.log(logindatares);
                $scope.loggedin = logindatares.data.loggedin;
                if ($scope.loggedin) {
                    $scope.username = logindatares.data.user.username;
                }
            });
        }
    };

    $scope.logout = function () {
        $http.get('/logout').then(function (response) {
            console.log(response);
            $scope.loggedin = response.data.loggedin;
            if (!$scope.loggedin && $scope.file === "FileOverview") {
                $window.location.href = '/index.html';
            }
        });
    };

    $scope.register = function () {
        var password = $scope.registerPassword;
        var username = $scope.registerUsername;

        var passcheck = CheckString(password, "Password");
        var usercheck = CheckString(username, "Username");
        var emailcheck = CheckString(username, "Email");

        var error = usercheck || passcheck || emailcheck;
        if (error !== undefined) {
            //todo: show error
        }
        else {
            var pass = CryptoJS.SHA512(password).toString();
            $scope.registerData = {
                "username": username,
                "password": pass,
                "email": $scope.registerEmail
            };
            var registerdata = JSON.stringify($scope.registerData);

            $http.post('/register', registerdata).then(function (response) {
                console.log(response);
                $scope.username = response.data.user.username;
                $scope.registered = response.data.registered;
            });
            console.log('User registered', registerdata);
        }
    };

    $scope.uploadFiles = function (files, errFiles) {
        $scope.files = files;
        $scope.errFiles = errFiles;
        angular.forEach(files, function (file) {
            file.upload = Upload.upload({
                "url": '/upload',
                "data": { "id": "", "file": file }
            });

            file.upload.then(function (response) {
                $timeout(function () {
                    file.result = response.data;
                });
            }, function (response) {
                if (response.status > 0)
                    $scope.errorMsg = response.status + ': ' + response.data;
            }, function (evt) {
                file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
            });
        });
    };

    function init() {
        var split = $window.location.pathname.split("/");
        split = split[split.length - 1].split(".");
        $scope.file = split[0];
        $http.get('/getuser').then(function (response) {
            console.log(response.data);
            $scope.loggedin = response.data.loggedin;
            if (!$scope.loggedin && $scope.file === "FileOverview") {
                console.log("error");
                $window.location.href = '/index.html';
            }
            else if ($scope.loggedin) {
                $scope.username = response.data.user.username;
            }
        });
    }

    $scope.files = [
        { "id": "1", "url": "#", "name": "test", "tags": [{ "name": "test", "color": "blue" }, { "name": "test2", "color": "red" }, { "name": "test3", "color": "orange" }], "date": "26/9/2016" },
        { "id": "2", "url": "#", "name": "test", "tags": [{ "name": "test", "color": "blue" }, { "name": "test2", "color": "red" }, { "name": "test3", "color": "orange" }], "date": "26/9/2016" },
        { "id": "3", "url": "#", "name": "test29", "tags": [{ "name": "test", "color": "blue" }, { "name": "test2", "color": "red" }, { "name": "test3", "color": "orange" }], "date": "26/9/2016" },
        { "id": "4", "url": "#", "name": "test", "tags": [{ "name": "test", "color": "blue" }, { "name": "test2", "color": "red" }, { "name": "test3", "color": "orange" }], "date": "26/9/2016" },
        { "id": "5", "url": "#", "name": "test7", "tags": [{ "name": "test", "color": "blue" }, { "name": "test2", "color": "red" }, { "name": "test3", "color": "orange" }], "date": "26/9/2016" },
        { "id": "6", "url": "#", "name": "test6", "tags": [{ "name": "test", "color": "blue" }, { "name": "test2", "color": "red" }, { "name": "test3", "color": "orange" }], "date": "26/9/2016" },
        { "id": "7", "url": "#", "name": "test4", "tags": [{ "name": "test", "color": "blue" }, { "name": "test2", "color": "red" }, { "name": "test3", "color": "orange" }], "date": "26/9/2016" },
        { "id": "8", "url": "#", "name": "test2", "tags": [{ "name": "test", "color": "blue" }, { "name": "test2", "color": "red" }, { "name": "test3", "color": "orange" }], "date": "26/9/2016" }
    ];

    $scope.filtershow = true;
    $scope.filterBtnText = "<<";
    $scope.filedivclass = "col-md-9";

    $scope.fileclick = function (fileID) {
        console.log(fileID);
    };

    $scope.filtershowbtnclick = function () {
        $scope.filtershow = !$scope.filtershow;
        if ($scope.filtershow) {
            $scope.filterBtnText = "<<";
            $scope.filedivclass = "col-md-9";
        }
        else {
            $scope.filterBtnText = ">>";
            $scope.filedivclass = "col-md-11";
        }
    };
    init();
});