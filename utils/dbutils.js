
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


	}
};