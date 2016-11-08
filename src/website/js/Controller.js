/**
 * Created by Hannelore on 4/10/2016.
 */
var app = angular.module('myApp', ['angularFileUpload']);
app.controller('PaperlessController', function ($scope, $http) {
    $scope.login = function () {
        var pass = CryptoJS.SHA512($scope.loginPassword).toString();

        $scope.loginData = {
            "username": $scope.loginUsername,
            "password": pass
        };

        var logindata = JSON.stringify($scope.loginData);

        $http.post('/login', logindata).then(function(logindatares) {
            console.log(logindatares);
        });

        console.log('User logged in', logindata);
    };

    $scope.register = function () {
        var pass = CryptoJS.SHA512($scope.registerPassword).toString();

        $scope.registerData = {
            "username": $scope.registerUsername,
            "password": pass,
            "email": $scope.registerEmail
        };

        var registerdata = JSON.stringify($scope.registerData);

        $http.post('/register', registerdata).then(function(registerdatares) {
            console.log(registerdatares);
        });

        console.log('User registered', registerdata);
    };
});
