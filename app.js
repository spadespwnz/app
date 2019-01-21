
var express = require('express');
app = express();
require('dotenv').config();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var expressDirectory = require('serve-index');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var MongoClient = require('mongodb').MongoClient
var uid = require('mongodb').ObjectID;
var url =  process.env.MONGODB_URI || 'mongodb://localhost:27017/app';
var data_base;
var jwt = require('jsonwebtoken');
var prompt = require('prompt');
var dbutils = require('./utils/dbutils');
var busboy = require('connect-busboy');
var cors = require('cors');
var bot = require('./bot.js');

MongoClient.connect(url, function(err,db){
	data_base = db;
	bot.set_db(data_base);
});

app.use(busboy());
app.use(session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: true
}));
//app.use('/images', express.static(__dirname + '/images'));
//app.use('/images', expressDirectory(__dirname + '/images'));
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({limit: '50mb'}))
app.use(cookieParser())
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.set('jwt_secret', process.env.JWT_SECRET || 'randosecretkey');
app.use(cors({credentials: true, origin: true}));

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
var friends_controller = require('./socket_controllers/friends');
var song_controller = require('./socket_controllers/song');
var overlay_controller = require('./socket_controllers/overlay');
bot.socket_connect();

var chat = io
	.of('/chat')
	.on('connection', function(socket){

		chat_controller.respond(chat, socket);
	});

var stream = io
	.of('/stream')
	.on('connection', function(socket){
		console.log("Connection in stream");

		stream_controller.respond(stream, socket, data_base);
	});
var song = io
	.of('/song')
	.on('connection', function(socket){
		console.log("Connection in song");

		song_controller.respond(song, socket);
	});


var friends = io
	.of('/friends')
	.on('connection', function(socket){

		friends_controller.respond(friends, socket, data_base, io);
	});


var overlay = io
	.of('/overlay')
	.on('connection', function(socket){

		overlay_controller.respond(overlay, socket, data_base, io);
	});




var webServer = http.listen((process.env.PORT || 3000), function(){
  //console.log('listening on *:3000');
  prompt.start();
});

//var socketServer = io.listen(webServer);
//var rtcServer = easyrtc.listen(app, socketServer);

getCommand();
function getCommand(){
	prompt.get(['command', 'args'], function(err, result){
		if (err){
			console.log("Error: "+err)

		}
		else{
			console.log("Running "+result.command+" with args: "+result.args);
			runCommand(result.command, result.args);
		}
		getCommand();
	});
}
function runCommand(command, args){
	switch(command){
		case 'print':
			print(args);
			break;
		case 'exit':
			process.exit();
			break;

		case 'restart':
			webServer.close();
			const exec = require('child_process');
			const child = exec.spawn('cmd',['/c','nodemon start'],{detached: true, stdio: ['ignore', 'ignore', 'ignore']});
			child.unref();
			process.exit();
			break;
		case 'fix titles':
			addIdsToTitles();
			break;
		case 'fix comments':
			addIdsToComments();
		case 'add admin':
			addAdmin(args);

		default:
			console.log("Command '"+command+"' not found.");
	}
}

function print(args){
	console.log(args);
}
function addAdmin(new_admin){
	dbutils.db_upsert(data_base, 'admin', {"type":"admin_list"},{"admins":new_admin}, function(upsert_result){
		if (upsert_result.fail == true){
			console.log("Error adding admin");
		}
		else{
			console.log("Success: "+new_admin+" is now an admin.");
		}
	});
}
function addIdsToTitles(){

	/*
	data_base.collection('lists').update({'title':'randolist3'}, {$set: {content:[]} }, false, true);
	data_base.collection('lists').update({'title':'randolist3'}, {$push: {'content':{"id":"7"}} }, false, true);
	data_base.collection('lists').updateMany({'content.id':{$exists: true}}, {$set: {'content.$':{}} }, false, true);
	data_base.collection('lists').updateMany({'content':{}}, {$pull: {'content':{$in:[{}]} }}, false, true);
	dbutils.db_find(data_base, 'lists', {'content.id':{ $exists: 'true' }}, function(set_result){
		if (set_result.fail == true){
			//Error changing note text
			console.log("Error"+set_result.error)
		}
		else{
			for (var i = 0; i<set_result['records'].length;i++){

				console.log(set_result['records'][i]);
			}

		}
	});
	*/

	//data_base.collection('lists').updateMany({'content.title':{$exists: true}}, {$set: {'content.$.id':new uid() } }, {'multi':true});
	data_base.collection('lists').find({}).forEach(function (doc){
		if (doc.content){
			doc.content.forEach(function (listItem){

				listItem.id = new uid();
				console.log(listItem);
			});
		}
		data_base.collection('lists').save(doc, function(err, record){
			console.log("Error:"+err)
			console.log("Record:"+record)
		});
	});

}
function addIdsToComments(){
	data_base.collection('lists').find({}).forEach(function (doc){
		doc.content.forEach(function (listItem){
			if (listItem.comments){
				listItem.comments.forEach(function (comment){

					comment.id = new uid();
					console.log(comment);
				})
			}

		});
		data_base.collection('lists').save(doc, function(err, record){
			console.log("Error:"+err)
			console.log("Record:"+record)
		});
	});
}
