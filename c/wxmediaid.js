const CURLS = LOAD.library("curls");
module.exports = new class extends Controller {
	constructor() {
		super();
	}
	_index(){
		//CURLS.post("https://vgame-gm.edisonluorui.com/wxmediaid/uploadNodeMediaid", res => {});
		try{
			setInterval( () => {
				//CURLS.post("https://vgame-gm.edisonluorui.com/wxmediaid/uploadNodeMediaid", res =>{});
			}, 259000000);
		}
		catch(e){
			this._index();
		}
	}
}();