const XML = LOAD.library("xml");
const MD5 = LOAD.library("md5");
const CURLS = LOAD.library("curls");
const CONFIG = LOAD.config();
const S = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
class Order extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	order(shopid,unionid,fn,error) {
		this.redis.hget("user", unionid, user => {
			if ( !user ) return;
			this.redis.hget("shop", shopid, shop => {
				if ( !shop ) return;
				let nonce_str = this.getNonce();
				let out_trade_no = newOrderId();
				let sign = MD5.en(`appid=${CONFIG.wechat.appid}&attach=${shop.intro}&body=${CONFIG.wechat.body}&detail=${shop.title}&device_info=WEB&mch_id=${CONFIG.wechat.mchid}&nonce_str=${nonce_str}&notify_url=${CONFIG.wechat.notify}&openid=${user.openid}&out_trade_no=${out_trade_no}&total_fee=${shop.price*100}&trade_type=JSAPI&key=${CONFIG.wechat.key}`);
				let param = {
					appid : CONFIG.wechat.appid,
					mch_id : CONFIG.wechat.mchid,
					device_info : "WEB",
					nonce_str : nonce_str,
					sign : sign,
					body : CONFIG.wechat.body,
					detail : shop.title,
					attach : shop.intro,
					out_trade_no : out_trade_no,
					total_fee : shop.price * 100,
					notify_url : CONFIG.wechat.notify,
					trade_type : "JSAPI",
					openid : user.openid
				};
				let xml = XML.encode(param);
				CURLS.post("https://api.mch.weixin.qq.com/pay/unifiedorder", xml, res => {
					XML.decode(res, result => {
						if ( result.xml.return_code == "SUCCESS" && result.xml.result_code == "SUCCESS" ) {
							let mysql = LOAD.mysql();
							mysql.insert("order", {
								unionid : unionid,
								orderid : out_trade_no,
								shopid : shopid,
								price : shop.price,
								state : 0
							}, over => {
								mysql.close();
							} );
							let pack = "prepay_id=" + result.xml.prepay_id;
							let timestamp = time();
							fn( {
								appId : CONFIG.wechat.appid,
								timeStamp : timestamp,
								nonceStr : nonce_str,
								package : pack,
								sign : MD5.en(`appId=${CONFIG.wechat.appid}&nonceStr=${nonce_str}&package=${pack}&signType=MD5&timeStamp=${timestamp}&key=${CONFIG.wechat.key}`)
							} );
						}
						else error(result.xml.err_code);
					} );
				} );
			} );
		} );
	}
	getNonce() {
		let nonce_str = "";
		for ( let i = 0; i < 16; i++ ) {
			nonce_str += S.substr(rand(0,S.length - 1),1).toString();
		}
		return nonce_str;
	}
}
module.exports = Order;