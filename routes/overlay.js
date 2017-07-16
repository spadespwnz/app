var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require('fs');
var uid = require('mongodb').ObjectID;
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');
var http = require('http');
var sessionMap = [];
var https = require('https');
var querystring = require('querystring');
var bot_id = process.env.BOT_ID;
var bot_secret = process.env.BOT_SECRET;
var request = require('request');
var uid = require('mongodb').ObjectID;
router.get('/', function(req,res){

});
router.post('/dashboard/auth', function(req,res){
	var db = req.db;
	var code = req.body.code;

	var sessionID = req.sessionID;

	var post_data = querystring.stringify({
		'client_id':bot_id,
		'client_secret':bot_secret,
		'grant_type':'authorization_code',
		'redirect_uri':process.env.REDIRECT_URL,
		'code':code,
		'state':'lol'

	});

	post_data_json = { client_id: bot_id, client_secret: bot_secret, code: code, grant_type: "authorization_code", redirect_uri: process.env.REDIRECT_URL, state: "lol"};


	
	var options = {
		uri: 'https://api.twitch.tv/kraken/oauth2/token',

		method: 'POST',
		headers:{
			'Content-Type':'application/json',
			'Client-ID':bot_id,
		},
		json: post_data_json
	};
	var body = "";
	request(options,function(err, result, body){
		if (!err){
			if (body.access_token){
				console.log('we has token');
				var auth_token = body.access_token;
				sessionMap[sessionID] = {};
				sessionMap[sessionID].token = body.access_token;
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
							res.send({success: true, user: user});
							
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
		}
		else{
			console.log(err);
			res.send({success: false});
		}
	} )
	

})

router.use('/dashboard', function(req,res,next){
	var db = req.db;
	var code = req.param.code;
	var sessionID = req.sessionID;

	if (sessionMap[sessionID]){

		var auth_token = sessionMap[sessionID].token;

		var user = sessionMap[sessionID].user
		var url_code = null;

		db.collection('overlay').find( {"user":user}).toArray(function(err, cursor) {
			if (err) {
				res.render('pages/overlay_dashboard', {client_id: bot_id, logged_in: 'true' ,user: user, redirect: process.env.REDIRECT_URL, url_code: null});
			}
			else{
				if (cursor[0]) {
					
					if (cursor[0].url) {
						
						url_code = cursor[0].url;
						req.url_code = url_code;
						req.user = user;
						next();
					}
					else{
						req.url_code = null;
						req.user = user;
						next();
					}
				}
				else{

					req.url_code = null;
					req.user = user;
					next();
					
				}
			}
		});
		return;
	}
	else{

		url_code = null;
		res.render('pages/overlay_dashboard', {client_id: bot_id, logged_in: 'false' ,user: user, redirect: process.env.REDIRECT_URL, url_code: url_code});
	}

});

router.get('/dashboard', function(req, res) {

	var db = req.db;
	var code = req.url_code;
	var user = req.user;
	res.render('pages/overlay_dashboard', {client_id: bot_id, logged_in: 'true' ,user: user, redirect: process.env.REDIRECT_URL, url_code: code});

});

router.get('/dashboard/settings', function(req, res) {

	var db = req.db;
	var code = req.url_code;
	var user = req.user;
	db.collection('overlay').find({ 'user': user }).forEach(function (doc){
		res.render('pages/dashboard_settings', {social: doc.social});
	})
	//res.render('pages/overlay_dashboard', {client_id: bot_id, logged_in: 'true' ,user: user, redirect: process.env.REDIRECT_URL, url_code: code});

});

router.post('/dashboard/set_twitter', function(req, res) {

	var db = req.db;
	var twitter = req.body.twitter;
	var code = req.url_code;
	var user = req.user;
	db.collection('overlay').update({'user': user}, {$set:{'social.twitter': twitter}}, true, function(err){
			if (err){
				res.send({success: false});
				return
			}
			else{
				return res.send({success: true});
			}
		})
	//res.render('pages/overlay_dashboard', {client_id: bot_id, logged_in: 'true' ,user: user, redirect: process.env.REDIRECT_URL, url_code: code});

});



router.get('/dashboard/polls',function(req,res){
	var db = req.db;
	var user = req.user;
	db.collection('overlay').find({ 'user': user }).forEach(function (doc){
		res.render('pages/polls', {polls: doc.polls});
	})

})

router.get('/all', function(req,res){
	var db=req.db;
	db.collection('overlay').find({ 'user': {$exists: true} }).forEach(function (doc){
		console.log(doc);
	})
});
router.get('/dashboard/generate_code', function(req,res){
	var db = req.db;
	var sessionID = req.sessionID;
	if (sessionMap[sessionID]){
		var user = sessionMap[sessionID].user
		var new_code = new uid();
		console.log("New code:"+new_code)

		db.collection('overlay').update({'user': user}, {$set:{'url': new_code}}, true, function(err){
			if (err){
				res.send({success: false});
				return
			}
			else{
				return res.send({success: true, new_code: new_code});
			}
		})

		/*dbutils.db_upsert(db,'overlay',{'user':user},{$set:{'url':new_code}}, function(db_res) {
			if (db_res.fail) {
				res.send({success: false});
				return
			}
			
			return res.send({success: true, new_code: new_code});
		});*/

	}
	else{
		return res.send({success: false});
	}
})
router.get('/source/:code', function(req,res){
	var db = req.db
	var code = req.params.code;
	db.collection('overlay').find( {"url":new uid(code)}).toArray(function(err, cursor) {
		if (err) {
			res.send("Error loading");
		}
		else{
			if (cursor[0]) {
				if (cursor[0].user) {
					res.render('pages/overlay', {user: cursor[0].user, code: code})
				}
				else{
					res.send("invalid code")
				}
			}
			else{
				res.send("invalid code")			
			}
		}
	});

});

module.exports = router;