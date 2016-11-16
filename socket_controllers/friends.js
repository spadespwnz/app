//var ss = require('socket.io-stream');
var dbutils = require('../utils/dbutils');
var jwt = require('jsonwebtoken');
var uid = require('mongodb').ObjectID;
var util = require('util');
var client_list = {};
var user_list = {};

module.exports.respond = function(endpoint,socket, db, io){

    // this function now expects an endpoint as argument

	socket.on('disconnect', function(){
		var user = client_list[socket.id];
		delete client_list[''+socket.id];
		delete user_list[user];
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
							client_list[socket.id] = email;
							user_list[email] = socket.id;
							my_friends = find_result.records[0].my_friends;

							for (friend in my_friends){
								convo_id = my_friends[friend].convo_id;
								socket.join(convo_id);

								//console.log(io.of('/friends').adapter.rooms[''+convo_id].sockets[socket.id])
								//console.log('convo:' +my_friends[friend].convo_id);
								//endpoint.to(convo_id).emit('joined',"entered: "+convo_id);

								//console.log("Clients in room: "+io.sockets.adapter.rooms);
							}
							//console.log(client_list)
							/*console.log(socket.id+' rooms:');
							io.sockets.connected[socket.id].rooms.forEach(function(room){
									console.log("     ",room);
							});*/
							/*var rooms = io.nsps['/friends'].adapter.rooms;
							for (room in rooms){
								console.log("Room: "+util.inspect(rooms[room],false,null));
							}*/

						}
					}
				});   
		    }
		});	
	});

	socket.on('request_convo_list', function(token){
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
							friendlist_to_return = [];
							my_friends = find_result.records[0].my_friends;
							for (friend in my_friends){
								var online = false;
								if (user_list[my_friends[friend].email]){
									online = true;
								}
								var current_friend = {email: my_friends[friend].email, convo_id: my_friends[friend].convo_id, online: online};
								friendlist_to_return.push(current_friend);
							}
							socket.emit('updated_convo_list', friendlist_to_return);
						}
					}
				});
		    }
		});

	});

	socket.on("chat_msg", function(message){
		if (message.convo_id && message.content){
			convo_id = message.convo_id;
			message_content = message.content;
			if (io.of('/friends').adapter.rooms[''+convo_id].sockets[socket.id]){
				var output_message = {email: client_list[socket.id], content: message_content, convo_id: convo_id};
				endpoint.to(convo_id).emit("msg", output_message);
			}
			else{
				//Send some error
			}
		}


	});
	


}