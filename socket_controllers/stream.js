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
	socket.on('new_song', function(song){
		console.log("Message from bot in sockets");
		endpoint.to('song_channel').emit('add_song', song);


	});
	socket.on('skip', function(){
		endpoint.to('song_channel').emit('skip');


	});


	socket.on('setup', function(token){

		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		       console.log('Token Failed Authentication')    
		    } else {
		    	email = decoded.email;
		    	dbutils.db_find(db, 'admin', {"type":'admin_list'},function(find_result){
					if (find_result.fail == true){
						//Error checking if account already exists
						
						socket.close();
					}
					else{
						if(find_result.records.length > 1){
							socket.close();
						}
						else if (find_result.records.length == 0){

							socket.close();
						}
						else{
							var admins = find_result.records[0].admins;
							if (admins.indexOf(decoded.email) < 0){
								socket.close();
							}
							else{

								socket.join('song_channel');
	        					
							}
						}
					}
				});
		    }
		});	
	});


}