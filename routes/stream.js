var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require('fs');
var uid = require('mongodb').ObjectID;
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');

var active="stream";
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
					res.send({'request':'success', 'games':cursor[0].games});
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
					res.render('pages/gameslist', {games : cursor[0].games});
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