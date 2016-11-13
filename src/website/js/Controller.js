/**
 * Created by Hannelore on 4/10/2016.
 */
var app = angular.module('myApp', ['angularFileUpload']);
app.controller('PaperlessController', function ($scope, $http) {

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
            });

            console.log('User logged in', logindata);
        }
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

            $http.post('/register', registerdata).then(function (registerdatares) {
                console.log(registerdatares);
            });

            console.log('User registered', registerdata);
        }
    };
});
