var ss = require('socket.io-stream');
var socket_jwt = require('socketio-jwt');
var dbutils = require('../utils/dbutils');
var jwt = require('jsonwebtoken');
var uid = require('mongodb').ObjectID;
module.exports.respond = function(endpoint,socket, db, io){

    // this function now expects an endpoint as argument

	socket.on('disconnect', function(){

	});
	socket.on('setup', function(token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		       console.log('Token Failed Authentication')    
		    } else {
		    	email = decoded.email;
		    	dbutils.db_find(db, 'user:'+email, {"type":"friends"},function(find_result){
					if (find_result.fail == true){
						//Error finding list
						console.log('Failed to find friends');
					}
					else{
						if(find_result.records.length > 1){
							console.log('Failed to find friends');
						}
						else if (find_result.records.length == 0){
							//No friend convos to join
						}
						else{


							my_friends = find_result.records[0].my_friends;
							for (friend in my_friends){
								convo_id = my_friends[friend].convo_id;
								socket.join(convo_id);
								//console.log('convo:' +my_friends[friend].convo_id);
								//endpoint.to(convo_id).emit('joined',"entered: "+convo_id);

								//console.log("Clients in room: "+io.sockets.adapter.rooms);
							}
							var rooms = io.sockets.adapter.rooms;
							for (room in rooms){
								console.log("Room: "+rooms[room].length);
							}

						}
					}
				});   
		    }
		});	
	});

	socket.on("chat_msg", function(message){


	});
	


}