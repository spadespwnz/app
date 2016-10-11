angular.
  module('netApp').
    component('buildingList',{
      templateUrl: 'building-list/building-list.template.html'
    ,
    controller: function netController($http) {
      var self = this;
      this.orderProp = 'cost';
      $http.get('/net/buildings').then(function(response){

        self.buildings = response.data;
      });
  }
});