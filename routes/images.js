var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require('fs');
var aws = require('aws-sdk');
var uid = require('mongodb').ObjectID;
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');


/*
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

*/
router.get('/',function(req,res){
	var db=req.db;

	if (req.originalUrl.substr(-1) != '/' ){
		url = req.originalUrl;

		url = url + '/';
		return res.redirect(301,url);
		
	}
	db.collection('uploads').find( {"type":"image"}).toArray(function(err, cursor){
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
router.get('/:image', function(req,res){
	var db = req.db;
	var fname = req.params.image;
	db.collection('uploads').find( {"type":"image","files.name":fname}, {files: {  $elemMatch: {name: fname} }}).toArray( function(err, cursor){
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


module.exports = router;