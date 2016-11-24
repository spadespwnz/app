var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var fs = require('fs');

var active = 'm';
/* GET home page. */


router.use(function(req,res,next){
	var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
	if (token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		        res.redirect('/users');  
		    } else {
		    	if ( decoded.email == 'spades'){
		    
		        	next();
		    	}
		    	else{
		    		res.redirect('/users');
		    	}
		    }
		});
	}
	else{

		res.redirect('/users');
	}

});


router.get('/', function(req, res) {
  	res.render('pages/upload');

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

module.exports = router;