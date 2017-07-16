//var ss = require('socket.io-stream');
//var fs = require('fs');

var dbutils = require('../utils/dbutils');
var jwt = require('jsonwebtoken');
var uid = require('mongodb').ObjectID;
var util = require('util');
module.exports.respond = function(endpoint,socket, db, io){


	socket.on('setup', function(code){
	//	endpoint.emit('current_song', song);
		socket.join(code);
		//socket.join("LOL");


	});
	socket.on('msg', function(content){

		endpoint.to(content.code).emit('client_message', content.msg);

	})



}