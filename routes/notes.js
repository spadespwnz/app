var express = require('express');
var router = express.Router();
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');

var active = 'notes';


router.use(function(req,res,next){


	var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
	if (token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		        return res.redirect('/users/');    
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

router.get('/', function(req, res) {
	email = req.decoded.email;
	res.render('pages/notes');
});




router.get('/request/notelist',function(req,res){
	email = req.decoded.email;
	
	var db = req.db;

	dbutils.db_find(db, 'user:'+email, {"type":"notelist"},function(find_result){
		if (find_result.fail == true){
			//Error finding notelist
			res.send({"request":"fail", "error":"Failed to find notes."});
		}
		else{
			if(find_result.records.length > 1){
				res.send({"request":"fail", "error":"Failed to find notes."});
			}
			else if (find_result.records.length == 0){
				data = {'type':'notelist', 'notelist':[]}
				dbutils.db_insert(db, 'user:'+email, data, function (insert_result){

					if (find_result.fail == true){
						//Error adding notelist for user
						console.log("Error"+insert_result.error)
						res.send({"request":"fail", "error":"Failed to find notes."});
					}
					else{
						res.send({"request":"success", "notes":[]})
					}

				
				});
			}
			else{
				notes = find_result.records[0].notelist;
				res.send({'request':'success', "notes":notes});
			}
		}
	});
});

router.post('/request/create',function(req,res){
	email = req.decoded.email;
	var title = req.body.title;
	var db = req.db;

	dbutils.db_find(db, 'user:'+email, {"type":"note", "title":title},function(find_result){
		if (find_result.fail == true){
			//Error finding notelist
			res.send({"request":"fail", "error":"Failed to create note."});
		}
		else{
			if(find_result.records.length >= 1){
				res.send({"request":"fail", "error":"Note with that name already exists."});
			}
			else {
				data = {'type':'note', 'title':title, 'text':''};
				dbutils.db_insert(db, 'user:'+email, data, function (insert_result){

					if (insert_result.fail == true){
						//Error adding notelist for user
						console.log("Error"+insert_result.error)
						res.send({"request":"fail", "error":"Failed to find notes."});
					}
					else{
						res.send({"request":"success", 'msg':title+" created."})
					}

				
				});
				dbutils.db_push(db, 'user:'+email, {"type":"notelist"}, {"notelist":title}, function(push_result){
					if (find_result.fail == true){
						//Error adding notelist for user
						console.log("Error"+push_result.error)

					}
					else{
						console.log("Push success");
					}
				});
			}

		}
	});
});

router.post('/request/save',function(req,res){
	email = req.decoded.email;
	var title = req.body.title;
	var content = req.body.content;
	var db = req.db;
	
	dbutils.db_set(db, 'user:'+email, {"type":"note", "title":title}, {"text":content}, function(set_result){
		if (set_result.fail == true){
			//Error changing note text
			console.log("Error"+set_result.error)
			res.send({"request":"fail", "error":"Failed to save."});
		}
		else{
			res.send({"request":"success", 'msg':"save success"})
		}
	});

});



router.post('/request/note',function(req,res){
	email = req.decoded.email;
	var title = req.body.title;
	var db = req.db;
	
	dbutils.db_find(db, 'user:'+email, {"type":"note", "title":title}, function(set_result){
		if (set_result.fail == true){
			//Error changing note text
			console.log("Error"+set_result.error)
			res.send({"request":"fail", "error":"Failed to load note."});
		}
		else{
			records = set_result['records'];
			if (records.length != 1){
				res.send({"request":"fail", "error":"Failed to load note."});
			}
			else{
				note = records[0]['text'];
				res.send({"request":"success", "note":note});
			}
		}
	});

});

module.exports = router;