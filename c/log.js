module.exports = new class extends Controller {
	constructor() {
		super();
		this.redis = LOAD.redis();
	}
	//查询新日志
	_r2d() {
		setTimeout( () => {
			this.redis.llen("log", len => {
				if ( len == 0 ) this._r2d();
				else {
					this.mysql = LOAD.mysql();
					this._one();
				}
			} );
		}, 1000 );
	}
	//弹出一条处理
	_one() {
		this.redis.lpop("log", log => {
			if ( log ) {
				try {
					eval("this._" + log.type + "(log.data,log.ip,log.time);");
				}
				catch (e) {
					this.redis.rpush("error_log",log);
					this.mysql.close();
					this._r2d();
				}
			}
			else {
				this.mysql.close();
				this._r2d();
			}
		} );
	}
	//登录
	_login(data,ip,stime) {
		this.redis.hget("user", data.openid, user => {
			if ( !user ) return this._one();
			this.mysql.one("user", {
				openid : data.openid
			}, dbuser => {
				if ( !dbuser ) return this._one();
				this.mysql.update("user", {
					oauth : dbuser.oauth,
					last_time : stime,
					last_time_day : day()
				}, dbuser.id, over => {
					user.id = dbuser.id;
					this.redis.hset("userid", String(dbuser.id), data.openid);
					this.redis.hset("user", data.openid, user);
					this._one();
				} );
			} );
		} );
	}
	//注册
	_regist(data,ip,stime) {
		this.redis.hget("user", data.openid, user => {
			if ( !user ) return this._one();
			this.mysql.one("user", {
				openid : data.openid
			}, dbuser => {
				//数据库中存在该用户
				if ( dbuser ) return this._one();
				this.mysql.insert("user", {
					openid : data.openid,
					tel : "",
					nick : "",
					headimg : "",
					sex : 0,
					country : "",
					province : "",
					city : "",
					regtime : stime,
					regtime_day : day(),
					viptime : 0,
					viptype : 0,
					recharge : 0,
					oauth : 0,
					last_time : stime,
					last_time_day : day()
				}, over => {
					user.id = this.mysql.insertId;
					this.redis.hset("userid", String(user.id), data.openid);
					this.redis.hset("user", data.openid, user, over => {
						this._one();
					} );
				} );
			} );
		} );
	}
	//设置用户信息
	_setUserInfo(data,ip,stime) {
		this.redis.hget("user", data.openid, user => {
			if ( !user ) return this._one();
			this.redis.hget("user_u2o", data.unionid, openid => {
				if ( !openid ) this.redis.hset("user_u2o",data.unionid,data.openid);
			} );
			this.mysql.update("user", {
				unionid : data.unionid,
				nick : delslashes(data.info.nickName),
				headimg : data.info.avatarUrl,
				sex : data.info.gender,
				country : delslashes(data.info.country),
				province : delslashes(data.info.province),
				city : delslashes(data.info.city),
				oauth : 1
			}, {
				openid : data.openid
			}, over => {
				this._one();
			} );
		} );
	}
	//设置用户自定义标签
	_setUserTip(data,ip,stime) {
		data.userTip.nav = data.userTip.nav.column("id");
		data.userTip.modules = data.userTip.modules.column("id");
		data.userTip.unmodules = data.userTip.unmodules.column("id");
		this.redis.hget("user", data.openid, user => {
			if ( !user ) return this._one();
			this.mysql.one("user_tip", {
				uid : user.id
			}, user_tip => {
				if ( user_tip ) this.mysql.update("user_tip", {
					tips : data.userTip
				}, user.id, over => {
					this._one();
				} );
				else this.mysql.insert("user_tip", {
					uid : user.id,
					tips : data.userTip
				}, over => {
					this._one();
				} );
			} );
		} );
	}
	//用户玩解锁游戏记录
	_addAndUpUserPlayGame(data,ip,time){
		this.mysql.one("userplaygame", {
			user_id : data.user_id,
			game_id : data.game_id
		}, userplaygame => {
			if( !userplaygame ){
				this.mysql.insert("userplaygame", {
					user_id : data.user_id,
					nick : data.nick,
					game_id : data.game_id,
					frist_time : data.playtime,
					last_time : data.playtime
				}, over => {
					this._one();
				} );
			}
			else{
				this.mysql.update("userplaygame", {
					nick : data.nick,
					times : userplaygame.times + 1,
					last_time : data.playtime
				}, {
					user_id : data.user_id,
					game_id : data.game_id 
				}, over => {
					this._one();
				} );
			}
		} );
	}
	//用户对游戏打分和评论
	_addUserGameScore(data,ip,time){
		this.mysql.one("usergamescore", {
			user_id : data.user_id,
			game_id : data.game_id
		}, resgamescore => {
			if ( !resgamescore ) {
				this.mysql.insert("usergamescore", {
					game_id : data.game_id,
					user_id : data.user_id,
					nick : data.nick,
					headimg : data.headimg,
					score : data.score,
					game_com : data.game_com,
					com_time : data.com_time
				}, over => {
					insertusergamescorehis.call(this, data);
				} );
			}
			else{
				this.mysql.update("usergamescore", {
					nick : data.nick,
					headimg : data.headimg,
					score : data.score,
					game_com : data.game_com
				}, {
					user_id : data.user_id,
					game_id : data.game_id
				}, over => {
					insertusergamescorehis.call(this, data);
				} );
			}
		} );
		function insertusergamescorehis(data) {
			this.mysql.insert("usergamescorehistory", {
				game_id : data.game_id,
				user_id : data.user_id,
				nick : data.nick,
				score : data.score,
				game_com : data.game_com,
				com_time : data.com_time
			}, over => {
				this._one();
			} );
		}
	}
	//用户吐槽
	_addUserComment(data,ip,time){
		this.mysql.insert("usercomment", {
			user_id : data.user_id,
			nick : data.nick,
			comment : data.comment,
			comtime : data.comtime
		}, over => {
			this._one();
		} );
	}
	//用户游戏结果
	_userGameResult(data,ip,time){
		this.mysql.one("usergameresult", {
			user_id : data.user_id,
			game_id : data.game_id
		}, usergameresult => {
			usergamehis.call(this, data, usergameresult);
		} );
		function usergamehis(data, usergameresult){
			if( !usergameresult ){
				this.mysql.insert("usergameresult", {
					user_id : data.user_id,
					nick : data.nick,
					game_id : data.game_id,
					gr_score : data.gr_score,
					gr_desc : data.gr_grade,
					gr_time : data.gr_time
				}, over => {
					insertusergamehis.call(this, data);
				} );
			}
			else{
				this.mysql.update("usergameresult", {
					nick : data.nick,
					gr_score : data.gr_score,
					gr_desc : data.gr_grade,
					gr_time : data.gr_time
				}, {
					user_id : data.user_id,
					game_id : data.game_id
				}, over => {
					insertusergamehis.call(this, data);
				} );
			}
		}
		function insertusergamehis(data) {
			this.mysql.insert("usergameresulthistory", {
				user_id : data.user_id,
				nick : data.nick,
				game_id : data.game_id,
				gr_desc : data.gr_grade,
				gr_time : data.gr_time
			}, over => {
				this._one();
			} );
		}
	}
	//生成用户订单
	_addUserOrder(data,ip,time){
		this.mysql.insert("userorder", {
			user_id : data.user_id,
			nick : data.nick,
			orderid : data.orderid,
			money : data.money,
			ordertime : time()
		}, over => {
			this._one();
		} );
	}
	//用户完成订单
	_updatUserOrder(data,ip,time){
		this.mysql.update("userorder", {
			state : 1
		}, {
			user_id : data.user_id,
			orderid : data.orderid
		}, over => {
			this._one();
		} );
	}
	//用户点击一级类增加点击记录
	_addTgProcheck(data,ip,time){
		this.mysql.insert("tg_procheck", {
			openid : data.openid,
			pro_id : data.pro_id,
			check_time : data.check_time
		}, over => {
			this._one();
		} );
	}
	//好友关系处理
	_friendship(data,ip,time){
		if(data.openid != data.sender){
			this.redis.hget("friendship", data.openid, friends => {
				friends = friends || [];
				if ( friends.search(data.sender) === false ) {
					friends.push(data.sender);
					this.redis.hset("friendship",data.openid,friends);
				}
			} );
			this.redis.hget("friendship", data.sender, friends => {
				friends = friends || [];
				if ( friends.search(data.openid) === false ) {
					friends.push(data.openid);
					this.redis.hset("friendship",data.sender,friends);
				}
			} );
			this.redis.hget("user", data.openid, resuserone => {
				if( !resuserone ) this._one();
				else this.redis.hget("user", data.sender, resusertwo => {
					if( !resusertwo ) this._one();
					else this.mysql.one("friend", "(`userone_id`='" + resuserone.id + "' AND `usertwo_id`='" + resusertwo.id + "') OR (`userone_id`='" + resusertwo.id + "' AND `usertwo_id`='" + resuserone.id + "')", res => {
						if ( res ) this._one();
						else this.mysql.insert("friend", {
							userone_id : resuserone.id,
							usertwo_id : resusertwo.id
						}, over => {
							this._one();
						} );
					} );
				} );
			} );
		}else{
			this._one();
		}
	}
	//订阅时增加订阅记录
	_addUserSubscribe(data,ip,time){
		this.mysql.insert("user_subscribe", {
			open_id : data.open_id,
			pro_id : data.pro_id
		}, over => {
			this._one();
		} );
	}
	//取消订阅时删除订阅记录
	_deleteUserSubscribe(data,ip,time){
		this.mysql.delete("user_subscribe", {
			open_id : data.open_id,
			pro_id : data.pro_id
		}, over => {
			this._one();
		} );
	}
	//增加用户登录日时间戳、时间戳
	_add_tg_userontime(data,ip,time){
		this.mysql.insert("tg_userontime", {
			openid : data.openid,
			daytime : data.daytime,
			logintime : data.logintime
		}, over => {
			this._one();
		} );
	}
	//修改用户登录时间戳
	_update_tg_userontime(data,ip,time){
		this.mysql.update("tg_userontime",{
			logintime : data.logintime,
			exittime : 0
		},{
			openid : data.openid,
			daytime : data.daytime
		}, over => {
			this._one();
		} );
	}
	//结束用户登录时长生命周期（昨天）
	_over_tg_userontime(data,ip,time){
		this.mysql.update("tg_userontime",{
			exittime : data.exittime,
			"ontime +" : data.ontime 
		},{
			openid : data.openid,
			daytime : data.yesterday
		}, over => {
			this._one();
		} );
	}
	//结束用户登录时长生命周期(当天)
	_over2_tg_userontime(data,ip,time){
		this.mysql.update("tg_userontime",{
			exittime : data.exittime,
			"ontime +" : data.ontime
		},{
			openid : data.openid,
			daytime : data.daytime
		}, over => {
			this._one();
		} );
	}
	//用户开始玩游戏（计时开始）
	_add_tg_gameontime(data,ip,time){
		this.mysql.insert("tg_gameontime",{
			user_id : data.user_id,
			pro_id : data.pro_id,
			gameclass_id : data.gameclass_id,
			game_id : data.game_id,
			starttime : data.starttime
		}, over => {
			this._one();
		} );
	}
	//结束用户玩游戏（计时结束）
	_over_tg_gameontime(data,ip,time){
		this.mysql.update("tg_gameontime",{
			endtime : data.endtime,
			"ontime +" : data.ontime
		},{
			user_id : data.user_id,
			starttime : data.starttime
		}, over => {
			this._one();
		} );
	}
	//重新连接找到上一条数据
	_reconnect_tg_userontime(data,ip,time){
		this.mysql.update("tg_gameontime",{
			starttime : data.newstarttime,
			endtime : 0
		},{
			user_id : data.user_id,
			starttime : data.starttime
		}, over => {
			this._one();
		} );
	}
	//增加新手引导用户
	_addNewHand(data){
		this.mysql.one("newhand", {
			user_id : data.user_id
		}, resnewhand => {
			if( !resnewhand ){
				this.mysql.insert("newhand", {
					user_id : data.user_id,
					newhand_starttime : data.newhandtime
				}, over => {	
					this._one();
				} );
			}
			else{
				this._one();
			}
		} );
	}
	//更改游戏数据
	_updateGame(data){
		let update = {
			score : data.score,
			times : data.times
		};
		this.mysql.update("game", update, {
			id : data.id
		}, over => {
			this._one();
		} );
	}
	//用户修改评分更改游戏分数
	_updateGameScore(data){
		this.mysql.update("game", {
			score : data.score
		}, {
			id : data.id
		}, over => {
			this._one();
		} );
	}
	//增加用户推送模板消息formid
	_addModelformid(data, ip, stime){
		this.mysql.insert("userformid", {
			openid : data.openid,
			formid : data.formid,
			addtime : stime
		},over => {
			this._one();
		} );
	}
	//删除好友关系
	_delfriendship(data){
		this.mysql.sql("DELETE FROM TABLE(friend) WHERE (`userone_id` = "+ data.userone_id + " AND `usertwo_id` = " + data.usertwo_id + ") OR (`userone_id` = "+ data.usertwo_id + " AND `usertwo_id` = " + data.userone_id + ")", res => {
			this._one()
		} );
	}
}();