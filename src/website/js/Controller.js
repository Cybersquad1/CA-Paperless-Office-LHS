/**
 * Created by Hannelore on 4/10/2016.
 */
var app = angular.module('myApp', ['ngFileUpload']);

app.controller('PaperlessController', function ($scope, $http, Upload, $window, $timeout) {
    function CheckString(value, name) {
        if (value === undefined || value.length < 5) {
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

    function CheckTag(value) {
        if (value === undefined) {
            return { "error": "tag" + " cannot be undefined" }
        }
        var match = value.match(/^[0-9,\+-@.A-Za-z ]+$/);
        if (match === null || match === undefined) {
            return { "error": "tag" + " contains illegal characters. Only letters, numbers, spaces and +-\\@. are allowed." };
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
                    $scope.user = logindatares.data.user;
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
            else if (!$scope.loggedin) {
                delete $scope.user;
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
                $scope.user = response.data.user;
                $scope.loggedin = response.data.loggedin;
            });
            console.log('User registered', registerdata);
        }
    };

    $scope.addFile = function (files) {
        // console.log(file);
        $scope.files = files;
        if ($scope.documentname === undefined || $scope.documentname.length === 0) {
            $scope.documentname = $scope.files[0].name;
        }
    };

    function showuploadwarning(warn, style, strong) {
        $('#uploadwarnings').children().remove();
        style = style || 'danger';
        strong = strong || 'Warning';
        var warning = '<div class="alert alert-' + style + ' alert-dismissible" role="alert">\
								<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
								<strong>' + strong + '!</strong> ' + warn + '.\
						   </div>';
        $('#uploadwarnings').append(warning);
    }

    function Uploadfile(file, callback, document) {
        var data = {
            "url": '/upload',
            "data": { "id": $scope.user.id, "file": file, "document": $scope.documentname }
        };
        if (document) {
            data.data.documentid = document;
        }
        file.upload = Upload.upload(data);
        file.upload.then(function (response) {
            $timeout(function () {
                file.result = response.data;
            });
            var reply = response.data;
            if (reply.success) {
                if (callback) {
                    callback(file, reply.document, reply.file);
                }
                $scope.files.splice($scope.files.indexOf(file), 1);
                if ($scope.files === undefined || $scope.files.length === 0) {
                    showuploadwarning("All files uploaded", "success", "Done");
                }
            }
            else {
                showuploadwarning(reply.error, "danger", "Failed");
            }
        }, function (response) {
            if (response.status > 0)
                $scope.errorMsg = response.status + ': ' + response.data;
        }, function (evt) {
            file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
        });
    }

    $scope.uploadFiles = function () {
        // $scope.files = files;
        // $scope.errFiles = errFiles;
        var namecheck = CheckString($scope.documentname, "Name");
        if (namecheck !== undefined) {
            showuploadwarning(namecheck.error);
        }
        else if ($scope.files === undefined || $scope.files.length < 1) {
            showuploadwarning('No files selected for upload');
        }
        else {
            var files = $scope.files;
            Uploadfile(files[0], function (file, documentid) {
                for (var i = 1; i < files.length; i++) {
                    Uploadfile(files[i], undefined, documentid);
                }
            });
        }
    };

    function init() {
        var split = $window.location.pathname.split("/");
        split = split[split.length - 1].split(".");
        $scope.file = split[0];
        $http.get('/getuser').then(function (response) {
            console.log(response.data);
            $scope.loggedin = response.data.loggedin;
            if (!$scope.loggedin && ($scope.file === "FileOverview" || $scope.file === "detailview")) {
                console.log("error");
                $window.location.href = '/index.html';
            }
            else if ($scope.loggedin) {
                $scope.user = response.data.user;
            }
        });
    }

    //todo API call to get userfiles for FileOverview
    $scope.userfiles = [
        {
            "id": "1", "url": "https://cdn.freefaxcoversheets.net/samples/basic.jpg", "name": "test"
            , "tags": [{ "name": "test", "color": "lightblue" }, { "name": "test2", "color": "Cyan" }, { "name": "test3", "color": "DodgerBlue" }, { "name": "test4", "color": "DeepSkyBlue" }, { "name": "test5", "color": "DarkTurquoise" }]
            , "manualtags": [{ "name": "manualtest", "color": "blue" }, { "name": "manualtest2", "color": "red" }, { "name": "manualtest3", "color": "orange" }], "date": "26/9/2016", "comment": "just something for testing"
        },
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
    $scope.filedivclass = "col-md-8";

    $scope.fileclick = function (file) {
        console.log(file.id);
        //todo linking to detailview + giving the right info in $scope.detailview (not sure how yet)
    };

    $scope.filtershowbtnclick = function () {
        $scope.filtershow = !$scope.filtershow;
        if ($scope.filtershow) {
            $scope.filterBtnText = "<<";
            $scope.filedivclass = "col-md-8";
        }
        else {
            $scope.filterBtnText = ">>";
            $scope.filedivclass = "col-md-11";
        }
    };

    $scope.detailfile = {
        "id": "1", "url": "https://cdn.freefaxcoversheets.net/samples/basic.jpg", "name": "test", "tags": [
            { "name": "test", "color": "lightblue" }, { "name": "test2", "color": "Cyan" }, { "name": "test3", "color": "DodgerBlue" },
            { "name": "test4", "color": "DeepSkyBlue" }, { "name": "test5", "color": "DarkTurquoise" }
        ], "manualtags": [
            { "name": "manualtest", "color": "blue" }, { "name": "manualtest2", "color": "red" }, { "name": "manualtest3", "color": "orange" }
        ], "generictags": [
            { "name": "test", "color": "lightblue", "activated": false }, { "name": "test2", "color": "Cyan", "activated": false }, { "name": "test3", "color": "DodgerBlue", "activated": false },
            { "name": "test4", "color": "DeepSkyBlue", "activated": false }, { "name": "test5", "color": "DarkTurquoise", "activated": false }
        ], "date": "26/9/2016", "comment": "just something for testing"
    };

    $scope.saveDetailComment = function () {
        console.log($scope.detailfile.comment);
        //todo api call to save comment
    };

    $scope.filterchange = function () {
        if ($scope.contentfilterCheckbox) {
            console.log($scope.contentfilterText);
            //todo correct API calls for filtered date (clientside or serversided)
        }
        if ($scope.datefilterCheckbox) {
            console.log($scope.fromfilterText + " " + $scope.tofilterText);
            //todo correct API calls for filtered date (clientside or serversided)
        }
        if ($scope.namefilterCheckbox) {
            console.log($scope.namefilterText);
            //todo correct API calls for filtered date (clientside or serversided)
        }
        if (
            $scope.tagfilterCheckbox) {
            console.log($scope.tagfilterText);
            //todo correct API calls for filtered date (clientside or serversided)
        }
    }

    $scope.generictagclick = function (clickedtag) {
        //Todo some kind of API call to update generictags of the current detailfile and get the returned value (currently going to do it only clientsided for testing)
        for (var i = 0; i < $scope.detailfile.generictags.length; i++) {
            if ($scope.detailfile.generictags[i] === clickedtag) {
                $scope.detailfile.generictags[i].activated = !$scope.detailfile.generictags[i].activated;
            }
        }
    }

    $scope.makeCostumTag = function () {
        var tagCheck = CheckTag($scope.costumtagname);
        if (tagCheck !== undefined) {
            //todo showing error message
        }
        else {
            var costumTag = { "name": $scope.costumtagname, "color": $scope.costumtagcolor };
            console.log("new tag is:");
            console.log(costumTag);
            $scope.detailfile.manualtags.push(costumTag); //todo needs to be changed to an apicall with a detailfile as return value
        }
    };

    //todo need to make a way to delete manual added tags


    //todo reactivate this
    //init();
});