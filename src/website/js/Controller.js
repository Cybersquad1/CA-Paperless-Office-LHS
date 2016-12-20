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
                    ResetFiles();
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

    $scope.deleteFiles = function () {
        $http.post("/deletefiles", { userid: $scope.user.id, document: $scope.detailfile.id }).then(function (res) {
            if (res.data.error) {
                console.log(res.data.error);
                return;
            }
            GoToFiles();
        });
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

    function ResetFiles() {
        $scope.filter.row = 0;
        LoadMoreFiles();
    }

    function LoadMoreFiles() {
        $scope.filter = $scope.filter || {};
        $scope.filter.row = $scope.filter.row || 0;
        $scope.filter.row++;
        $http.post("/getdocuments", { "userid": $scope.user.id, "filter": $scope.filter }).then(function (response) {
            if (response.data.match) {
                if ($scope.filter.row === 1) {
                    $scope.userfiles = [];
                }
                $scope.userfiles = $scope.userfiles.concat(response.data.documents);
                for (var i = 0; i < $scope.userfiles.length; i++) {
                    FormatDate($scope.userfiles[i]);
                }
                console.log(response.data.documents);
            }
            else {
                console.log(response);
                $scope.userfiles = [];
            }
        });
    }

    function LoadSuggestions(currentdetailfile) {
        //console.log(tags);
        $scope.userfiles = [];
        var tags = currentdetailfile.tags;
        console.log(tags);

        for (let i = 0; i < tags.length; i++) {
            var tagfilter = {};
            tagfilter.tag = tags[i].tag;
            $scope.userfiles = [];
            //console.log(tagfilter);
            $http.post("/getdocuments", { "userid": $scope.user.id, "filter": tagfilter }).then(function (response) {
                //console.log(response.data);
                if (response.data.match) {
                    for (var p = 0; p < response.data.documents.length; p++) {
                        var found = false;
                        if (response.data.documents[p].id == currentdetailfile.id) {
                            found=true;
                        } else {
                            for (var o = 0; o < $scope.userfiles.length; o++) {                                
                                if ($scope.userfiles[o].id == response.data.documents[p].id) {
                                    found = true;
                                    break;
                                }                                
                            };
                        }
                        if (!found) {
                            $scope.userfiles.push(response.data.documents[p]);
                        }

                        /*if (!($scope.userfiles.hasOwnProperty(response.data.documents[p])) || !(currentdetailfile === response.data.documents[p])){
                            $scope.userfiles.push(response.data);
                        }*/
                    }
                    //}
                    for (var m = 0; m < $scope.userfiles.length; m++) {
                        FormatDate($scope.userfiles[m]);
                    }
                    //console.log(response.data.documents);
                }
            });
        }
    }

    function init() {
        var split = $window.location.pathname.split("/");
        split = split[split.length - 1].split(".");
        $scope.file = split[0];
        $http.get('/getuser').then(function (response) {
            //console.log(response.data);
            $scope.loggedin = response.data.loggedin;
            if (!$scope.loggedin && ($scope.file === "FileOverview" || $scope.file === "detailview")) {
                //console.log("error");
                $window.location.href = '/index.html';
            }
            else if ($scope.loggedin) {
                $scope.user = response.data.user;
                if ($scope.file === "detailview") {
                    var searchresult = window.location.search.substring(1);
                    var searchparse = JSON.parse('{"' + decodeURI(searchresult).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}');
                    if (searchparse.id) {
                        //console.log(searchparse.id);
                        $scope.detailviewId = searchparse.id;
                        detailviewchange();
                        //todo function for lus tags ---> concat                     STILL DOING

                    }
                }
                else if ($scope.file === "FileOverview") {
                    $('#fromdt').datetimepicker({ "showTodayButton": true }).on('dp.change', $scope.filterchange).data().DateTimePicker.date(new Date());
                    $('#todt').datetimepicker({ "showTodayButton": true }).on('dp.change', $scope.filterchange).data().DateTimePicker.date(new Date());
                    $scope.datefilterCheckbox = false;
                    $scope.LoadMoreFiles = LoadMoreFiles;
                    //$scope.fileoverviewrow = 1;
                    //LoadMoreFiles();
                }
            }
        });
    }

    function detailviewchange() {
        $http.post("/getdetaildocument", { "userid": $scope.user.id, "document": $scope.detailviewId }).then(function (res) {
            //console.log(res);
            if (res.data.error) {
                console.log(res.data.error);
                return;
            }
            $scope.detailfile = res.data.document;
            $scope.detailfile.tags = $scope.detailfile.tags || [];
            $scope.usertags = res.data.tags || [];
            FormatDate($scope.detailfile);
            $scope.downloadfiles = res.data.files;
            if ($scope.detailfile.tags) {
                LoadSuggestions($scope.detailfile);
            }
            //else {
            //console.log($scope.detailfile);
            //}
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

    $scope.saveDetailContent = function () {
        console.log($scope.detailfile.content);
        //todo api call to save content
    };

    $scope.filterchange = function (value) {
        console.log(value);
        if (value) {
            if (typeof value === "object") {
                $scope.datefilterCheckbox = true;
            }
            else if (typeof value === "string") {
                switch (value) {
                    case 'content':
                        if ($scope.contentfilterText === "") {
                            $scope.contentfilterCheckbox = false;
                        } else {
                            $scope.contentfilterCheckbox = true;
                        }
                        break;
                    case 'name':
                        if ($scope.namefilterText === "") {
                            $scope.namefilterCheckbox = false;
                        }
                        else {
                            $scope.namefilterCheckbox = true;
                        }
                        break;
                    case 'tag':
                        if ($scope.tagfilterText === "") {
                            $scope.tagfilterCheckbox = false;
                        } else {
                            $scope.tagfilterCheckbox = true;
                        }
                        break;
                }
            }
        }
        var currentfilter = {};
        if ($scope.contentfilterCheckbox) {
            currentfilter.content = $scope.contentfilterText;
        }
        if ($scope.datefilterCheckbox) {
            if ($('#fromdt').data().DateTimePicker && $('#todt').data().DateTimePicker) {
                currentfilter.date = { "from": $('#fromdt').data().DateTimePicker.date()._d.toString(), "to": $('#todt').data().DateTimePicker.date()._d.toString() };
                if (currentfilter.date.from === currentfilter.date.to) {
                    $scope.datefilterCheckbox = false;
                    delete currentfilter.date;
                }
            }
            else {
                $scope.datefilterCheckbox = false;
            }
        }
        if ($scope.namefilterCheckbox) {
            currentfilter.name = $scope.namefilterText;
        }
        if ($scope.tagfilterCheckbox) {
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
            //$scope.userfiles = [];
            $scope.filter.row = 0;
            LoadMoreFiles();
        }, 1500);
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
        //$scope.detailfile.tags.push(clickedtag);
        $http.post('/addtagtodocument', { "document": $scope.detailviewId, "tag": clickedtag.id, "userid": $scope.user.id }).then(function (response) {
            //console.log(response);
            detailviewchange();
        });
    }

    $scope.makeTag = function () {
        var tagCheck = CheckTag($scope.customtagname);
        if (tagCheck !== undefined) {
            //todo showing error message
        }
        else {
            $scope.customtagcolor = $scope.customtagcolor || "#000000";
            var costumTag = { "name": $scope.customtagname, "color": $scope.customtagcolor };
            console.log("new tag is:");
            console.log(costumTag);
            // $scope.usertags.push(costumTag); //todo needs to be changed to an apicall with a detailfile as return value
            $http.post('/addtag', { "name": $scope.customtagname, "color": $scope.customtagcolor, "userid": $scope.user.id }).then(function (response) {
                //console.log(response);
                detailviewchange();
            });
        }
    };

    //todo need to make a way to delete manual added tags

    init();
});