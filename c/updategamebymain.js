module.exports = new class extends Controller {
	constructor() {
		super();
	}
	_index() {
		setTimeout( () => {
			this._updategamebymain();
		}, 30000);
	}
	//更新gamebymain
	_updategamebymain(){
		let redis = LOAD.redis();
		let mysql = LOAD.mysql();
		mysql.get("project", {
			state : 1
		}, "", "", "`id`", resproject => {
			resproject = resproject || [];
			resproject.recursion((i,item,next) => {
				mysql.sql("SELECT `id`,`name`,`pic`,`gvideo_new`,`score`,`times` FROM TABLE(game) WHERE `state`=2 AND `gc_id` IN (SELECT `id` FROM TABLE(gameclass) WHERE `project_id`=" + item.id +") ORDER BY `sort` ASC,`gvideo_new` DESC,`id` ASC", resgame => {
					if( !resgame ) next();
					else{
						for(let [key, items] of resgame.entries()){
							resgame[key].id = encrypt(String(items.id));
						}
						redis.hset("gamesByMain", item.id, resgame);
						next();
					}
				} );
			}, over => {
				mysql.close();
				this._index();
			} );
		} );
	}
}();