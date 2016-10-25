/**
 * Created by Hannelore on 4/10/2016.
 */
var app = angular.module('myApp', []);
app.controller('PaperlessController', function ($scope, $http) {
    $scope.register = function () {
        var registerData = {
            username: $scope.registerUsername,
            password: $scope.registerPassword,
            email: $scope.registerEmail
        };

        var registerdata = JSON.stringify(registerData);

        $http.post('/register', registerdata).then(function succesCallback(registerdata) {
            console.log(registerdata);
            $scope.username = registerdata.data.user.username;
            $scope.registered = registerdata.data.registered;
            if ($scope.registered == true){
                //Close modal
            }
        });

        console.log('User registered', registerdata);
    };

    $scope.login = function () {
        var loginData = {
            username: $scope.loginUsername,
            password: $scope.loginPassword
        };

        var logindata = JSON.stringify(loginData);

        $http.post('/login', logindata).then(function succesCallback(logindata) {
            console.log(logindata);
            $scope.loggedin = logindata.data.loggedin;
            $scope.username = logindata.data.user.username;
            if ($scope.loggedin == true){
                //Close modal
            }
        });

        console.log('User logged in', logindata);
    };

    $scope.logout = function () {
        $http.get('/logout').then(function(response){
            console.log(response);
            $scope.loggedin = false;
        });
    };

    function init () {
        $http.get('/getuser').then(function (response) {
            console.log(response.data);
            $scope.loggedin = response.data.loggedin;
            $scope.username = response.data.user.username;
        });
    }

    init();

});

app.controller('UploadController', function ($scope, $http, $window) {
    $scope.logout = function () {
        $http.get('/logout').then(function(response){
            console.log(response);
            $scope.loggedin = false;
            if ($scope.loggedin == false){
                $window.location.href = '/index.html';
            }
        });
    };

    function init () {
        $http.get('/getuser').then(function (response) {
            console.log(response.data);
            $scope.loggedin = response.data.loggedin;
            if ($scope.loggedin == false){
                console.log("error");
                $window.location.href = '/index.html';
            } else {
                $scope.username = response.data.user.username;
            }
        });
    }

    init();
});
