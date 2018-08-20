module.exports = new class extends Controller {
	constructor() {
		super();
	}
	_index() {
		setTimeout( () => {
			this._delformid();
		}, 20000);
	}
	//好友分享下标
	_delformid(){
		let preDate = time() - 168*60*60 - 20;
		let mysql = LOAD.mysql();
		mysql.sql("DELETE FROM TABLE(userformid) WHERE `addtime` <= " + preDate, res => {
			mysql.close();
			this._index();
		} );
	}
}();