var express = require('express');
var router = express.Router();
var dbutils = require('../utils/dbutils');
var utils = require('../utils/utils');
var jwt = require('jsonwebtoken');
var uid = require('mongodb').ObjectID;
var active = 'friends'


router.get('/', function(req,res){
  var db = req.db
  db.collection('packs').find().toArray(function(err, cursor){
    if (err) {
			res.send("Error");
		}
    else{
      res.send(cursor)
    }
  })
})
router.get('/get/:pack', function(req,res){
  var pack = req.params.pack;
  var db = req.db
  db.collection(pack).find().toArray(function(err, cursor){
    if (err) {
			res.send("error");
		}
    else{
      res.send(cursor)
    }
  })
})
router.use(function(req,res,next){
	var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
	if (token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {
		    if (err) {
		        return res.send({"access":"fail","error":"Bad Token","packs":[]});
		    } else {
		        req.decoded = decoded;
		        next();
		    }
		});
	}
	else{
		  res.send({"access":"fail","error":"No Token","packs":[]});
	}

});
router.post('/getGhosts/:pack', function(req,res){
  var pack = req.params.pack;

  var db = req.db
  db.collection(pack).find().toArray(function(err, cursor){
    if (err) {
			res.send("error");
		}
    else{

      res.send(cursor)
    }
  })
})


router.post('/upload', function(req, res) {
  var packName = req.body.packName
	email = req.decoded.email;
  packName = email+"."+packName
  var times = req.body.times

	db = req.db;
	db.collection('packs').update( {"pack":packName}, {"times":times,"pack":packName},{upsert: true});
  res.send({"success":"true"})

});
router.post('/UploadGhostData', function(req,res){
  var level = req.body.level
  var char = req.body.char
  var data = req.body.data
  var packName = req.body.packName
	email = req.decoded.email;
  packName = email+"."+packName
  db.collection(packName).update( {"level":level}, {"level":level, "char":char,"data":data},{upsert: true});
  res.send({"success":"true"})
})
router.post('/getPacks', function(req,res){

  var db = req.db
  console.log("getting packs")
  db.collection("packs").find().toArray(function(err, cursor){
    if (err) {
      res.send("Error");
    }
    else{
      res.send(cursor)
    }
  })
})
router.post('/getPacks/:pack', function(req,res){
  var pack = req.params.pack
  var db = req.db
  db.collection("packs").find({"pack":pack}).toArray(function(err, cursor){
    if (err) {
      res.send("Error");
    }
    else{
      if (cursor){
        if (cursor[0]){
          res.send(cursor[0].times)
        }
        else{
          res.send("error")
        }
      }
      else{
        res.send("error")
      }
    }
  })
})
router.post('/download', function(req, res) {
  var packName = req.body.packName
	email = req.decoded.email;
  packName = email+"."+packName
  var times = req.body.times

	db = req.db;
	db.collection('packs').update( {"pack":packName}, {"times":times,"pack":packName},{upsert: true});
  res.send({"success":"true"})

});
module.exports = router;
