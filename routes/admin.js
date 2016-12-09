var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require('fs');
var uid = require('mongodb').ObjectID;
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');

router.use(function(req,res,next){
	var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
	var db = req.db;
	if (token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		        res.redirect('/users');  
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

router.get('/setpassword', function(req,res){
	var email = req.decoded.email;
	res.render('pages/setpassword');
});

router.post('/request/set_pass', function(req,res){
	var db = req.db;
	var email = req.body.user;
	var pass = req.body.pass;
	var salt = utils.genRandomString(16);
	var hash = utils.sha512(pass,salt).passwordHash;
	var data = {"email":email, "hash":hash, "salt":salt};
	dbutils.db_set(db, 'users',{'email':email}, data, function(set_result){
		if (set_result.fail == true){
			res.send({'request':'fail', 'error':'Failed to set password'});
		}
		else{
			res.send({'request':'success'});
		}
	});
	
});


module.exports = router;