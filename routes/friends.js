var express = require('express');
var router = express.Router();
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');
var jwt = require('jsonwebtoken');
var uid = require('mongodb').ObjectID;
var active = 'friends'



router.use(function(req,res,next){
	var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
	if (token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		        return res.redirect('/users/login');    
		    } else {
		        req.decoded = decoded;    
		        next();
		    }
		});
	}
	else{
		res.redirect('/users/login')
	}

});


router.post('/request/add_friend', function(req, res){

	email = req.decoded.email;
	var friend_to_add = req.body.friend_to_add;
	var db = req.db;

	if (email == friend_to_add){
		res.send({"request": "fail", "error":"Cannot add yourself"});
		return;
	}

	dbutils.db_find(db, 'users', {"email":friend_to_add},function(find_result){


		if (find_result.fail == true){
			//Error checking if account already exists
			res.send({"request":"fail", "error":"User not found."});
		}
		else{
			if(find_result.records.length > 1){
				res.send({"request":"fail", "error":"User not found."});
			}
			else if (find_result.records.length == 0){

				res.send({"request":"fail", "error":"User not found."});
			}
			else{

				dbutils.db_upsert(db, 'user:'+email, {"type":"friends"}, {"out_pending":friend_to_add}, function(out_push_result){
					if (out_push_result.fail == true){
						//Error adding notelist for user
						console.log("Error"+push_result.error)
						res.send({"request":"fail", "error":"Error adding friend."});
					}
					else{
						dbutils.db_upsert(db, 'user:'+friend_to_add, {"type":"friends"}, {"in_pending":email}, function(in_push_result){
							if (in_push_result.fail == true){
								//Error adding notelist for user
								console.log("Error"+in_push_result.error)
								res.send({"request":"fail", "error":"Error adding friend."});
							}
							else{
								res.send({"request":"success"});
							}
						});
					}
				});

			}

		}

	})

});


router.post('/request/approve_friend', function(req, res){

	email = req.decoded.email;
	var friend_to_approve = req.body.friend_to_approve;
	var db = req.db;

	dbutils.db_find(db, 'user:'+email, {"type":"friends"},function(find_result){


		if (find_result.fail == true){
			//Error checking if account already exists
			res.send({"request":"fail", "error":"Error accessing friends."});
		}
		else{
			if(find_result.records.length > 1){
				res.send({"request":"fail", "error":"User friends not found."});
			}
			else if (find_result.records.length == 0){

				res.send({"request":"fail", "error":"No friends data found."});
			}
			else{

				if (find_result.records[0].in_pending.indexOf(friend_to_approve) >= 0){

					var convo_id = new uid();
					var self_friend = { 'convo_id': convo_id, 'email': friend_to_approve};
					var other_friend = { 'convo_id':convo_id, 'email': email}
				
				
					dbutils.db_upsert(db, 'user:'+email, {"type":"friends"}, {"my_friends":self_friend}, function(upsert_result){
						if (upsert_result.fail == true){
							//Error adding notelist for user
							console.log("Error: "+upsert_result.error)
							res.send({'request':'fail', 'error':'Error adding friend.'});
						}
						else{
							var convo_data = {'id': convo_id, 'msgs': [{'email': 'admin', 'content':'Welcome to the new conversation!'}],'participants':[email, friend_to_approve],'type':'private','name':'Generate Random Name'};
							dbutils.db_insert(db, 'convos', convo_data, function (insert_result){

								if (insert_result.fail == true){
				
									console.log("Error: "+insert_result.error)
								
								}
								else{
									
								}

							
							});

							dbutils.db_upsert(db, 'user:'+friend_to_approve, {'type':"friends"}, {"my_friends":other_friend}, function(upsert_friend_result){
								if (upsert_friend_result.fail == true){
									//Error adding notelist for user
									console.log("Error: "+upsert_friend_result.error);
								}
								else{

								}
							})
							dbutils.db_pull(db, 'user:'+email, {"type":"friends"}, {"in_pending":friend_to_approve}, function(pull_result){
								if (pull_result.fail == true){
									//Error adding notelist for user
									console.log("Error: "+pull_result.error)

								}
								else{
									
								}
							});
							dbutils.db_pull(db, 'user:'+friend_to_approve, {"type":"friends"}, {"out_pending":email}, function(pull_result){
								if (pull_result.fail == true){
									//Error adding notelist for user
									console.log("Error: "+pull_result.error)

								}
								else{
									
								}
							});
							res.send({"request":"success"});
							
						}
					});
				}

				else{

					res.send({"request":"fail", "error":"No friends data found."});
				}
			}

		}

	})
});

router.post('/request/decline_friend', function(req, res){

	email = req.decoded.email;
	var friend_to_decline = req.body.friend_to_decline;
	var db = req.db;

	dbutils.db_find(db, 'user:'+email, {"type":"friends"},function(find_result){


		if (find_result.fail == true){
			//Error checking if account already exists
			res.send({"request":"fail", "error":"Error accessing friends."});
		}
		else{
			if(find_result.records.length > 1){
				res.send({"request":"fail", "error":"User friends not found."});
			}
			else if (find_result.records.length == 0){

				res.send({"request":"fail", "error":"No friends data found."});
			}
			else{

				if (find_result.records[0].in_pending.indexOf(friend_to_decline) >= 0){

				
				

					dbutils.db_pull(db, 'user:'+email, {"type":"friends"}, {"in_pending":friend_to_decline}, function(pull_result){
						if (pull_result.fail == true){
							//Error adding notelist for user
							console.log("Error: "+pull_result.error)

						}
						else{
							
						}
					});
					dbutils.db_pull(db, 'user:'+friend_to_decline, {"type":"friends"}, {"out_pending":email}, function(pull_result){
						if (pull_result.fail == true){
							//Error adding notelist for user
							console.log("Error: "+pull_result.error)

						}
						else{
							
						}
					});
					res.send({"request":"success"});
					

				}

				else{

					res.send({"request":"fail", "error":"No friends data found."});
				}
			}

		}

	})

});

router.get('/request/convo/:convo_id', function(req,res){
	var convo_id = req.params.convo_id;
	db = req.db;
	email = req.decoded.email;
	dbutils.db_find(db, 'convos', {'id':new uid(convo_id)}, function(find_res){
		if (find_res.fail == true){
			res.send({'request': 'fail', 'error':'failed to find convo.'});
		}
		else{

			res.send({'request':'success', 'convo':find_res.records[0]});
		}
	});
});

router.post('/request/convo/send_message', function(req,res){
	email = req.decoded.email;
	var db = req.db;	
	var convo_id = req.body.convo_id;
	var message = req.body.message;
	dbutils.db_find(db, 'convos', {'id':new uid(convo_id)}, function(find_res){
		if (find_res.fail == true){
			res.send({'request': 'fail', 'error':'failed to find convo.'});
		}
		else{
			record = find_res.records[0];
			if (record.participants.indexOf(email) < 0){
				res.send({'request':'fail','error':'You dont have access to this conversation.'})
			}
			else{
				var new_msg = {'email':email,'content':message};
				dbutils.db_push(db,'convos',{'id':new uid(convo_id)},{'msgs':new_msg}, function(push_result){
					if (push_result.fail == true){

						res.send({"request":"fail", "error":"Failed to add message."});
					}
					else{

						res.send({"request":"success"});
					}
					console.log(push_result);
				});
				
			
			}
		}
	});
});

router.get('/request/friends_list',function(req,res){
	email = req.decoded.email;
	
	var db = req.db;

	dbutils.db_find(db, 'user:'+email, {"type":"friends"},function(find_result){
		if (find_result.fail == true){
			//Error finding list
			res.send({"request":"fail", "error":"Failed to find friends list."});
		}
		else{
			if(find_result.records.length > 1){
				res.send({"request":"fail", "error":"Failed to find friends list."});
			}
			else if (find_result.records.length == 0){
				
				res.send({'request':'success', "friends":[]});
			}
			else{

				out_pending = find_result.records[0].out_pending;

				in_pending = find_result.records[0].in_pending;

				my_friends = find_result.records[0].my_friends;
				res.send({'request':'success', "my_friends":my_friends,'out_pending':out_pending, 'in_pending':in_pending});
			}
		}
	});
});

router.get('/', function(req, res) {
	email = req.decoded.email;
	db = req.db;
	res.render('pages/friends', {email: email, active: active});
	
});


router.get('/:friend', function(req, res) {

	var friend_email = req.params.friend;
	email = req.decoded.email;
	db = req.db;
	db.collection('user:'+email).find( {"my_friends.email":friend_email}, {my_friends: {  $elemMatch: {email: friend_email} }}).toArray( function(err, cursor){
		if (err){
			res.send("Error finding friend")
		}
		else{
			if (cursor[0]){
				if (cursor[0].my_friends){
					if (cursor[0].my_friends.length < 1){
						res.send("Friend not found");
					}
					else if (cursor[0].my_friends.length > 1){
						res.send("Multiple friends with this name ????")
					}
					else{
						res.render('pages/friends_convo', {email: email, active: active, convo_id: cursor[0].my_friends[0].convo_id});
					}
				}
				else{
					res.send("No friends found")
				}
			}
			else{
				res.send("no friend found");
			}
		}
		
	});
	//res.send('lol');
	
	/*
	dbutils.db_find(db, 'user:'+email, {'my_friends':  {'$elemMatch': {'email':friend_email}}},function(find_result){
		if (find_result.fail == true){
			//Error finding list
			res.send({"request":"fail", "error":"Failed to find friends list."});
		}
		else{
			if(find_result.records.length > 1){
				res.send({"request":"fail", "error":"Failed to find friend."});
			}
			else if (find_result.records.length == 0){
				
				res.send({'request':'fail', "error":"Friend does not exist"});
			}
			else{

				var result = find_result.records[0];


				res.send({result});
			}
		}
	});
	*/
	//res.render('pages/friends', {email: email, active: active});
	
});


module.exports = router;