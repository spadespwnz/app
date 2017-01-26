var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require('fs');
var uid = require('mongodb').ObjectID;
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');

router.get('/upload', function(req,res){
	res.render('pages/trivia_upload');
})
router.get('/list/:cat',function(req,res){
	var cat = req.params.cat;
	var db=req.db;
	db.collection('trivia').find( {"category":cat}).toArray(function(err, cursor){
		if (err){
			res.send("Error loading");
		}
		else{
			if (cursor[0]){
				if (cursor[0].questions){
					var count = cursor[0].questions.length;
					res.send(cursor[0].questions);
				}
				else{
					res.send("no q's");
				}
			}
			else{
				res.send("No q's");
			}
		}
	});
});
router.post('/request/add_category',function(req,res){
	var db = req.db;

	var cat = req.body.cat;
	dbutils.db_upsert(db, 'trivia', {"category":"category_list"}, {"categories":cat}, function(in_push_result){
		if (in_push_result.fail == true){
			//Error adding notelist for user
			
		}
		else{
			
		}
	});

})

router.post('/request/add_question', function(req,res){
	var db = req.db;
	var question = req.body.question;
	var answer = req.body.answer;
	var cat = req.body.cat;


	dbutils.db_upsert(db, 'trivia', {"category":cat}, {"questions":{question: question, answer: answer}}, function(in_push_result){
		if (in_push_result.fail == true){
			//Error adding notelist for user

			
		}
		else{
			res.send({'request':'success'});
		}
	});
	
})


module.exports = router;