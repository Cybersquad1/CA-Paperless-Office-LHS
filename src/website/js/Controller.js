/**
 * Created by Hannelore on 4/10/2016.
 */
var app = angular.module('myApp', [/*'angularFileUpload'*/]);
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
        if (error.error !== undefined) {
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
                if ($scope.loggedin == true) {
                    //Close modal
                }
            });
        };
    };
    $scope.register = function () {
        var password = $scope.registerPassword;
        var username = $scope.registerUsername;

        var passcheck = CheckString(password, "Password");
        var usercheck = CheckString(username, "Username");
        var emailcheck = CheckString(username, "Email");

        var error = usercheck || passcheck || emailcheck;
        if (error.error !== undefined) {
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


            $http.post('/register', registerdata).then(function succesCallback(registerdata) {
                console.log(registerdata);
                $scope.username = registerdata.data.user.username;
                $scope.registered = registerdata.data.registered;
                if ($scope.registered == true) {
                    //Close modal
                }
            });
            console.log('User registered', registerdata);
        }
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

app.controller('FileOverview', function ($scope, $http, $window) {

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

    $scope.logout = function () {
        $http.get('/logout').then(function (response) {
            console.log(response);
            $scope.loggedin = false;
            if ($scope.loggedin == false) {
                $window.location.href = '/index.html';
            }

        });
    };

    $scope.fileclick = function (fileID) {
        console.log(fileID);
    };

    $scope.filtershowbtnclick = function () {
        $scope.filtershow = !$scope.filtershow;
        if ($scope.filtershow) {
            $scope.filterBtnText = "Hide";
            $scope.filedivclass = "col-md-9";


        } else {
            $scope.filterBtnText = "Show";
            $scope.filedivclass = "col-md-11";
        }

    }

    $scope.setTagColor = function (tag) {

        return "{ 'color':" + tag.color + "}"
    }

    $scope.myStyle1 = "{color:'red'}";

    $scope.filterBtnText = "Hide";
    $scope.filedivclass = "col-md-9";

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
    //init();
});
