var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require('fs');
var uid = require('mongodb').ObjectID;
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');
var active="stream";
var https = require('https');
var querystring = require('querystring');
var sessionMap = [];

require('dotenv').config();
var bot_id = process.env.BOT_ID;
var bot_secret = process.env.BOT_SECRET;
/* GET home page. */
router.get('/', function(req, res) {
  res.render('pages/stream')
});

router.post('/request/gameslist', function(req, res) {
	var db = req.db;
	var console = req.body.console;
	db.collection('stream_games').find( {"type":console}).toArray(function(err, cursor){
		if (err){
			res.send("Error loading images");
		}
		else{
			if (cursor[0]){
				if (cursor[0].games){
					res.send({'request':'success', 'games':cursor[0].games, 'console': console});
				}
				else{
					res.send({'request':'fail','error': 'No games'});
				}
			}
			else{
				res.send({'request':'fail','error': 'No console'});
			}
		}
	});

});

router.get('/gameslist/:console', function(req, res) {
	var db = req.db;
	var console = req.params.console;
	db.collection('stream_games').find( {"type":console}).toArray(function(err, cursor){
		if (err){
			res.send("Error loading images");
		}
		else{
			if (cursor[0]){
				if (cursor[0].games){
					res.render('pages/gameslist', {games : cursor[0].games, console: console});
				}
				else{
					res.send("no games");
				}
			}
			else{
				res.send("No games");
			}
		}
	});

});

router.get('/next', function(req, res) {
	
	var code = req.param.code;

	res.render('pages/stream_next', {client_id: bot_id, code: code});
});


router.get('/garden', function(req, res) {
	var db = req.db;
	var code = req.param.code;
	var sessionID = req.sessionID;

	if (sessionMap.sessionID){
		//test auth
		var auth_token = sessionMap.sessionID.token;

		var user = sessionMap.sessionID.user


		db.collection('points').find( {"user":user}).toArray(function(err, cursor){
			var points;
			if (err){
				points = 0;
			}
			else{
				
				if (cursor[0]){
					if (cursor[0].points){
						points = cursor[0].points;
					}
					else{
						
						points = 0;
					}
				}
				else{

					points = 0;
					
				}
			}
			
			res.render('pages/garden', {client_id: bot_id, logged_in: 'true', user: user, points: points, redirect: process.env.REDIRECT_URL});
		});
		
		
	
		
		return;
	}
	
	res.render('pages/garden', {client_id: bot_id,code: code, logged_in: 'false',user: null, points: 0, redirect: process.env.REDIRECT_URL});
});
router.get('/garden/request/logout', function(req, res) {
	var sessionID = req.sessionID;

	delete sessionMap.sessionID;

	res.send({success: true});

});
router.post('/garden/auth', function(req,res){
	var db = req.db;
	var code = req.body.code;

	var sessionID = req.sessionID;

	console.log("Sesh"+sessionID);
	var request_body = "";
	request_body += "client_id="+bot_id;
	request_body += "&client_secret="+bot_secret;
	request_body += "&grant_type=authorization_code";
	request_body += "&redirect_uri="+process.env.REDIRECT_URL;
	request_body += "&code="+code;
	request_body += "&state=lol";

	var post_data = querystring.stringify({
		'client_id':bot_id,
		'client_secret':bot_secret,
		'grant_type':'authorization_code',
		'redirect_uri':process.env.REDIRECT_URL,
		'code':code,
		'state':'lol'

	});
	post_data_json = { client_id: bot_id, client_secret: bot_secret, grant_type: "authorization_code", redirect_uri: process.env.REDIRECT_URL, code: code, state: "lol"};


	
	var options = {
		host: 'api.twitch.tv',
		path: '/kraken/oauth2/token',
		method: 'POST',
		headers:{
			'Content-Type':'application/json',
			'Client-ID':bot_id,
		}
	};
	var body = "";
	var auth_req = https.request(options, function(auth_res){
		auth_res.on('data', function (chunk){
			body += chunk;
		});
		auth_res.on('end',function(){
			if (JSON.parse(body).access_token){
				var auth_token = JSON.parse(body).access_token;
				sessionMap.sessionID = {};
				sessionMap.sessionID.token = JSON.parse(body).access_token;
				https.get({
					host: 'api.twitch.tv',
					path: '/kraken/',
					headers: {'Authorization': 'OAuth '+auth_token}
				}, function(auth_token_query){
					var query_body = '';
					auth_token_query.on('data', function(d){
						query_body += d;
					});
					auth_token_query.on('end', function(){

						var parsed = JSON.parse(query_body);
						var valid = parsed.token.valid;
						if (valid == true){
							var user = parsed.token.user_name;
							sessionMap.sessionID.user = user;
							db.collection('points').find( {"user":user}).toArray(function(err, cursor){
								var points;
								if (err){
									points = 0;
								}
								else{
									
									if (cursor[0]){
										if (cursor[0].points){
											points = cursor[0].points;
										}
										else{
											
											points = 0;
										}
									}
									else{

										points = 0;
										
									}
								}
								res.send({success: true, user: user , points: points});
		
							});
							
							
						}
						else{
							res.send({success: false});
						}
					});
				})
				
			}
			else{
				res.send({success: false});
			}
		})


	});
	auth_req.write(JSON.stringify(post_data_json));
	auth_req.end();

})
router.get('/garden/request/test', function(req,res){
	var sessionID = req.sessionID;

	console.log("Sesh"+sessionID);
	console.log("test from: "+sessionMap.sessionID);
	res.send("ok then");

})
router.get('/gameslist/', function(req, res) {
	var db = req.db;

	db.collection('stream_games').find( {"type":"console_list"}).toArray(function(err, cursor){
		if (err){
			res.send("Error loading images");
		}
		else{
			if (cursor[0]){
				if (cursor[0].consoles){
					res.render('pages/consolelist', {consoles : cursor[0].consoles});
				}
				else{
					res.send("no consoles");
				}
			}
			else{
				res.send("No consoles");
			}
		}
	});

});

router.get('/smm/', function(req, res) {
	var db = req.db;

	db.collection('SMM').find( {}).toArray(function(err, cursor){
		if (err){
			res.send("Error loading images");
		}
		else{
			if (cursor){
				res.render('pages/smm', {levels : cursor});

			}
			else{
				('pages/smm', {levels : []})
			}
		}
	});

});
router.get('/points', function(req,res){
	var db=req.db;

	var db = req.db;
	
	db.collection('points').find().toArray(function(err, cursor){
		if (err){
			res.send("Error loading");
		}
		else{
			if (cursor){
				res.render('pages/stream_points',{list: cursor});
			}
			else{
				res.send("No Points Found");
			}
			
		}
	});
	

	
});


router.get('/suggestions/', function(req, res) {
	var db = req.db;

	db.collection('suggestion').find( {"type":"suggest_list"}).toArray(function(err, cursor){
		if (err){
			res.send("Error loading images");
		}
		else{
			if (cursor[0]){
				if (cursor[0].game_suggestions){
					res.render('pages/suggestlist.ejs', {games : cursor[0].game_suggestions});
				}
				else{
					res.send("no suggestions");
				}
			}
			else{
				res.send("No suggestions");
			}
		}
	});

});

router.use(function(req,res,next){
	var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
	var db = req.db;
	if (token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		        res.redirect('/stream');  
		    } else {
		    	dbutils.db_find(db, 'admin', {"type":'admin_list'},function(find_result){
					if (find_result.fail == true){
						//Error checking if account already exists
						res.send({"request":"fail", "error":"Failed to check admin list"});
					}
					else{
						if(find_result.records.length > 1){
							res.send({"request":"fail", "error":"Failed to check admin list"});
						}
						else if (find_result.records.length == 0){

							res.send({"request":"fail", "error":"No admins found"});
						}
						else{
							var admins = find_result.records[0].admins;
							if (admins.indexOf(decoded.email) < 0){
								res.send({"request":"fail","error":"you are not an admin"});
							}
							else{
								req.decoded = decoded; 
	        					next();
							}
						}
					}
				});
		    }
		});
	}
	else{

		res.redirect('/users');
	}
});

router.get('/addlist', function(req, res) {
  res.render('pages/stream_addlist')
});
router.get('/removelist', function(req, res) {
  res.render('pages/stream_removelist')
});

router.get('/admin', function(req, res) {
  res.render('pages/stream_admin')
});

router.post('/request/reset_points', function(req,res){
	var db=req.db;

	var db = req.db;
	
	db.collection('points').find().toArray(function(err, cursor){
		if (err){
			res.send("Error loading images");
		}
		else{
			if (cursor){
				for (var i = 0;i<cursor.length;i++){
					var user = cursor[i].user;
					db.collection('points').update( {"user":user}, {$set: {points: 0}});
				}
			}
			
		}
	});
	res.send("lol");

	
});
router.post('/request/complete_game', function(req,res){
	var db=req.db;
	email = req.decoded.email;
	var time = req.body.time;
	var game = req.body.game;
	var desc = req.body.desc;

	var db = req.db;
	db.collection('stream_games').update({'games.game': game}, {$set: {'games.$.complete': true, 'games.$.time': time, 'games.$.desc': desc}});
	
	
});
router.post('/request/remove_console', function(req,res){
	var db=req.db;
	email = req.decoded.email;

	var console = req.body.console;

	var db = req.db;
	db.collection('stream_games').remove({"type":console});
	db.collection('stream_games').update({"type":"console_list"}, {$pull:{consoles:console}});
	
	
});
router.post('/request/add_game', function(req,res){
	var db=req.db;
	email = req.decoded.email;
	var game = req.body.game;
	var console = req.body.console;
	var exp = req.body.exp;
	var db = req.db;
	dbutils.db_upsert(db, 'stream_games', {"type":"console_list"}, {"consoles":console}, function(in_push_result){
		if (in_push_result.fail == true){
			//Error adding notelist for user
			
		}
		else{
			
		}
	});
	dbutils.db_upsert(db, 'stream_games', {"type":console}, {"games":{game: game, experience: exp}}, function(in_push_result){
		if (in_push_result.fail == true){
			//Error adding notelist for user
			res.send({'success': 'false', "error":'failed to add to db'});	
		}
		else{
			res.send({'success': 'true'});
		}
	});
	
	
});

module.exports = router;