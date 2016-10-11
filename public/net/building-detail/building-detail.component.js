angular.
	module('buildingDetail').
	component('buildingDetail',
	{
		template: "Details for <span>{{$ctrl.buildingId}}</span>",
		controller:['$routeParams',
			function BuildingDetailController($routeParams){
				this.buildingId = $routeParams.buildingId;
			}
		]
	});