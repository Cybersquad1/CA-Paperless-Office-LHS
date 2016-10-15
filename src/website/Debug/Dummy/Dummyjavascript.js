var user = "Dummy";
var pass = "justAtest";
var app = angular.module("myapp",[]);

var logindata = {
    Name: "Dummy",
    Password: "test"
};
var data = JSON.stringify(logindata);

app.controller("mijnCtrl",function ($scope,$http ){
    $scope.click = function(){
        console.log(data);
        $http.post("http://localhost/register", data).then(function succesCallback(response) {
            console.log(response);
        });


        /*$http{
         method: 'POST',
         url: "http://localhost/register",
         data:
         }*/

    };
});