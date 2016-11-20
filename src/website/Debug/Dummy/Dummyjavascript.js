var app = angular.module("myapp", []);
app.controller("mijnCtrl", function ($scope, $http) {
    var pass = CryptoJS.SHA512("testtest").toString();
    var registerdata = {
        "username": "Dummy",
        "password": pass,
        "email": "Dummy@gmail.be"
    };
    var logindata = {
        "username": "Dummy",
        "password": pass
    };
    var registerdatajson = JSON.stringify(registerdata);
    var logindatajson = JSON.stringify(logindata);
    console.log(registerdata);
    console.log(registerdatajson);
    $scope.reg = function () {
        console.log(registerdatajson);
        $http.post("http://localhost/register", registerdatajson).then(function (response) {
            console.log(response);
            $scope.text = JSON.stringify(response.data);
        });
    };
    $scope.log = function () {
        console.log(logindatajson);
        $http.post("http://localhost/login", logindatajson).then(function (response) {
            console.log(response);
            $scope.text = JSON.stringify(response.data);
        });
    };
    $scope.out = function () {
        console.log("logging out");
        $http.get("http://localhost/logout").then(function (response) {
            console.log(response);
            $scope.text = JSON.stringify(response.data);
        });
    };
    $scope.get = function () {
        console.log("getting user");
        $http.get("http://localhost/getuser").then(function (response) {
            console.log(response);
            $scope.text = JSON.stringify(response.data);
        });
    };
});