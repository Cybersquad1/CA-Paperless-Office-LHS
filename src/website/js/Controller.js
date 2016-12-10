/**
 * Created by Hannelore on 4/10/2016.
 */
var app = angular.module('myApp', ['ngFileUpload']);

app.controller('PaperlessController', function ($scope, $http, Upload, $window, $timeout) {
    function CheckString(value, name) {
        if (value === undefined || value.length < 5) {
            return { "error": name + " needs a minimum of 5 characters." };
        }
        if (value.length > 200) {
            return { "error": name + " needs a maximum of 200 characters." };
        }
        var match = value.match(/^[0-9,\+-_@.A-Za-z ]+$/);
        if (match === null || match === undefined) {
            return { "error": name + " contains illegal characters. Only letters, numbers, spaces and +-_\\@. are allowed." };
        }
    }

    function CheckTag(value) {
        if (value === undefined) {
            return { "error": "tag" + " cannot be undefined" }
        }
        var match = value.match(/^[0-9,\+-_@.A-Za-z ]+$/);
        if (match === null || match === undefined) {
            return { "error": "tag" + " contains illegal characters. Only letters, numbers, spaces and +-_\\@. are allowed." };
        }
    }

    function GoToFiles() {
        window.location = "/FileOverview.html";
    }

    $scope.login = function () {
        var password = $scope.loginPassword;
        var username = $scope.loginUsername;

        var passcheck = CheckString(password, "Password");
        var usercheck = CheckString(username, "Username");

        var error = usercheck || passcheck;
        if (error !== undefined) {
            showwarning(error.error, 'danger', 'Failed', 'login');
        }
        else {
            var pass = CryptoJS.SHA512(password).toString();

            $scope.loginData = {
                "username": username,
                "password": pass
            };
            var logindata = JSON.stringify($scope.loginData);

            $http.post('/login', logindata).then(function (logindatares) {
                //console.log(logindatares);
                $scope.loggedin = logindatares.data.loggedin;
                if ($scope.loggedin) {
                    //$scope.user = logindatares.data.user;
                    GoToFiles();
                }
                else {
                    if (logindatares.data.error) {
                        showwarning(logindatares.data.error, 'danger', 'Failed', 'login');
                    }
                    delete $scope.user;
                }
            });
        }
    };

    $scope.logout = function () {
        $http.get('/logout').then(function (response) {
            //console.log(response);
            $scope.loggedin = response.data.loggedin;
            if (!$scope.loggedin && ($scope.file === "FileOverview" || $scope.file === "detailview")) {
                $window.location.href = '/index.html';
            }
            else if (!$scope.loggedin) {
                delete $scope.user;
            }
        });
    };

    $scope.register = function () {
        var password = $scope.registerPassword;
        var cpassword = $scope.registercPassword;
        var username = $scope.registerUsername;
        var email = $scope.registerEmail;

        var passcheck = CheckString(password, "Password");
        var usercheck = CheckString(username, "Username");
        var emailcheck = CheckString(email, "Email");

        var error = usercheck || passcheck || emailcheck;
        if (cpassword !== password) {
            error = error || { "error": "passwords don't match" };
        }
        if (error !== undefined) {
            showwarning(error.error, 'danger', 'Failed', 'register');
        }
        else {
            var pass = CryptoJS.SHA512(password).toString();
            $scope.registerData = {
                "username": username,
                "password": pass,
                "email": email
            };
            var registerdata = JSON.stringify($scope.registerData);

            $http.post('/register', registerdata).then(function (response) {
                //console.log(response);
                $scope.user = response.data.user;
                $scope.loggedin = response.data.loggedin;
                if ($scope.loggedin) {
                    GoToFiles();
                }
                else if (response.data.error) {
                    showwarning(response.data.error, 'danger', 'Failed', 'register');
                }
            });
            //console.log('User registered', registerdata);
        }
    };

    $scope.addFile = function (files) {
        // console.log(file);
        $scope.files = files;
        if ($scope.documentname === undefined || $scope.documentname.length === 0) {
            $scope.documentname = $scope.files[0].name;
        }
    };

    function showwarning(warn, style, strong, id) {
        style = style || 'danger';
        strong = strong || 'Warning';
        id = id || 'upload';
        id = '#' + id + 'warnings';
        $(id).children().remove();
        var warning = '<div class="alert alert-' + style + ' alert-dismissible" role="alert">\
								<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>\
								<strong>' + strong + '!</strong> ' + warn + '.\
						   </div>';
        $(id).append(warning);
    }

    function Uploadfile(file, callback, document) {
        var data = {
            "url": '/upload',
            "data": { "id": $scope.user.id, "file": file, "document": $scope.documentname, "date": new Date() }
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
                    showwarning("All files uploaded", "success", "Done");
                }
            }
            else {
                showwarning(reply.error, "danger", "Failed");
            }
        }, function (response) {
            if (response.status > 0) {
                $scope.errorMsg = response.status + ': ' + response.data;
            }
        }, function (evt) {
            file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
        });
    }

    $scope.uploadFiles = function () {
        // $scope.files = files;
        // $scope.errFiles = errFiles;
        var namecheck = CheckString($scope.documentname, "Name");
        if (namecheck !== undefined) {
            showwarning(namecheck.error);
        }
        else if ($scope.files === undefined || $scope.files.length < 1) {
            showwarning('No files selected for upload');
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

    function FormatDate(document) {
        if (!document.formateddate) {
            var formatdate;
            if (document.date) {
                var date = new Date(document.date);
                formatdate = date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes();
            }
            else {
                formatdate = null;
            }
            document.formateddate = formatdate;
        }
    }

    function LoadMoreFiles() {
        $scope.filter = $scope.filter || {};
        $scope.filter.row = $scope.filter.row || 1;
        $http.post("/getdocuments", { "userid": $scope.user.id, "filter": $scope.filter }).then(function (response) {
            if (response.data.match) {
                $scope.userfiles = $scope.userfiles.concat(response.data.documents);
                for (var i = 0; i < $scope.userfiles.length; i++) {
                    FormatDate($scope.userfiles[i]);
                }
                console.log(response.data.documents);
            }
        });
    }

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
                if ($scope.file === "detailview") {
                    var searchresult = window.location.search.substring(1);
                    var searchparse = JSON.parse('{"' + decodeURI(searchresult).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
                    if (searchparse.id) {
                        console.log(searchparse.id);
                        $http.post("/getdetaildocument", { "userid": $scope.user.id, "document": searchparse.id }).then(function (res) {
                            console.log(res);
                            if (res.data.error) {
                                console.log(res.data.error);
                                return;
                            }
                            $scope.detailfile = res.data.document;
                            $scope.detailfile.tags = $scope.detailfile.tags || [];
                            $scope.usertags = res.data.tags || [];
                            FormatDate($scope.detailfile);
                        });
                    }
                }
                else if ($scope.file === "FileOverview") {
                    $('#fromdt').datetimepicker({ "showTodayButton": true }).on('dp.change', $scope.filterchange).data().DateTimePicker.date(new Date());
                    $('#todt').datetimepicker({ "showTodayButton": true }).on('dp.change', $scope.filterchange).data().DateTimePicker.date(new Date());
                    $scope.LoadMoreFiles = LoadMoreFiles;
                    $scope.fileoverviewrow = 1;
                    LoadMoreFiles();
                }
            }
        });
    }

    //todo API call to get userfiles for FileOverview
    $scope.userfiles = [];
    $scope.filtershow = true;
    $scope.filterBtnText = "<<";
    $scope.filedivclass = "col-md-8";

    $scope.fileclick = function (file) {
        console.log(file.id);
        $window.location = "/detailview.html?id=" + file.id;
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

    /*$scope.detailfile = {
        "id": "1", "url": "https://cdn.freefaxcoversheets.net/samples/basic.jpg", "name": "test", "tags": [
            { "name": "test", "color": "lightblue" }, { "name": "test2", "color": "Cyan" }, { "name": "test3", "color": "DodgerBlue" },
            { "name": "test4", "color": "DeepSkyBlue" }, { "name": "test5", "color": "DarkTurquoise" }
        ], "manualtags": [
            { "name": "manualtest", "color": "blue" }, { "name": "manualtest2", "color": "red" }, { "name": "manualtest3", "color": "orange" }
        ], "generictags": [
            { "name": "test", "color": "lightblue", "activated": false }, { "name": "test2", "color": "Cyan", "activated": false }, { "name": "test3", "color": "DodgerBlue", "activated": false },
            { "name": "test4", "color": "DeepSkyBlue", "activated": false }, { "name": "test5", "color": "DarkTurquoise", "activated": false }
        ], "date": "26/9/2016", "comment": "just something for testing"
    };*/

    /*$scope.generictags = [
            { "name": "test", "color": "lightblue", "activated": false }, { "name": "test2", "color": "Cyan", "activated": false }, { "name": "test3", "color": "DodgerBlue", "activated": false },
            { "name": "test4", "color": "DeepSkyBlue", "activated": false }, { "name": "test5", "color": "DarkTurquoise", "activated": false }
        ];*/

    $scope.saveDetailComment = function () {
        console.log($scope.detailfile.comment);
        //todo api call to save comment
    };

    $scope.filterchange = function () {
        var currentfilter = {};
        if ($scope.contentfilterCheckbox) {
            currentfilter.content = $scope.contentfilterText;
        }
        if ($scope.datefilterCheckbox) {
            currentfilter.date = { "from": $('#fromdt').data().DateTimePicker.date()._d, "to": $('#todt').data().DateTimePicker.date()._d };
        }
        if ($scope.namefilterCheckbox) {
            currentfilter.name = $scope.namefilterText;
        }
        if (
            $scope.tagfilterCheckbox) {
            currentfilter.tag = $scope.tagfilterText;
        }
        if ($scope.filtertimeoutrunning) {
            clearTimeout($scope.filtertimeout);
        }
        $scope.filtertimeoutrunning = true;
        $scope.filtertimeout = setTimeout(function () {
            console.log(currentfilter);
            $scope.filter = currentfilter;
            $scope.filtertimeoutrunning = false;
            $scope.userfiles = [];
            $scope.fileoverviewrow = 1;
            LoadMoreFiles();
        }, 2500);
    };

    $scope.generictagclick = function (clickedtag) {
        //console.log(clickedtag);
        //Todo some kind of API call to update generictags of the current detailfile and get the returned value (currently going to do it only clientsided for testing)
        /*for (var i = 0; i < $scope.detailfile.generictags.length; i++) {
            if ($scope.detailfile.generictags[i] === clickedtag) {
                $scope.detailfile.generictags[i].activated = !$scope.detailfile.generictags[i].activated;
                //+getting current active generictags from file
            }
        }*/
        $scope.detailfile.tags.push(clickedtag);
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
            $scope.usertags.push(costumTag); //todo needs to be changed to an apicall with a detailfile as return value
        }
    };

    //todo need to make a way to delete manual added tags


    //todo reactivate this
    init();
});