angular.
	module('netApp').
	config(['$locationProvider', '$routeProvider',
		function config($locationProvider, $routeProvider){
			$locationProvider.hashPrefix('!');

			$routeProvider.
				when('/buildings', {
					template: '<building-list></building-list>'

				}).
				when('/buildings/:buildingId',{
					template: '<building-detail></building-detail>'
				}).
				otherwise('/buildings');

		}
	]);