//var ss = require('socket.io-stream');
//var fs = require('fs');

var dbutils = require('../utils/dbutils');
var jwt = require('jsonwebtoken');
var uid = require('mongodb').ObjectID;
var util = require('util');
module.exports.respond = function(endpoint,socket, db){


	/*
    // this function now expects an endpoint as argument
    var file = fs.createReadStream('public/stream/testfile.txt');
    var stream = ss.createStream();
    ss(endpoint).emit('file',stream);
    file.pipe(stream);
    file.pipe(process.stdout);
	socket.on('disconnect', function(){

	});
	socket.on('send_stream', function(){
		console.log("stream requested");
		ss(socket).emit('file');
	});
	*/
	socket.on('song_change', function(user,song,stage){
		console.log("Message from bot in sockets");
		endpoint.emit('set_song',user,song,stage);
		console.log("Song msg emit");
		//endpoint.to('song_channel').emit('add_song', song);
	});

	socket.on('res', function(success,user,msg){
		endpoint.emit('res',success,user,msg);

	});



}