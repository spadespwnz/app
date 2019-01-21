var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require('fs');
var uid = require('mongodb').ObjectID;
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');

var aws = require('aws-sdk');
const S3_BUCKET = process.env.S3_BUCKET || 'spades-image-collection';
var aws_secret;
var aws_id;

aws.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

router.get('/', function(req,res){
  var db = req.db
  db.collection('sphynx').find().toArray(function(err, cursor){
    if (err) {
			res.send("Error");
		}
    else{
      res.send(cursor)
    }
  })
})

router.post('/create_new_hunt', function(req,res){
	var db = req.db;
  var name = req.body.name;
	db.collection('sphynx').insert( {"name":name,"riddles":[], upload_complete: "false", time_created: new Date()}, function(err, records){
    if (err){
      res.send("Error creating hunt")
      return
    }
    var new_id = records.ops[0]._id;
    console.log(records);
    setTimeout(function(){checkHuntUploadCompleted(new_id, db);}, 1000*60*2);
    console.log("New id:"+new_id)
    res.send(new_id);

  });
})
router.post('/add_riddle_to_hunt', function(req,res){

  var db = req.db;
  var id = req.body.id;
  id = id.substring(1,id.length-1);
  var riddle_type = req.body.riddle_type;
  var riddle = req.body.riddle;
  var sol_type = req.body.sol_type;
  var sol = req.body.sol;
  var returnData = {};
  console.log("Adding riddle:"+id);
  if (riddle_type == "IMAGE"){
    getSign(riddle, function(sign){
      if (sign.success == false){
        returnData.success = false;
        returnData.err = "Error Generating Image Sign"
      } else{
        returnData.success = true;
        returnData.haveTask = true;
        returnData.task = "upload_image";
        returnData.sign = sign.signedRequest;
        console.log(sign);
        riddle = sign.url;
        var new_riddle = {riddle_type: riddle_type, riddle: riddle, sol_type: sol_type, sol: sol};
        db.collection("sphynx").update({_id: uid(id)}, {$push: {riddles: new_riddle }}, function(err, rec){
          if (err != null){
            console.log("Err: "+err);
          } else {
            //console.log(rec)
          }
        });

        res.send(JSON.stringify(returnData))
      }
    });

  } else {
    db.collection("sphynx").updateOne({_id: uid(id)}, {$push: {riddles: {riddle_type: riddle_type, riddle: riddle, sol_type: sol_type, sol: sol} }}, function(err, rec){
      if (err != null){
        console.log("Err: "+err);
      } else {
        //console.log(rec)
      }
    });
    returnData.success = true;
    returnData.haveTask = false;
    res.send(JSON.stringify(returnData));
  }
})
router.post('/hunt_upload_completed', function(req,res){
  var db=req.db;
  var id = req.body.id;
  db.collection("sphynx").updateOne({_id: id}, {$set: {upload_complete: "true"}});
  res.send("Complete");

})

function checkHuntUploadCompleted(id, db){
  db.collection("sphynx").findOne({_id: id}, function(err, results){
    if (err){

    } else{
      if (results.upload_complete == "false"){
          db.collection("sphynx").deleteOne({_id: id}, function(err, results){
            if (err) throw err;
            console.log("Deleted incomplete upload")
          })
      } else{
        console.log("Upload Was Completed")
      }
    }
  })
}

function getSign(fname, callback){
  ftype = 'image/jpg'
  var s3 = new aws.S3({signatureVersion: 'v4'});
  /*if (!process.env){
    s3.accessKeyId(aws_id);
    s3.secretAccessKey(aws_secret);
  }*/
  const s3_params = {
    Bucket: S3_BUCKET,
    Key: 'sphynx/images/'+fname,
    Expires: 60,
    ContentType: ftype,
    ACL: 'public-read'
  };

  s3.getSignedUrl('putObject', s3_params, function(err, data){
    var returnData = {};
    if (err){
      console.log(err);
      //res.send({success:'false', err: err})
      returnData = {
        success: false
      }
    }
    else{
      returnData = {
        signedRequest: data,
        url: 'https://'+S3_BUCKET+'.s3.amazonaws.com/'+'sphynx/images/'+fname,
        fname: fname,
        relative_url: 'sphynx/images/'+fname,
        success: true
      };
      //res.write(JSON.stringify(returnData));
      //res.end();

    }
    callback(returnData);
  });
}

module.exports = router;
