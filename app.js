
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');



var routes = require('./routes/index');

app.use('/', routes)

fs.readdirSync(__dirname+'/routes').forEach(function(file){
	if (file.substr(-3) == '.js'){
		name = file.slice(0,-3);
		if (name !== 'socket'){
			var temp = require('./routes/'+name)
			console.log("name: "+name)
			app.use('/'+name, temp)
		}
	}
});

var index = require('./routes/index')
var users = require('./routes/users');
var pretty = require('./routes/pretty');

var socket_controller = require('./routes/socket');
var chat = io
	.of('/')
	.on('connection', function(socket){
		socket_controller.respond(chat, socket);
	});








http.listen((process.env.PORT || 3000), function(){
  console.log('listening on *:3000');
});