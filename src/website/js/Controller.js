/**
 * Created by Hannelore on 4/10/2016.
 */
var app = angular.module('myApp', []);
app.controller('PaperlessController', function ($scope, $http) {
    $scope.login = function () {
        $scope.loginData = {
            username: $scope.loginUsername,
            password: $scope.loginPassword
        };

        var logindata = JSON.stringify($scope.loginData);

        $http.post('/login', logindata).then(function succesCallback(logindata) {
            console.log(logindata);
        });

        console.log('User logged in', logindata);
    }

    $scope.register = function () {
        $scope.registerData = {
            username: $scope.registerUsername,
            password: $scope.registerPassword,
            email: $scope.registerEmail
        };

        var registerdata = JSON.stringify($scope.registerData);

        $http.post('/register', registerdata).then(function succesCallback(registerdata) {
            console.log(registerdata);
        });

        console.log('User registered', registerdata);
    }
});
