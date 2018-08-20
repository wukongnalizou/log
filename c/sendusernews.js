const CURLS = LOAD.library("curls");
module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//查询新日志
	_index() {
		setTimeout( () => {
			this.redis.llen("sendnewslog", len => {
				if ( len == 0 ) {
					this._index();
				}
				else {
					this.mysql = LOAD.mysql();
					this._one();
				}
			} );
		}, 180000);
	}
	//弹出一条处理
	_one() {
		this.redis.lpop("sendnewslog", log => {
			if ( log ) {
				try {
					eval("this._" + log.type + "(log.data,log.ip,log.time);");
				}
				catch (e) {
					this.redis.rpush("errorsendnews_log",log);
					this.mysql.close();
					this._index();
				}
			}
			else {
				this.mysql.close();
				this._index();
			}
		} );
	}
	//发送
	_sendnews(data, ip, stime){
		LOAD.library("wx").getToken( token => {
			if ( token.state == 1 ){
				data.user.recursion((i, item, next) => {
					CURLS.post("https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=" + token.access_token, JSON.stringify( {
						touser : item.openid,
						template_id : data.template_id,
						page : "pages/index/index",
						form_id : item.formid,
						data : data.wxdata,
						emphasis_keyword : data.emphasis_keyword
					} ), res => {
						this.mysql.delete("userformid", {
							openid : item.openid,
							formid : item.formid
						}, over => {
							next();
						}, true );
					} );
				}, over => {
					this._one();
				} );
			}
			else{
				this._one();
			}
		} );
	}
	/*_sendnews(data, ip, stime){
		data.user.recursion((i, item, next) => {
			CURLS.post("https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=" + "12_GGMl9dstqXtkelFv0xzy9c-CHVR29YA7RyBXKazZ2PXpofdhloX7_kkL4MdMj-07bYD4I9M1WQfRJrXbXLbnfC6a-eZtDND10C5RR_Dw1cv25-rsmTLw63eEildZ-sJNtIPJ0NL3e06Y8nwlFPXeAIATDL", JSON.stringify( {
				touser : item.openid,
				template_id : data.template_id,
				page : "pages/index/index",
				form_id : item.formid,
				data : data.wxdata,
				emphasis_keyword : data.emphasis_keyword
			} ), res => {
				echo(res);
				this.mysql.delete("userformid", {
					openid : item.openid,
					formid : item.formid
				}, over => {
					next();
				}, true );
			} );
		}, over => {
			this._one();
		} );
	}*/
}();