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
var braintree = require('braintree');
var gateway = braintree.connect({
	accessToken: process.env.BRAINTREE_TOKEN,
});


require('dotenv').config();
var bot_id = process.env.BOT_ID;
var bot_secret = process.env.BOT_SECRET;


var default_options = {"name_length": [3],"chao_type": [2],"color":[0], "texture":[0],
"two_tone": [0], "shiny": [0], "body_type": [0], "animal_body": [0],
"eyes": [0], "mouth": [0], "feet": [1], "arms":[0], "ears":[0],
"forehead":[0], "horns":[0], "legs":[0], "tail":[0], 
"wings":[0],"face":[0], "hat":[0]};

var shop = { char_slot: [1,10,20,30], attribute_point_price: 25, body_type_range_low: 0, body_type_range_high: 3, body_type_prices: [0,300,1000,500],
chao_type_range_low: 2, chao_type_range_high: 25, chao_type_prices: [0,0,0,300,300,50,50,50,50,50,50,100,100,100,100,100,100,100,100,100,100,100,100,750,750,750],
color_range_low: 0, color_range_high: 82, color_prices: [0,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,25,75,75,75,75,150,75,75,75,75,
75,75,75,200,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,75,200,75,75,75,75,75,75,75,75,150,150,75,75,75,
200,150,75,75,75,75,75,75,75,75,75,75,250,75,75,75], texture_range_low: 0, texture_range_high: 125};
/*
"chao_options.name_length": 1,"chao_options.type": 2,"chao_options.color":0, "chao_options.texture":0,
							"chao_options.two_tone": 0, "chao_options.shiny": 0, "chao_options.body_type": 0, "chao_options.animal_body": 0,
							"chao_options.eyes": 0, "chao_options.mouth": 0, "chao_options.feet": 1, "chao_options.arms":0, "chao_options.ears":0,
							"chao_options.forehead":0, "chao_options.horns":0, "chao_options.legs":0, "chao_options.tail":0, 
							"chao_options.wings":0,"chao_options.face":0, "chao_options.hat":0
*/

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
	if (sessionMap[sessionID]){
		//test auth
		var auth_token = sessionMap[sessionID].token;

		var user = sessionMap[sessionID].user


		db.collection('chao_garden').find( {"user":user}).toArray(function(err, cursor){
			var user_data = {};;
			if (err){
				
				
			}
			else{
				
				if (cursor[0]){
					user_data = cursor[0];
				}
				else{
					user_data = {"user":user, coins:0, emeralds: 0, points: 0,chao:{}, chao_options: default_options};
					db.collection('chao_garden').insert(user_data);
					//dbutils.db_upsert(db, 'chao_garden', {user:user}, {coins:0, emeralds: 0, chao:{}, chao_options: {}}, function(in_push_result){});
					
				}
			}
			
			res.render('pages/garden', {client_id: bot_id, logged_in: 'true', shop: shop,user_data: user_data, redirect: process.env.REDIRECT_URL});
		});
		
		
	
		
		return;
	}
	
	res.render('pages/garden', {client_id: bot_id,code: code, logged_in: 'false', shop: {}, user_data: {}, redirect: process.env.REDIRECT_URL});
});
router.get('/garden/request/logout', function(req, res) {
	var sessionID = req.sessionID;

	delete sessionMap[sessionID];

	res.send({success: true});

});
router.post('/garden/auth', function(req,res){
	var db = req.db;
	var code = req.body.code;

	var sessionID = req.sessionID;

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
	//post_data_json = { client_id: bot_id, 'client_secret': bot_secret, 'grant_type': "authorization_code", 'redirect_uri': process.env.REDIRECT_URL, 'code': code, 'state': "lol"};


	
	var options = {
		host: 'id.twitch.tv',
		path: '/oauth2/token',
		method: 'POST'
	};
	var body = "";
	var auth_req = https.request(options, function(auth_res){
		auth_res.on('data', function (chunk){
			body += chunk;
		});
		auth_res.on('end',function(){
			console.log("Body: "+body);
			if (JSON.parse(body).access_token){
				var auth_token = JSON.parse(body).access_token;
				sessionMap[sessionID] = {};
				sessionMap[sessionID].token = JSON.parse(body).access_token;
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
							sessionMap[sessionID].user = user;
							/*db.collection('chao_garden').find( {"user":user}).toArray(function(err, cursor){
								var coins;
								if (err){
									points = 0;
								}
								else{
									
									if (cursor[0]){
										if (cursor[0].points){
											points = cursor[0].points;
										}
										else{
											dbutils.db_upsert(db, 'chao_battle', {"user":user}, {coins:0, emeralds: 0, chao:{}, chao_options: {}}, function(in_push_result){});
											points = 0;
										}
									}
									else{

										points = 0;
										
									}
								}
								res.send({success: true, user: user , points: points});
		
							});*/
							res.send({success: true});
							
							
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
	auth_req.write(post_data);
	auth_req.end();

})

router.post('/garden/request/buy', function(req,res){
	var db = req.db;
	var part = req.body.part;
	var index = req.body.index;
	if (!part){

		res.send({success: false, err: "Error, Item not found"});
		return;
	}
	if (!index){
		res.send({success: false, err: "Error, Item not found"});
		return;
	}
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		index = parseInt(index);
		if (!shop[part+'_prices']){
			
			res.send({success: false, err: "Item not found"});
			return;
		}
		if ( index < shop[part+'_range_low'] || index > shop[part+'_range_high']){
			res.send({success: false, err: "Item not found"});
			return;
		}
		db.collection('chao_garden').find( {user:user}).toArray(function(err,cursor){
			if (cursor){
				if (cursor[0]){

					if (cursor[0]['chao_options'][part].indexOf(index) >= 0){
						res.send({success: false, err: "Already Owned"});
						return;
					}
					else{
						findCoins(user, db,function(coins){
							if (coins < shop[part+"_prices"][index]){

								res.send({success: false, err: "Not enough coins"});
								return;
							}
							else{
								decCoins(user,db,shop[part+"_prices"][index]);
								var push_data = {};
								push_data['chao_options.'+part] = index;

								db.collection('chao_garden').update( {user:user}, {$push: {['chao_options.'+part]: index}});
								res.send({success: true, coins: coins-shop[part+"_prices"][index]});
								return;

							}
						})
					}
				}
				else{

					res.send({success: false, err: "Reload page"});
					return;
				}
			}
			else{
				res.send({success: false, err: "Reload page"});
				return;
			}
			
		});
		
		//res.send({success: true});
	}
	else{
		res.send({success: false, err: "Please reload page"});
		return;
	}
})

router.get('/garden/request/buy_attribute', function(req,res){
	var db = req.db;
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		db.collection('chao_garden').find( {user:user}).toArray(function(err,cursor){
			if (cursor){
				if (cursor[0]){

					
					findCoins(user, db,function(coins){
						if (coins < shop['attribute_point_price']){

							res.send({success: false, err: "Not enough coins"});
							return;
						}
						else{
							decCoins(user,db,shop['attribute_point_price']);

							db.collection('chao_garden').update( {user:user}, {$inc: {points: 1}});
							res.send({success: true, coins: coins-shop['attribute_point_price'], points: cursor[0].points+1});
							return;

						}
					})
					
				}
				else{

					res.send({success: false, err: "Reload page"});
					return;
				}
			}
			else{
				res.send({success: false, err: "Reload page"});
				return;
			}
			
		});
		
		//res.send({success: true});
	}
	else{
		res.send({success: false, err: "Please reload page"});
		return;
	}
});

router.get('/garden/request/buy_letter', function(req,res){
	var db = req.db;
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		db.collection('chao_garden').find( {user:user}).toArray(function(err,cursor){
			if (cursor){
				if (cursor[0]){

					if (cursor[0]['chao_options']['name_length'][0] >= 7){
						res.send({success: false, err: "Already Max"});
						return;
					}
					else{
						findEmeralds(user, db,function(emeralds){
							var next_char = cursor[0]['chao_options']['name_length'][0]-3;
							if (emeralds < shop['char_slot'][next_char]){

								res.send({success: false, err: "Not enough Emeralds"});
								return;
							}
							else{
								decEmeralds(user,db,shop['char_slot'][next_char]);

								db.collection('chao_garden').update( {user:user}, {$set: {['chao_options.name_length.0']: next_char+4}});
								res.send({success: true, emeralds: emeralds-shop['char_slot'][next_char], slots: next_char+4});
								return;

							}
						})
					}
				}
				else{

					res.send({success: false, err: "Reload page"});
					return;
				}
			}
			else{
				res.send({success: false, err: "Reload page"});
				return;
			}
			
		});
		
		//res.send({success: true});
	}
	else{
		res.send({success: false, err: "Please reload page"});
		return;
	}
});

router.get('/garden/request/refresh_coins', function(req,res){
	var db = req.db;
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		db.collection('chao_garden').find( {user:user}).toArray(function(err,cursor){
			if (cursor){
				if (cursor[0]){


					findCoins(user, db,function(coins){
						res.send({success: true, coins: coins})
					})
				
				}
				else{

					res.send({success: false, err: "Reload page"});
					return;
				}
			}
			else{
				res.send({success: false, err: "Reload page"});
				return;
			}
			
		});
		
		//res.send({success: true});
	}
	else{
		res.send({success: false, err: "Please reload page"});
		return;
	}
});

router.post('/garden/request/checkout', function(req,res){
	var nonce = req.body.nonce;
	var sessionID = req.sessionID;
	var db = req.db;
	if (sessionMap[sessionID]){
		var user = sessionMap[sessionID].user;
		var saleRequest = {
			amount: 3.00,
			merchantAccountId: "USD",
			paymentMethodNonce: nonce,
			/*descriptor:{
				name: "Chao Battler"
			},*/
		};
		gateway.transaction.sale(saleRequest, function(err, result){
			if (err){
				res.send({success: false, err: "Error, please refresh page."});
			}
			else if (result.success){
				res.send({success: true});
				addEmeralds(user, db, 10);

			}
			else{
				res.send({success: false, err: "Error: "+result.message+", please refresh page."});
			}
		})
	}
	else{

		res.send({success: false, err: "Session Expired, please refresh page"});
	}
});

router.get('/garden/request/payment_token', function(req,res){
	gateway.clientToken.generate({}, function (err, response){
		
		res.send({token: response.clientToken});
	});
});

router.get('/garden/request/crush', function(req,res){
	var sessionID = req.sessionID;
	var db = req.db;
	if (sessionMap[sessionID]){
		var user = sessionMap[sessionID].user;
		findEmeralds(user, db, function(emeralds){
			if (emeralds >= 1){
				addCoins(user, db, 100);
				decEmeralds(user, db, 1);
				res.send({success: true});
			}
			else{

				res.send({success: false, err: "Not Enough Emeralds"});
			}
		})
	}
	else{
		res.send({success: false, err: "Session Expired, please refresh page."});
	}
});

router.get('/garden/request/increase_stamina', function(req,res){
	var db = req.db;
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		db.collection('chao_garden').find( {user:user}).toArray(function(err,cursor){
			if (cursor){
				if (cursor[0]){

					
					if (cursor[0].points <= 0){
						res.send({success: false, err: "No Points to spend"});
					}
					else if (cursor[0].chao.stamina >= 999){

						res.send({success: false, err: "Stamina Already Max"});
					}
					else{
						db.collection('chao_garden').update({user: user}, {$inc: {points: -1}});

						db.collection('chao_garden').update({user: user}, {$inc: {'chao.stamina': 1}});

						res.send({success: true, stamina: cursor[0].chao.stamina+1, points: cursor[0].points-1});
					}
					
				}
				else{

					res.send({success: false, err: "Reload page"});
					return;
				}
			}
			else{
				res.send({success: false, err: "Reload page"});
				return;
			}
			
		});
		
		//res.send({success: true});
	}
	else{
		res.send({success: false, err: "Please reload page"});
		return;
	}
});

router.get('/garden/request/increase_swim', function(req,res){
	var db = req.db;
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		db.collection('chao_garden').find( {user:user}).toArray(function(err,cursor){
			if (cursor){
				if (cursor[0]){

					
					if (cursor[0].points <= 0){
						res.send({success: false, err: "No Points to spend"});
					}
					else if (cursor[0].chao.swim >= 999){

						res.send({success: false, err: "swim Already Max"});
					}
					else{
						db.collection('chao_garden').update({user: user}, {$inc: {points: -1}});

						db.collection('chao_garden').update({user: user}, {$inc: {'chao.swim': 1}});

						res.send({success: true, swim: cursor[0].chao.swim+1, points: cursor[0].points-1});
					}
					
				}
				else{

					res.send({success: false, err: "Reload page"});
					return;
				}
			}
			else{
				res.send({success: false, err: "Reload page"});
				return;
			}
			
		});
		
		//res.send({success: true});
	}
	else{
		res.send({success: false, err: "Please reload page"});
		return;
	}
});

router.get('/garden/request/increase_run', function(req,res){
	var db = req.db;
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		db.collection('chao_garden').find( {user:user}).toArray(function(err,cursor){
			if (cursor){
				if (cursor[0]){

					
					if (cursor[0].points <= 0){
						res.send({success: false, err: "No Points to spend"});
					}
					else if (cursor[0].chao.run >= 999){

						res.send({success: false, err: "run Already Max"});
					}
					else{
						db.collection('chao_garden').update({user: user}, {$inc: {points: -1}});

						db.collection('chao_garden').update({user: user}, {$inc: {'chao.run': 1}});

						res.send({success: true, run: cursor[0].chao.run+1, points: cursor[0].points-1});
					}
					
				}
				else{

					res.send({success: false, err: "Reload page"});
					return;
				}
			}
			else{
				res.send({success: false, err: "Reload page"});
				return;
			}
			
		});
		
		//res.send({success: true});
	}
	else{
		res.send({success: false, err: "Please reload page"});
		return;
	}
});

router.get('/garden/request/increase_fly', function(req,res){
	var db = req.db;
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		db.collection('chao_garden').find( {user:user}).toArray(function(err,cursor){
			if (cursor){
				if (cursor[0]){

					
					if (cursor[0].points <= 0){
						res.send({success: false, err: "No Points to spend"});
					}
					else if (cursor[0].chao.fly >= 999){

						res.send({success: false, err: "fly Already Max"});
					}
					else{
						db.collection('chao_garden').update({user: user}, {$inc: {points: -1}});

						db.collection('chao_garden').update({user: user}, {$inc: {'chao.fly': 1}});

						res.send({success: true, fly: cursor[0].chao.fly+1, points: cursor[0].points-1});
					}
					
				}
				else{

					res.send({success: false, err: "Reload page"});
					return;
				}
			}
			else{
				res.send({success: false, err: "Reload page"});
				return;
			}
			
		});
		
		//res.send({success: true});
	}
	else{
		res.send({success: false, err: "Please reload page"});
		return;
	}
});

router.get('/garden/request/increase_power', function(req,res){
	var db = req.db;
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		db.collection('chao_garden').find( {user:user}).toArray(function(err,cursor){
			if (cursor){
				if (cursor[0]){

					
					if (cursor[0].points <= 0){
						res.send({success: false, err: "No Points to spend"});
					}
					else if (cursor[0].chao.power >= 999){

						res.send({success: false, err: "power Already Max"});
					}
					else{
						db.collection('chao_garden').update({user: user}, {$inc: {points: -1}});

						db.collection('chao_garden').update({user: user}, {$inc: {'chao.power': 1}});

						res.send({success: true, power: cursor[0].chao.power+1, points: cursor[0].points-1});
					}
					
				}
				else{

					res.send({success: false, err: "Reload page"});
					return;
				}
			}
			else{
				res.send({success: false, err: "Reload page"});
				return;
			}
			
		});
		
		//res.send({success: true});
	}
	else{
		res.send({success: false, err: "Please reload page"});
		return;
	}
});
router.get('/garden/request/free_coins', function(req,res){
	var db = req.db;

	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		db.collection('chao_garden').update( {user:user}, {$inc: {coins: 10}});
		res.send({success: true});
	}
	else{
		res.send({success: false});
	}
})

router.get('/garden/request/free_emeralds', function(req,res){
	var db = req.db;

	
	var sessionID = req.sessionID;

	db.collection('chao_garden').find().toArray(function(err, cursor){
		console.log(JSON.stringify(cursor));
	});

	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		//db.collection('chao_garden').update( {user:user}, {$set: {chao: {}}});
		//db.collection('chao_garden').remove();
		addEmeralds(user,db,10);
		res.send({success: true});
	}
	else{
		res.send({success: false});
	}
});

router.get('/garden/request/buy_chao', function(req,res){
	var db = req.db;
	var default_chao = {name:"",type: 2, swim: 0, fly: 0, run: 0, power: 0, stamina: 0, int: 0, luck: 0, color: 0, texture: 0,
						two_tone: false, shiny: false, body_type: 0, animal_body: 0, eyes: 0, mouth: 0, feet: true, 
						arms: 0, ears: 0, forehead: 0, horns: 0, legs: 0, tail: 0, wings: 0, face: 0, hat: 0 };
	var options = {name_length: [1], type: [2]}
	
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		user = sessionMap[sessionID].user;
		findCoins(user,db, function(points){
			if (points >= 1){
				decCoins(user,db, 1);
				db.collection('chao_garden').update( {user:user}, {$set: {chao: default_chao},
					/*$push:{
							"chao_options.name_length": 3,"chao_options.type": 2,"chao_options.color":0, "chao_options.texture":0,
							"chao_options.two_tone": 0, "chao_options.shiny": 0, "chao_options.body_type": 0, "chao_options.animal_body": 0,
							"chao_options.eyes": 0, "chao_options.mouth": 0, "chao_options.feet": 1, "chao_options.arms":0, "chao_options.ears":0,
							"chao_options.forehead":0, "chao_options.horns":0, "chao_options.legs":0, "chao_options.tail":0, 
							"chao_options.wings":0,"chao_options.face":0, "chao_options.hat":0
						}*/
					});
				res.send({success: true, chao: default_chao, options: default_options, points: 0});
				return;
			}
			res.send({success: false, err: "Not Enough Points"});
		});
	}
	else{
		res.send({success: false, err:"Not logged in"});
	}
});


router.post('/garden/request/add_battle_chao', function(req,res){
	var sessionID = req.sessionID;
	var db = req.db;
	db.collection('chao_battle').find({"chao":{$exists: true}}).toArray(function(err, cursor){
		if (err){
			res.send({len:"error"});
		}
		else{
			if (cursor){
				if (cursor.length >= 2){
					res.send({success:"false", err: "Battle Full"});
				}
				else{
					dbutils.db_upsert(db, 'chao_battle', {"chao":cursor.length}, {stats:req.body}, function(in_push_result){
						if (in_push_result.fail == true){
							//Error adding notelist for user
							
						}
						else{
							
						}
					});
					res.send({success:"true"})

				}
			}
			else{
				res.send({success:"false"});
			}
		}
	});


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
router.get('/request/check_setup', function(req, res) {
	var db = req.db;
	db.collection('chao_battle').find({"setup": true}).toArray(function(err, cursor){
		if (err){
			res.send({len:"error"});
		}
		else{
			if (cursor){
				
				if (cursor.length > 0){
					db.collection('chao_battle').find().toArray(function(err, cursor2){
						if (err){
							res.send({do_setup: false});
						}
						else{
							db.collection('chao_battle').update({"setup": true},{$set:{"setup": false}}, {upsert: true, multi: false});
							var chao1;
							var chao2;

							for (var i = 0; i<cursor2.length;i++){
								if (cursor2[i].chao || cursor2[i].chao == 0){
									if (cursor2[i].chao == 0){
										chao1 = cursor2[i].stats;
									}
									if (cursor2[i].chao == 1){
										chao2 = cursor2[i].stats;
									}
								}
							}
							
							res.send({do_setup: true, chao1: chao1, chao2: chao2});
						}
					});
					
					
				}
				else{
					res.send({do_setup: false});
				}
			}
			else{
				res.send({do_setup: false});
			}
		}
	});
	//db.collection('chao_battle').update({"setup": true},{$set:{"setup": false}}, {upsert: true});
	
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


router.get('/request/battle_state', function(req, res) {
	var db = req.db;

	db.collection('chao_battle').find().toArray(function(err, cursor){
		if (err){
			res.send({len:"error"});
		}
		else{
			if (cursor){
				res.send({len:cursor.length});
			}
			else{
				res.send({len:0});
			}
		}
	});
});
router.get('/request/setup_chao_battle', function(req, res) {
	var db = req.db;
	db.collection('chao_battle').update({"setup": true},{$set:{"setup": true}}, {upsert: true, multi: false});
	
});


router.get('/request/clear_battle', function(req, res) {
	var db = req.db;

	db.collection('chao_battle').remove();
});


function findCoins(user,db, callback){

	db.collection('chao_garden').find( {user:user}).toArray(function(err, cursor){
		if (err){
			
		}
		else{
			if (cursor[0]){
				if (cursor[0].coins){
					callback(cursor[0].coins);
				}
				else{
					
					callback(0);
				}
			}
			else{

				callback(0);
				
			}
		}
	});
}

function findEmeralds(user,db, callback){

	db.collection('chao_garden').find( {user:user}).toArray(function(err, cursor){
		if (err){
			
		}
		else{
			if (cursor[0]){
				if (cursor[0].emeralds){
					callback(cursor[0].emeralds);
				}
				else{
					
					callback(0);
				}
			}
			else{

				callback(0);
				
			}
		}
	});
}
function addCoins(user,db, amount){
	db.collection('chao_garden').update( {user:user}, {$inc: {coins: amount}});
};

function decCoins(user,db, amount){
	db.collection('chao_garden').update( {user:user}, {$inc: {coins: amount*-1} });
};

function addEmeralds(user,db, amount){
	db.collection('chao_garden').update( {user:user}, {$inc: {emeralds: amount}});
};

function decEmeralds(user,db, amount){
	db.collection('chao_garden').update( {user:user}, {$inc: {emeralds: amount*-1} });
};
module.exports = router;
