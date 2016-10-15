var user = "Dummy";
var pass = "justAtest";
var app = angular.module("myapp",[]);

var da = {
    Name: "Dummy",
    Password: "test"
};
var data = JSON.stringify(da);

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