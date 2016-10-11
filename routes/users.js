var express = require('express');
var router = express.Router();
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');
var jwt = require('jsonwebtoken');

/* GET users listing. */

router.get('/login', function(req, res) {
  res.render('pages/login')
});
router.post('/request/login', function(req, res) {
	var db = req.db;
	var email = req.body.username;
	var pass = req.body.password;

	dbutils.db_find(db, 'users', {"email":email},function(find_result){
		console.log(find_result)

		if (find_result.fail == true){
			//Error checking if account already exists
			res.send({"login":"fail", "error":"Failed to login"});
		}
		else{
			if(find_result.records.length > 1){
				res.send({"login":"fail", "error":"Failed to log in."});
			}
			else if (find_result.records.length == 0){

				res.send({"login":"fail", "error":"Account Does Not Exist."});
			}
			else{
				var records = find_result.records;
				var salt = records[0].salt;
				var correct_hash = records[0].hash;

				var hash = utils.sha512(pass, salt).passwordHash;

				if (hash == correct_hash){

					var token = jwt.sign({"email":email}, app.get('jwt_secret'), {
						expiresIn: '24h'
					});
					res.cookie('token', token);
					res.send({"login":"success"});

				}
				else{

					res.send({"login":"fail", "error":"Incorrect Password."});
				}
			}

		}

	})

});



router.post('/request/signup', function(req, res) {
	var db = req.db;
	var email = req.body.username;
	var pass = req.body.password;
	var salt = utils.genRandomString(16);
	var hash = utils.sha512(pass,salt).passwordHash;
	var data = {"email":email, "hash":hash, "salt":salt};
	dbutils.db_find(db, 'users', {"email":email},function(find_result){
		console.log(find_result)

		if (find_result.fail == true){
			//Error checking if account already exists
			res.send("Failed to create account.");
		}
		else{

			if (find_result.records.length == 0){
				//Account Name Not Taken
				dbutils.db_insert(db, 'users', data, function (insert_result){
					console.log(insert_result);
					if (find_result.fail == true){
						//Error checking if account already exists
						res.send("Failed to create account.");
					}
					else{
						res.send("Account Successfully Created");
					}

				});;
			}
			else{
				//Account Name Taken
				res.send("Account Already Exists");

			}

		}

	})

});


router.use(function(req,res,next){


	var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
	if (token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		        return res.redirect('/notes/login');    
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
	res.render('pages/users', {email: email});
});





module.exports = router;