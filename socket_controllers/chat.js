var ss = require('socket.io-stream');

module.exports.respond = function(endpoint,socket){

    // this function now expects an endpoint as argument

	socket.on('disconnect', function(){

	});
	socket.on('chat message', function(msg){
		console.log(msg)
		var name = msg['name'];
		var content = msg['message'];
		console.log(name+': ' + content);
		endpoint.emit('chat message', msg);
	});

}