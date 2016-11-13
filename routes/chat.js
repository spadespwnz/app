var express = require('express');
var router = express.Router();
var active = 'chat'

/* GET home page. */
router.get('/', function(req, res) { 
  	res.sendfile('index.html');
});

module.exports = router;