
module.exports = {
	db_insert : function(db, table, data, callback){
		var collection = db.collection(table);
		collection.insert (data, function(err, record) {
			if (err){
				callback ({fail: true, error: err});
			}
			else{
				callback( {fail: false, record: record});
			}
		});
	},
	db_find : function(db,table,data, callback){
		var collection = db.collection(table);
		collection.find(data).toArray(function(err, docs){
			if (err){
				callback ({fail: true, error: err});

			}
			else{
				callback ({fail: false, records: docs});
			}


		});
	},
	db_push : function(db,table, data, value, callback){
		var collection = db.collection(table);
		collection.update(
			data,
			{ $push: value},
			function(err){
				if (err){
					callback({fail: true, error: err})
				}
				else{
					callback({fail: false})
				}
			});
			
	},
	db_pull : function(db,table, data, value, callback){
		var collection = db.collection(table);
		collection.update(
			data,
			{ $pull: value},
			function(err){
				if (err){
					callback({fail: true, error: err})
				}
				else{
					callback({fail: false})
				}
			});
			
	},
	db_set : function(db,table, data, value, callback){
		var collection = db.collection(table);
		collection.update(
			data,
			{ $set: value},
			function(err){
				if (err){
					callback({fail: true, error: err})
				}
				else{
					callback({fail: false})
				}
			});
			
	}
	
};