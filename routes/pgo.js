var express = require('express');
var fs = require('fs');
var router = express.Router();
var Tesseract = require('tesseract.js');
var path = require('path')
var jwt = require('jsonwebtoken');
var gm = require('gm');
router.get('/', function(req, res) {
  res.render('pages/pgo');
})
router.get('/login', function(req, res) {
  res.render('pages/pgo_signup');
})

router.get('/getAccountName', function(req, res) {
  var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
  if (token) {
    jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {
      if (err) {

        res.clearCookie("token");
        res.send({
          'success': "false"
        });
        return;
      } else {

        res.send({
          'success': "true",
          "account": decoded.account
        });
        return;
      }
    });
  } else {

    res.clearCookie("token");
    res.send({
      'success': "false"
    });
    return;
  }

})
router.get('/all', function(req,res){
	var db=req.db;
  db.collection('pgo').find().toArray(function(err, cursor){
		if (err){
			res.send("Error loading");
		}
		else{
			if (cursor[0]){
				res.send(cursor[0]);
			}
			else{
				res.send("Empty");
			}
		}
	});
});
router.get('/gyms', function(req,res){
	var db=req.db;
  db.collection('pgo').aggregate(
    //{$sort:{gym:1}},
    {
      $group:
        {
          _id:"$gym",
          account:"$account",
          time_held:{$max: "$time_held"}
        }
    }
  ).toArray(function(err, cursor){
		if (err){
			res.send("Error loading");
		}
		else{
			if (cursor[0]){
				res.send(cursor[0]);
			}
			else{
				res.send("Empty");
			}
		}
	});
	/*db.collection('pgo').find().toArray(function(err, cursor){
		if (err){
			res.send("Error loading");
		}
		else{
			if (cursor[0]){
				res.send(cursor[0]);
			}
			else{
				res.send("Empty");
			}
		}
	});*/
})
router.get('/clear', function(req,res){

	var db=req.db;
	db.collection('pgo').remove();
})
router.post('/add', function(req, res) {
  var db = req.db;
  var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
  var account;
  if (token) {
    jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {
      if (err) {

        res.clearCookie("token");
        res.send({
          'success': "false",
          "err": "Not Logged in"
        });
        return;
      } else {

        account = decoded.account;

      }
    });
  } else {

    res.clearCookie("token");
    res.send({
      'success': "false",
      "err": "Not Logged in"
    });
    return;
  }
  var fstream;
  var fname;
  req.busboy.on('file', function(fieldname, file, filename) {
    fname = __dirname + '/../images/' + filename;
    fstream = fs.createWriteStream(__dirname + '/../images/' + filename);
    file.pipe(fstream);
    fstream.on('close', function() {

    })
  });
  req.busboy.on('finish', function() {
/*
    gm(fname)
      .out("-define")
      .out("png:color-type=1")
      .write(__dirname + '/../images/test2.png', function(){

        console.log("done");

      })

*/
    gm(fname)
    .colors(200)
    .write(__dirname + '/../images/test2.png', (err) => {
      if (err){
        res.send({
          'success': "false",
          "err": "Error reading image."
        });
      }
      else{
        fs.readFile(__dirname + '/../images/test2.png', function(err, data) {

        if (err) {
          res.send({
            'success': "false",
            "err": "Error reading image."
          });
          return;
        }


        Tesseract.recognize(data, {
            lang: path.resolve(__dirname, '../lang/eng/eng')
          })
          .then(function(result) {
            var statsLine = -1;
            var lines = result.text.split('\n');
            console.log(result.text);
            for (var i=0;i<lines.length-2;i++){
              if (lines[i].indexOf("TOTAL G") >= 0 ||lines[i].indexOf("FOTAL G") >= 0  ){
                if (lines[i+1].indexOf("VICTORIES") >= 0 && lines[i+1].indexOf("TIME DEFENDED") >= 0 && lines[i+1].indexOf("TREATS") >= 0){
                  statsLine = i+2
                }
              }
            }
            if (statsLine == -1){
              res.send({
                'success': "false",
                "err": "Error reading image."
              });
              return;
            }
            var area = lines[1];
            var stats_text = lines[statsLine];
            var stats = stats_text.split(" ");
            var wins = stats[0];
            stats.shift();
            var treats = stats.pop();
            var timeHeld = 0;
            for (var i=0;i<stats.length;i++){
              if (stats[i].indexOf('d') >= 0){
                timeHeld += parseInt(stats[i].substring(0, stats[i].indexOf('d')))*24*60*60
              }
              if (stats[i].indexOf('h') >= 0){
                timeHeld += parseInt(stats[i].substring(0, stats[i].indexOf('h')))*60*60
              }
              if (stats[i].indexOf('m') >= 0){
                timeHeld += parseInt(stats[i].substring(0, stats[i].indexOf('m')))*60
              }
              if (stats[i].indexOf('s') >= 0){
                timeHeld += parseInt(stats[i].substring(0, stats[i].indexOf('s')))
              }
            }
            db.collection("pgo").update({account:account,gym:area},{$set:{wins:wins,treats:treats,time_held:timeHeld}}, {upsert: true});
            res.send({"success":"true"});
          })
          .catch((error) => {
            console.log(error);
            res.send({
              'success': "false",
              "err": "Error reading image."
            });
          })
        });
      }
      /*
      gm(fname)
        .bitdepth(24)
        .write(__dirname + '/../images/test.png', function(err){
          if (!err) {
            console.log("done");
          } else{
            console.log(err);
          }
        })
        res.send({
          'success': "false",
          "err": "Error reading image."
        });
        */



    })

  })
  req.pipe(req.busboy);
});

router.post('/signup', function(req, res) {
  var fstream;
  var fname;
  req.busboy.on('file', function(fieldname, file, filename) {
    fname = __dirname + '/../images/' + filename;
    fstream = fs.createWriteStream(__dirname + '/../images/' + filename);
    file.pipe(fstream);
    fstream.on('close', function() {
      console.log("finished with: " + filename);

    })
  });
  req.busboy.on('finish', function() {
    fs.readFile(fname, function(err, data) {
      if (err) {
        res.send("Error reading image")
        return;
      }
      Tesseract.recognize(data, {
          lang: path.resolve(__dirname, '../lang/eng/eng')
        })
        .then(function(result) {
          var lines = result.text.split('\n');
          console.log("Lines: " + lines.length);

          for (var i = 0; i < lines.length - 1; i++) {

            if (lines[i].indexOf("ACCOUNT") >= 0) {
              var account = lines[i + 1];
              res.send(account);
              return;
            }
          }

          res.send("Could Not Find Account");
        })
        .catch((error) => {
          console.log(error);
          res.send('Error reading image');
        })
    })

  })
  req.pipe(req.busboy);
});

router.post('/signup/check', function(req, res) {

  var fstream;
  var fname;
  req.busboy.on('file', function(fieldname, file, filename) {

    fname = __dirname + '/../images/' + filename;

    fstream = fs.createWriteStream(__dirname + '/../images/' + filename);
    file.pipe(fstream);
    fstream.on('close', function() {

    })
  });
  req.busboy.on('finish', function() {
    if (fs.existsSync(fname)){
      console.log("Image file exists:"+fname);
    }
    fs.readFile(fname, function(err, data) {
      if (err) {
        res.send({
          "success": "false",
          "err": "Server failed to read image."
        });
        return;
      }
      if (fs.existsSync(__dirname+ '/../lang/eng/eng.traineddata')){
        console.log("data file exists:"+__dirname+ '/../lang/eng/eng.traineddata');
      }
      Tesseract.recognize(data, {
          lang: path.resolve(__dirname, '../lang/eng/eng')
        })
        .then(function(result) {
          console.log(result.text);
          var lines = result.text.split('\n');
          for (var i = 0; i < lines.length - 1; i++) {
            if (lines[i].indexOf("Low Mot")>=0){
              //My phone style SS
              if (lines[i+1].indexOf("ACCOUNT") >= 0) {
                if (lines.length > i+2){
                  var account = lines[i + 2];
                  var token = jwt.sign({
                    "account": account
                  }, app.get('jwt_secret'), {
                    expiresIn: '72h'
                  });
                  res.cookie('token', token);
                  res.send({
                    "success": "true",
                    "account": account,
                    "token": token
                  });
                  return;
                } else{
                  return;
                }
              } else{
                var account = lines[i + 1];
                var token = jwt.sign({
                  "account": account
                }, app.get('jwt_secret'), {
                  expiresIn: '72h'
                });
                res.cookie('token', token);
                res.send({
                  "success": "true",
                  "account": account,
                  "token": token
                });
                return;
              }
            } else if (lines[i].indexOf("ACCOUNT") >= 0){
              if (lines.length > i+1){
                var account = lines[i + 1];
                var token = jwt.sign({
                  "account": account
                }, app.get('jwt_secret'), {
                  expiresIn: '72h'
                });
                res.cookie('token', token);
                res.send({
                  "success": "true",
                  "account": account,
                  "token": token
                });
                return;
              } else{
                return;
              }
            }
          }
          res.send({
            "success": "false",
            "err": "Could not find Account Name on image."
          });
        })
        .catch((error) => {

          res.send({
            "success": "false",
            "err": "Error reading Image."
          });
        })
    })

  })
  req.pipe(req.busboy);
});


module.exports = router;
