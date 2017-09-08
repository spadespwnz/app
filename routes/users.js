var express = require('express');
var router = express.Router();
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');
var jwt = require('jsonwebtoken');
var active = 'users'
/* GET users listing. */


router.get('/logout', function(req,res){
	res.clearCookie("token");
	res.redirect('/users/login');

});
router.get('/login', function(req, res) {
  res.render('pages/login')
});

router.post('/request/login', function(req, res) {
	var db = req.db;
	var email = req.body.username;
	var pass = req.body.password;

	dbutils.db_find(db, 'users', {"email":email},function(find_result){


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
						expiresIn: '72h'
					});
					res.cookie('token', token);
					res.send({"login":"success", "token": token});

				}
				else{

					res.send({"login":"fail", "error":"Incorrect Password."});
				}
			}

		}

	})

});

router.get('/u/:username/images',function(req,res){
	var user = req.params.username;
	var db=req.db;

	if (req.originalUrl.substr(-1) != '/' ){
		url = req.originalUrl;

		url = url + '/';
		return res.redirect(301,url);

	}
	db.collection('user:'+user).find( {"type":"image_uploads"}).toArray(function(err, cursor){
		if (err){
			res.send("Error loading images");
		}
		else{
			if (cursor[0]){
				if (cursor[0].files){
					res.render('pages/images', {images : cursor[0].files});
				}
				else{
					res.send("no images");
				}
			}
			else{
				res.send("No images");
			}
		}
	});

});

router.get('/u/:username/images/:image', function(req,res){
	var user = req.params.username;
	var db = req.db;
	var fname = req.params.image;
	db.collection('user:'+user).find( {"type":"image_uploads","files.name":fname}, {files: {  $elemMatch: {name: fname} }}).toArray(function(err, cursor){
		if (err){
			res.send("Error finding friend")
		}
		else{
			if (cursor[0]){
				if (cursor[0].files){
					if (cursor[0].files.length < 1){
						res.send("File not found");
					}
					else if (cursor[0].files.length > 1){
						res.send("Multiple files with this name ????")
					}
					else{
						var image_name = cursor[0].files[0].name;
						var image_url = cursor[0].files[0].url;
						res.render('pages/show_image', {image_name : image_name, image_url : image_url});
						//res.render('pages/friends_convo', {email: email, active: active, convo_id: cursor[0].my_friends[0].convo_id});
					}
				}
				else{
					res.send("File not found")
				}
			}
			else{
				res.send("File not found");
			}
		}

	});
});


router.post('/request/signup', function(req, res) {
	var db = req.db;
	var email = req.body.username;
	var pass = req.body.password;
	var salt = utils.genRandomString(16);
	var hash = utils.sha512(pass,salt).passwordHash;
	var data = {"email":email, "hash":hash, "salt":salt};
	dbutils.db_find(db, 'users', {"email":email},function(find_result){

		if (find_result.fail == true){
			//Error checking if account already exists
			res.send("Failed to create account.");
		}
		else{

			if (find_result.records.length == 0){
				//Account Name Not Taken
				dbutils.db_insert(db, 'users', data, function (insert_result){

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

router.get('/', function(req, res) {
	email = req.decoded.email;
	res.render('pages/users', {email: email, active: active});
});





module.exports = router;
