var ss = require('socket.io-stream');
var fs = require('fs');
module.exports.respond = function(endpoint,socket){

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



}