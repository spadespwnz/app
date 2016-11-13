var express = require('express');
var router = express.Router();
var path = require('path');
var active = 'net';
router.get('/', function(req, res) {
  res.render('pages/net');
});

router.get('/buildings', function(req, res) {
  res.sendFile(path.resolve(__dirname+'/../nettack/buildings.json'));
});

router.get('/img/:name', function(req, res) {
  res.sendFile(path.resolve(__dirname+'/../public/net/images/'+req.params.name+'.jpg'));
});


module.exports = router;