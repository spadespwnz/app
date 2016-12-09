var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require('fs');
var aws = require('aws-sdk');
var uid = require('mongodb').ObjectID;
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');

const S3_BUCKET = process.env.S3_BUCKET || 'spades-image-collection';
var aws_secret;
var aws_id;
if (!process.env.S3_BUCKET){
	var secrets = require('../secrets.js');
	/*aws_secret = secrets.secret;
	aws_id = secrets.id;*/
	aws.config.update({
		accessKeyId: secrets.id,
		secretAccessKey: secrets.secret
	});
}
var active = 'upload';
/* GET home page. */


router.use(function(req,res,next){
	var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
	if (token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		        res.redirect('/users');  
		    } else {

	    		req.decoded = decoded; 
	        	next();
		    	
		    
		    }
		});
	}
	else{

		res.redirect('/users');
	}

});


router.get('/', function(req, res) {
	if (req.originalUrl.substr(-1) != '/' ){
		url = req.originalUrl;

		url = url + '/';
		return res.redirect(301,url);
		
	}
  	res.render('pages/upload');

});

router.get('/cache.manifest',function (req,res){
	res.header('content-type','text/cache-manifest');
	//res.end('CACHE MANIFEST\n# v0.0.6\nCACHE:\n/m/\nhttps://code.jquery.com/jquery-3.1.0.min.js\nhttps://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css');
	//res.end('CACHE MANIFEST\n# v0.0.9\nCACHE:\n/m/\nhttps://code.jquery.com/jquery-3.1.0.min.js\nhttps://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css\nNETWORK:\n*');
	res.end('CACHE MANIFEST\n# v0.0.15\nCACHE:\n/m/\n/css/bootstrap.min.css\n/scripts/jquery-3.1.0.min.js\n/scripts/FileSaver.min.js');

});
router.post('/upload_request', function(req, res) {
  	var fstream;
  	req.busboy.on('file', function( fieldname, file, filename){
  		fstream = fs.createWriteStream(__dirname+'/../images/'+filename);
  		file.pipe(fstream);
  		fstream.on('close', function(){
  			console.log("finished with: "+filename);

  		})
  	});
  	req.busboy.on('finish', function(){
  		res.redirect('/images');
  	})
  	req.pipe(req.busboy);
});

router.post('/upload_image', function(req,res){
	email = req.decoded.email;
	var fname = req.body.name;
	var ftype = req.body.type;
	var url = req.body.access_url;
	var db = req.db;
	if (ftype.indexOf('image') > -1){
		dbutils.db_upsert(db, 'user:'+email, {"type":'image_uploads'}, {"files":{name: fname, url: url}}, function(in_push_result){
			if (in_push_result.fail == true){
				//Error adding notelist for user
				res.send({'success': 'false', "error":'failed to add to db'});	
			}
			else{
				res.send({'success': 'true', 'url':'/users/u/'+email+'/images/'+fname});
			}
		});
	}
	else{
		res.send({'success': 'false', "error":'not an image'});
	}
	
});

router.get('/clear',function(req,res){
	var db = req.db;
		var s3 = new aws.S3({signatureVersion: 'v4'});
	db.collection('uploads').find( {"type":"image"}).toArray(function(err, cursor){
		if (err){
			res.send("Error loading images");
		}
		else{
			if (cursor[0]){
				if (cursor[0].files){
					var images = cursor[0].files;
					dbutils.db_set(db, 'uploads', {"type":'image'},{'files':[]},function(set_result){
						if (set_result.fail){
							res.send("Failed to clear files from DB")
						}
						else{
							var objectsToDel = [];
							for (var i = 0; i < images.length;i++){
								objectsToDel.push({Key: images[i].name});
							}
							s3.deleteObjects({
								Bucket: S3_BUCKET,
								Delete: {
									Objects: objectsToDel
								}	
							}
							, function(err, data){
								if (err){
									console.log("Error deleting from S3: "+err);
								}
								else{
									res.send("Clear Success");
								}
							});
						}
					});
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
router.get('/images', function(req,res){

	var db = req.db;
	dbutils.db_find(db, 'uploads', {"type":'image'},function(find_result){
		if (find_result.fail == true){
			//Error checking if account already exists
			res.send({"request":"fail", "error":"Failed to find images in database."});
		}
		else{
			if(find_result.records.length > 1){
				res.send({"request":"fail", "error":"Failed to find images in database."});
			}
			else if (find_result.records.length == 0){

				res.send({"request":"fail", "error":"Failed to find images in database."});
			}
			else{
				var images = find_result.records[0].files;
				console.log(images);
				res.send("ok");
			}
		}
	});

})

router.post('/generate_sign', function(req,res){
	email = req.decoded.email;
	var db = req.db;
	var fname = req.body.name;
	var ftype = req.body.type;
	db.collection('user:'+email).find( {"type":"image_uploads","files.name":fname}, {files: {  $elemMatch: {name: fname} }}).toArray( function(err, cursor){
		if (err){
			res.send("Error finding image")
		}
		else{
			if (cursor[0]){
				if (cursor[0].files){
					if (cursor[0].files.length < 1){
						
					}
					else {
				
						var insert_loc = fname.lastIndexOf('.');
						var tag = new uid();
						fname = fname.slice(0, insert_loc)+'-'+tag+fname.slice(insert_loc);

					}

				}
			}
			var s3 = new aws.S3({signatureVersion: 'v4'});
			/*if (!process.env){
				s3.accessKeyId(aws_id);
				s3.secretAccessKey(aws_secret);
			}*/
			const s3_params = {
				Bucket: S3_BUCKET,
				Key: 'users/'+email+'/images/'+fname,
				Expires: 60,
				ContentType: ftype,
				ACL: 'public-read'
			};
			s3.getSignedUrl('putObject', s3_params, function(err, data){
				if (err){
					console.log(err);
					res.send({success:'false', err: err})
				}
				else{
					const returnData = {
						signedRequest: data,
						url: 'https://'+S3_BUCKET+'.s3.amazonaws.com/'+'users/'+email+'/images/'+fname,
						fname: fname
					};
					res.write(JSON.stringify(returnData));
					res.end();
				}
			});


		}
			
	});


});
module.exports = router;