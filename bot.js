var smm = require('super-mario-maker-client');
var tmi = require('tmi.js');
var dbutils = require('./utils/dbutils');
var utils = require('./utils/utils');
var http = require('http');
var uid = require('mongodb').ObjectID;
require('dotenv').config();
var db;

var tmi_options = {
	options:{
		debug: true
	},
	connection:{
		reconnect: true
	},
	identity:{
		username: "SPaDeSPwnzBot",
		password: process.env.BOT_OAUTH
	},
	channels: ["#spadespwnzyou"]

};
var admin = 'spadespwnzyou';
var mods = [];
var chatterTypes = ['moderators','staff','admins','global_mods','viewers'];
var channel = "#spadespwnzyou";
var bot = new tmi.client(tmi_options);
var day = 1;
var messages = [
		'You gain 1 point every 5 minutes while watching. Type !points to see your amount',
		'Type !queue to see how many levels are in the queue',
		'You can see completed (or failed) viewer levels at http://www.spades.tech/stream/smm',
		'24H stream at 500 followers! Hit that follow button if your enjoying the stream.',
		'Tell a friend to come type !ref [YOUR USERNAME] in chat to receive 2 points!',
		'Type !submit [CODE] to add your level to the queue',
		'For 10 points, type !priority [CODE] to add your level to the priority queue',
		'Levels in the Priority queue will be played first, You can switch your level with !switch',
		'This is '+day+' of 365 of my daily stream challenge'


];

bot.connect();
console.log("BOT ON");

(function(){
	


	var pointInterval = setInterval(function(){
		checkOnline(function(status){
			if (status == true){
				getViewers(function(parsed){
					for (var type = 0; type<chatterTypes.length;type++){
						for (var i = 0; i< parsed.chatters[chatterTypes[type]].length;i++){
							addPoints(parsed.chatters[chatterTypes[type]][i], 1);
							
						}
					}
				});
			}
		});
		pingSite();
		sendNote();
		/*for (var i = 0; i < viewers.length; i++){
			console.log(viewers[i]);
		}*/
	},1000*60*5);


})();

bot.on("chat", function(channel, userstate, message, self){
	if (self) return;
	var message_parts = message.split(' ');
	var user = userstate.username;
	switch (message_parts[0]){
		case "!suggest":
			findPoints(user, function(points){
				if (points > 5){
					decPoints(user, 5);
					suggest(message.slice(9), user);
				}
			})
			break;
		case "!checkonline":
			checkOnline(function(status){
				if (status == true){
					bot.say(channel, 'Online!');
				}
				else{
					bot.say(channel, 'Offline :(');
				}
			});

			break;
		case "!points":
			findPoints(user, function(points){

				bot.say(channel, "@"+user+" "+points+" points.");
			});
			break;

		case "!submit":
			if (message_parts.length == 2 && message_parts[1].length == 19){
				var code = message_parts[1];
				findLevelByCode(code, function(found_level){
					if (found_level){
						bot.say(channel, "@"+user+" Level already "+found_level[0].type);
						return;
					}
					levelQueued(user, function(user_queue){
						if (user_queue){
							bot.say(channel, "@"+user+" Max 1 queue / person");
							return;
						}

						smm.fetchCourse(code, function(error, course){
							if (error){
								bot.say(channel, "Error submitting level, invalid code?");
								return;
							}

							if (course == undefined){
								bot.say(channel, "Error submitting level, invalid code?");
								return;
							}

							var title = course.title;
							var maker = course.creator.miiName;
							var percent = course.clearRate;
							var style = course.gameStyle;
							var img = course.thumbnailUrl;
							var level = {user: user, code: code, title: title, maker: maker, style: style, img: img,percent: percent, id: new uid()};
							addToSMMQueue(level, function(success){
								if (success){

									bot.say(channel,'@'+user+' Added "'+title+'" by '+maker+' ['+percent+'%]');
								}
								else{

									bot.say(channel,'@'+user+' failed to add.');
								}
							})

							
							
						}); //End Fetch Level Callback
					}); //End Level Queued Callback
				}); //End Find Level Callback
			}
			else{
				bot.say(channel, "Incorrect format, '!submit ABCD-1234-ABCD-1234");
			}
			break;
		case "!priority":
			findPoints(user, function(points){
				if (points >= 10){
					if (message_parts.length == 2 && message_parts[1].length == 19){
						var code = message_parts[1];
						findLevelByCode(code, function(found_level){
							if (found_level){
								bot.say(channel, "@"+user+" Level already "+found_level[0].type);
								return;
							}
							levelQueued(user, function(user_queue){
								if (user_queue){
									bot.say(channel, "@"+user+" Max 1 queue / person");
									return;
								}
								smm.fetchCourse(code, function(error, course){
									if (error){
										bot.say(channel, "Error submitting level, invalid code?");
										return;
									}
									
									if (course == undefined){

										bot.say(channel, "Error submitting level, invalid code?");
										return;
									}
									var title = course.title;
									var maker = course.creator.miiName;
									var percent = course.clearRate;
									var style = course.gameStyle;
									var level = {user: user, code: code, title: title, maker: maker, style: style, percent: percent, id: new uid()};
									addToSMMPrioQueue(level, function(success){
										if (success){
											decPoints(user, 10);
											
											bot.say(channel,'@'+user+' Added "'+title+'" by '+maker+' ['+percent+'%]');

										}
										else{

											bot.say(channel,'@'+user+' failed to add.');
										}
									});

								}); //End Fetch
							}); //End Queue Check
						}); //End Level Checl
					}
					else{
						bot.say(channel, "Incorrect format, '!submit ABCD-1234-ABCD-1234");
					}
				}
				else{
					bot.say(channel, "@"+user+ "Not enough points. Cost: 5, Have: "+points);
				}
			})
			
			break;
		case "!switch":
			findPoints(user, function(points){
				if (points >= 10){
					levelQueued(user, function(found_level){
						if (found_level){
							if (found_level[0]){
								if (found_level[0].type == 'queue'){
									level = found_level[0].level[0];
									deleteByCode(level.code, function(del_success){
										addToSMMPrioQueue(level, function(add_success){
											decPoints(user, 10);
											bot.say(channel,"@"+user+" switched level to priority queue");
										});
									});
									

								}
							}
						}

					})
				}
			});

			break;
		case "!queue":
			var regular_queue;
			var prio_queue;
			var parts_done = 0;
			getSMMQueue(function (queue){
				regular_queue = queue[0];
				if (!regular_queue){
					regular_queue = {level: []};
				}
				if (!regular_queue.level){
					regular_queue.level = [];
				}
				parts_done++;
				if (parts_done == 2){

					var next_line = "";
					for (var i = 0; i<3;i++){
						if (prio_queue.level[i]){
							next_line += '['+prio_queue.level[i].user+' - '+ prio_queue.level[i].code+'] ';
						}
						else if (regular_queue.level[i-prio_queue.level.length]){

							next_line += '['+regular_queue.level[i-prio_queue.level.length].user+' - '+ regular_queue.level[i-prio_queue.level.length].code+'] ';

						}

					}
					bot.say(channel, "Regu Queue: "+regular_queue.level.length+" | | Prio Queue: "+prio_queue.level.length+'| | Next:'+next_line);
				}
			});
			getSMMPrioQueue(function (queue){
				prio_queue = queue[0];
				if (!prio_queue){
					prio_queue = {level: []};
				}
				if (!prio_queue.level){
					prio_queue.level = [];
				}
				parts_done++;
				if (parts_done == 2){
					var next_line = "";
					for (var i = 0; i<3;i++){
						if (prio_queue.level[i]){
							next_line += '['+prio_queue.level[i].user+' - '+ prio_queue.level[i].code+'] ';
						}
						else if (regular_queue.level[i-prio_queue.level.length]){

							next_line += '['+regular_queue.level[i-prio_queue.level.length].user+' - '+ regular_queue.level[i-prio_queue.level.length].code+'] ';

						}

					}
					bot.say(channel, "Regu Queue: "+regular_queue.level.length+" | | Prio Queue: "+prio_queue.level.length+'| | Next:'+next_line);
				}
			});
			break;
		case "!complete":
			if (user == admin){
				if (message_parts.length == 3){
					var type = message_parts[1];
					var spot;
					try{
						spot = parseInt(message_parts[2]);
					}
					catch(e){
						break;
					}
					addToSMMComplete(type, spot, function(success){
						if (success == true){
							bot.say(channel, "Completed Level!")
						}
						if (success == false){
							bot.say(channel, "Failed Completing level :(");
						}
					});


				}
			}
			break;
		case "!fail":
			if (user == admin){
				if (message_parts.length == 3){
					var type = message_parts[1];
					var spot;
					try{
						spot = parseInt(message_parts[2]);
					}
					catch(e){
						break;
					}
					addToSMMFail(type, spot, function(success){
						if (success == true){
							bot.say(channel, "Completed failed!")
						}
						if (success == false){
							bot.say(channel, "Failed Failing level (wait wut) :(");
						}
					});


				}
			}
			break;
		case "!delete":
			if (user == admin){
				if (message_parts.length == 3){
					var type = message_parts[1];
					var spot;
					try{
						spot = parseInt(message_parts[2]);
					}
					catch(e){
						break;
					}
					deleteFromQueue(type, spot, function(success){
						if (success == true){
							bot.say(channel, "Completed removed")
						}
						if (success == false){
							bot.say(channel, "Failed removing level");
						}
					});


				}
			}
			break;
		case "!check":
			var code = message_parts[1];
			findLevelByCode(code, function(item){
				console.log(item);
			});
			break;
		case "!isqueued":
			var user_to_check = message_parts[1];
			levelQueued(user_to_check,function(level){
				console.log(level);
			});
		case "!clear":
			if (message_parts[1] != 'queue'){
				return;
			}
			if (user != admin){
				return;
			}
			clearQueue(function(){
				bot.say(channel, "Queues Cleared");
			})
			break;
		case "!ref":
			if (message_parts.length != 2){
				bot.say(channel, "@"+user+" Incorrect Format");
				return;
			}
			var to_user = message_parts[1];
			if (to_user == user){
				bot.say("@"+user+" cannot ref yourself!");
				return;
			}
			refUser(user,to_user, function(success){
				if (success){
					bot.say(channel, "Gave @"+to_user+" 2 points");
				}
				else{
					bot.say(channel, "@"+user+" reference already used.");
				}
			});
			break;
		case "!day":
			if (user == admin){
				day = message_parts[1];
			}
			break;
	}
});

function refUser(from_user, to_user, callback){
	db.collection('stream_stats').find({'type':'used_ref_list'}).toArray(function(err,cursor){
		if (err){
			return null;
		}
		else{
			if (cursor){
				if (cursor.length == 0){
					dbutils.db_upsert(db,'stream_stats',{'type':'used_ref_list'},{'users':from_user}, function(res){
						if (res.fail == true){
							return null;
						}
						else{
							addPoints(to_user, 2);
							callback(true);
							return;
						}
					});
				}
				else{
					if (cursor[0].users.indexOf(from_user) < 0){

							
						dbutils.db_upsert(db,'stream_stats',{'type':'used_ref_list'},{'users':from_user}, function(res){
							if (res.fail == true){
								return null;
							}
							else{
								addPoints(to_user, 2);
								callback(true);
								return;
							}
						});

					}
					else{
						callback(false)
					}
				}
			}
			else{

				return null;
			}
		}

	});
};
function clearQueue(callback){
	db.collection('SMM').update({$or: [{'type':'prio_queue'},{'type':'queue'}]},{$set:{level: []}},{multi: true, upsert: true}, function(err){
		if (err){

		}
		else{
			callback();
		}
	});
};
function levelQueued(user, callback){
	db.collection('SMM').find( {"level.user":user, $or: [{'type':'prio_queue'},{'type':'queue'}]}, {level: {  $elemMatch: {user: user} }, type: 1}).toArray( function(err, cursor){
		if (err){
			null;
		}
		else{
			if (cursor){
				if (cursor.length == 0){
					callback(null);
				}
				else{
					callback(cursor)
				}
			}
			else{
				callback(null);
			}
		}
	});
}
function findLevelByCode(code, callback){
	db.collection('SMM').find( {"level.code":code}, {level: {  $elemMatch: {code: code} }, type: 1}).toArray( function(err, cursor){
		if (err){
			null;
		}
		else{
			if (cursor){
				if (cursor.length == 0){
					callback(null);
				}
				else{
					callback(cursor)
				}
			}
			else{
				callback(null);
			}
		}
	});
}

function deleteByCode(code, callback){
	dbutils.db_pull(db, 'SMM', {"type":"prio_queue"}, {"level": {code: level.code}}, function(res){
		callback(true)
	});
}
function deleteFromQueue(type, place, callback){
	if (type == "queue"){
		getSMMQueue(function (queue){
			queue = queue[0];
			if (!queue){
				callback(false);
				return;
			}
			if (!queue.level){
				callback(false);
				return;
			}
			place = place - 1;
			if (!queue.level[place]){
				callback(false);
				return;
			}
			var level = queue.level[place];
	
			dbutils.db_pull(db, 'SMM', {"type":"queue"}, {"level": {code: level.code}}, function(res){
				callback(true)
			});

		});
	}
	else if (type == "prio"){
		getSMMPrioQueue(function (queue){
			queue = queue[0];
			if (!queue){
				callback(false);
				return;
			}
			if (!queue.level){
				callback(false);
				return;
			}
			place = place - 1;
			if (!queue.level[place]){
				callback(false);
				return;
			}
			var level = queue.level[place];
			dbutils.db_pull(db, 'SMM', {"type":"prio_queue"}, {"level": {code: level.code}}, function(res){
				callback(true)
			});
		});
	}
	else{
		callback(false);
	}
}
function addToSMMComplete(type, place, callback){
	if (type == "queue"){
		getSMMQueue(function (queue){
			queue = queue[0];
			if (!queue){
				callback(false);
				return;
			}
			if (!queue.level){
				callback(false);
				return;
			}
			place = place - 1;
			if (!queue.level[place]){
				callback(false);
				return;
			}
			var level = queue.level[place];
			dbutils.db_upsert(db, 'SMM', {"type":"completed"}, {"level":level}, function(in_push_result){
				if (in_push_result.fail == true){
					//Error adding notelist for user
					callback(false)
				}
				else{
					dbutils.db_pull(db, 'SMM', {"type":"queue"}, {"level": {code: level.code}}, function(res){
						callback(true)
					});
				
				}
			});
		});
	}
	else if (type == "prio"){
		getSMMPrioQueue(function (queue){
			queue = queue[0];
			if (!queue){
				callback(false);
				return;
			}
			if (!queue.level){
				callback(false);
				return;
			}
			place = place - 1;
			if (!queue.level[place]){
				callback(false);
				return;
			}
			var level = queue.level[place];
			dbutils.db_upsert(db, 'SMM', {"type":"completed"}, {"level":level}, function(in_push_result){
				if (in_push_result.fail == true){
					//Error adding notelist for user
					callback(false)
				}
				else{
					dbutils.db_pull(db, 'SMM', {"type":"prio_queue"}, {"level": {code: level.code}}, function(res){
						callback(true)
					});
				
				}
			});
		});
	}
	else{
		callback(false);
	}
}

function addToSMMFail(type, place, callback){
	if (type == "queue"){
		getSMMQueue(function (queue){
			queue = queue[0];
			if (!queue){
				callback(false);
				return;
			}
			if (!queue.level){
				callback(false);
				return;
			}
			place = place - 1;
			if (!queue.level[place]){
				callback(false);
				return;
			}
			var level = queue.level[place];
			dbutils.db_upsert(db, 'SMM', {"type":"failed"}, {"level":level}, function(in_push_result){
				if (in_push_result.fail == true){
					//Error adding notelist for user
					callback(false)
				}
				else{
					dbutils.db_pull(db, 'SMM', {"type":"queue"}, {"level": {code: level.code}}, function(res){
						callback(true)
					});
				
				}
			});
		});
	}
	else if (type == "prio"){
		getSMMPrioQueue(function (queue){
			queue = queue[0];
			if (!queue){
				callback(false);
				return;
			}
			if (!queue.level){
				callback(false);
				return;
			}
			place = place - 1;
			if (!queue.level[place]){
				callback(false);
				return;
			}
			var level = queue.level[place];
			dbutils.db_upsert(db, 'SMM', {"type":"failed"}, {"level":level}, function(in_push_result){
				if (in_push_result.fail == true){
					//Error adding notelist for user
					callback(false)
				}
				else{
					dbutils.db_pull(db, 'SMM', {"type":"prio_queue"}, {"level": {code: level.code}}, function(res){
						callback(true)
					});
				
				}
			});
		});
	}
	else{
		callback(false);
	}
}
function addToSMMQueue(level, callback){
	dbutils.db_upsert(db, 'SMM', {"type":"queue"}, {"level":level}, function(in_push_result){
		if (in_push_result.fail == true){
			//Error adding notelist for user
			callback(false)
		}
		else{
			callback(true);
		
		}
	});
}

function addToSMMPrioQueue(level, callback){
	dbutils.db_upsert(db, 'SMM', {"type":"prio_queue"}, {"level":level}, function(in_push_result){
		if (in_push_result.fail == true){
			//Error adding notelist for user
			callback(false)
		}
		else{
			callback(true);
		
		}
	});
}

function getSMMQueue(callback){
	db.collection('SMM').find( {"type":"queue"}).toArray(function(err, cursor){
		if (err){
			return null;
		}
		else{
			if (cursor){
				callback(cursor);
			}
			else{
				return callback([]);
			}
		}
	});
}

function getSMMPrioQueue(callback){
		db.collection('SMM').find( {"type":"prio_queue"}).toArray(function(err, cursor){
		if (err){
			return null;
		}
		else{
			if (cursor){
				callback(cursor);
			}
			else{
				return callback([]);
			}
		}
	});
}
function addPoints(user, amount){
	db.collection('points').update( {"user":user}, {$inc: {points: amount}, $set: {"user":user}},{upsert: true});
};

function decPoints(user, amount){
	db.collection('points').update( {"user":user}, {$inc: {points: amount*-1}, $set: {"user":user}},{upsert: true});
};


function findPoints(user, callback){

		db.collection('points').find( {"user":user}).toArray(function(err, cursor){
		if (err){
			res.send("Error loading images");
		}
		else{
			if (cursor[0]){
				if (cursor[0].points){
					callback(cursor[0].points);
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

function suggest(suggestion, user){
	dbutils.db_upsert(db, 'suggestion', {"type":"suggest_list"}, {"game_suggestions":{game: suggestion, from_user: user}}, function(in_push_result){
		if (in_push_result.fail == true){
			//Error adding notelist for user
			bot.say(channel, "@"+user+' failed to add suggestion.');
			}
		else{
			bot.say(channel, "@"+user+' your suggestion was added.');
		
		}
	});
}

function getViewers(callback){
	http.get({
		host: 'tmi.twitch.tv',
		path: '/group/user/spadespwnzyou/chatters',
	}, function(res){
		var body = '';
		res.on('data', function(d){
			body += d;
		});
		res.on('end', function(){
			var parsed = JSON.parse(body);
			callback(parsed);
			
		});
	})
}
function checkOnline(callback){
	http.get({
		host: 'api.twitch.tv',
		path: '/kraken/streams/spadespwnzyou',
	}, function(res){
		var body = '';
		res.on('data', function(d){
			body += d;
		});
		res.on('end', function(){
			var parsed = JSON.parse(body);

			if (parsed.stream == null){
				callback(false);
			}
			else{
				callback(true);
			}

		});
	})
}
function pingSite(){
		http.get({
		host: 'www.spades.tech',
		path: '/',
	}, function(res){
		var body = '';
		res.on('data', function(d){
			body += d;
		});
		res.on('end', function(){
		});
	})
}

function sendNote(){
	checkOnline(function(success){
			if (success == true){
					var msgNumber = Math.floor(Math.random()*messages.length);
					bot.say(channel, messages[msgNumber]);
			}
	})

}
module.exports = {
		set_db: function(database){
		db = database;
	}
}