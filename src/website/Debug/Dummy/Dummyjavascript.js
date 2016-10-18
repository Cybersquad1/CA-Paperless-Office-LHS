var app = angular.module("myapp",[]);

var logindata = {
    username: "Dummy",
    password: "test"
};
var Registerdata = {
    username: "Dummy",
    password: "test",
    email: "Dummy@gmail.be"
}


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