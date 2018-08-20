module.exports = new class extends Controller {
	constructor() {
		super();
	}
	_index() {
		setTimeout( () => {
			this._friendPic();
		}, 2400000);
	}
	//好友分享下标
	_friendPic(){
		let mysql = LOAD.mysql();
		let redis = LOAD.redis();
		mysql.sql("SELECT `id`,`pic`,`name` FROM TABLE(project) WHERE `state`=1 ORDER BY sort ASC LIMIT 0,1", res => {
			mysql.close();
			res[0].id = encrypt(String(res[0].id));
			redis.set("sharepic", res[0]);
			this._index();
		} );
	}
}();