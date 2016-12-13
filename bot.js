var tmi = require('tmi.js');
var dbutils = require('./utils/dbutils');
var utils = require('./utils/utils');
var db;

var tmi_options = {
	options:{
		debug: true
	},
	connection:{
		reconnect: true
	},
	identity:{
		username: "SPaDeSPwnzBot",
		password: "oauth:utu61f4wlfspz89guq9pauu6jqhlkd"
	},
	channels: ["#spadespwnzyou"]

};
var admin = 'spadespwnzyou';
var mods = [];
var channel = "#spadespwnzyou";
var bot = new tmi.client(tmi_options);
bot.connect();
console.log("BOT ON");

bot.on("chat", function(channel, userstate, message, self){
	if (self) return;
	var message_parts = message.split(' ');

	switch (message_parts[0]){
		case "!suggest":
			suggestGame(message.slice(9), userstate.username);
			break;
	}
});

function suggestGame(game, user){
	dbutils.db_upsert(db, 'suggestion', {"type":"suggest_list"}, {"game_suggestions":{game: game, from_user: user}}, function(in_push_result){
		if (in_push_result.fail == true){
			//Error adding notelist for user
			bot.say(channel, "@"+user+' failed to add suggestion.');
			}
		else{
			bot.say(channel, "@"+user+' your suggestion was added.');
		
		}
	});
}

module.exports = {
		set_db: function(database){
		db = database;
	}
}