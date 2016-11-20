var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');

var active = 'rpg';
/* GET home page. */


router.use(function(req,res,next){
	var token = req.cookies.token || req.body.token || req.query.token || req.headers['x-access-token'];
	if (token){
		jwt.verify(token, app.get('jwt_secret'), function(err, decoded) {      
		    if (err) {
		        req.logged = false;
		        next();    
		    } else {
		    	req.logged = true;
		        req.decoded = decoded;    
		        next();
		    }
		});
	}
	else{

		req.logged = false;
		next();    
	}

});

router.get('/', function(req, res) {
	if (req.logged){
  		res.render('pages/rpg', {active: active, email: req.decoded.email});
  	}
  	else{
  		res.render('pages/rpg', {active: active, email: ''});
  	}
});

module.exports = router;