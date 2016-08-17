
var express = require('express');
app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var MongoClient = require('mongodb').MongoClient
var url =  process.env.MONGODB_URI || 'mongodb://localhost:27017/app';
var data_base;
var jwt = require('jsonwebtoken');
MongoClient.connect(url, function(err,db){
	console.log("Connected to DB");
	data_base = db;
});

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(cookieParser())
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('jwt_secret', 'randosecretkey');

app.use(function(req,res,next){
    req.db = data_base;
    next();
});


var routes = require('./routes/index');

app.use('/', routes)

fs.readdirSync(__dirname+'/routes').forEach(function(file){
	if (file.substr(-3) == '.js'){
		name = file.slice(0,-3);
		if (name !== 'socket'){
			var temp = require('./routes/'+name)
			app.use('/'+name, temp)
		}
	}
});



var chat_controller = require('./socket_controllers/chat');
var stream_controller = require('./socket_controllers/stream');
var chat = io
	.of('/chat')
	.on('connection', function(socket){

		chat_controller.respond(chat, socket);
	});
var stream = io
	.of('/stream')
	.on('connection', function(socket){

		stream_controller.respond(stream, socket);
	});








http.listen((process.env.PORT || 3000), function(){
  console.log('listening on *:3000');
});