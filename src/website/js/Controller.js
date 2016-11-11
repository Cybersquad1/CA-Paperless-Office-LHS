/**
 * Created by Hannelore on 4/10/2016.
 */
var app = angular.module('myApp', [/*'angularFileUpload'*/]);
app.controller('PaperlessController', function ($scope, $http) {
    $scope.login = function () {
        var pass = CryptoJS.SHA512($scope.loginPassword).toString();

        $scope.loginData = {
            "username": $scope.loginUsername,
            "password": pass
        };

        var logindata = JSON.stringify($scope.loginData);

        $http.post('/login', logindata).then(function (logindatares) {
            console.log(logindatares);
            $scope.loggedin = logindatares.data.loggedin;
            $scope.username = logindatares.data.user.username;
            if ($scope.loggedin == true) {
                //Close modal
            }

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

        $http.post('/register', registerdata).then(function succesCallback(registerdata) {
            console.log(registerdata);
            $scope.username = registerdata.data.user.username;
            $scope.registered = registerdata.data.registered;
            if ($scope.registered == true) {
                //Close modal
            }
        });

        console.log('User registered', registerdata);
    };
    function init() {
        $http.get('/getuser').then(function (response) {
            console.log(response.data);

            $scope.loggedin = response.data.loggedin;
            if ($scope.loggedin) {
                $scope.username = response.data.user.username;
            }
        });
    };
    init();
});
app.controller('UploadController', function ($scope, $http, $window) {
    $scope.logout = function () {
        $http.get('/logout').then(function (response) {
            console.log(response);
            $scope.loggedin = false;
            if ($scope.loggedin == false) {
                $window.location.href = '/index.html';
            }

        });
    };


    //console.log('User registered', registerdata);
    //};

    function init() {
        $http.get('/getuser').then(function (response) {
            console.log(response.data);
            $scope.loggedin = response.data.loggedin;
            if ($scope.loggedin == false) {
                console.log("error");
                $window.location.href = '/index.html';
            } else {
                $scope.username = response.data.user.username;
            }
        });
    }
    init();
});
