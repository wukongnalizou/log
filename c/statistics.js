module.exports = new class extends Controller {
	constructor() {
		super();
	}
	_index() {
		this.daytime = new Date(new Date().toLocaleDateString()).getTime(); //当天0点0分0秒
		let nowtime = new Date().getTime();
		let lasttime = this.daytime + 86500000;
		let actiontime = lasttime - nowtime; //执行时间
		this.daycount = day();
		this.sumobj = {};
		this.videoObj = [];
		// this.fid = 35;
		// this._compute();
		// this._video();
		// this._videodata(7);
		setTimeout( () => {
			let now = new Date().getTime();
			log('start');
			this.mysql = LOAD.mysql();
			this._summary().then( res => {
				return this._keep();
			}).then( res => {
				return this._write();
			}).then( res => {
				return this._video();
			}).then( res => {
				this.mysql.close();
				this._index();
				log('end');
			})	
		}, actiontime);
	}
	_compute() {
		this.mysql.sql(`SELECT gr_time FROM TABLE(usergameresult) WHERE id = ${this.fid}`,res => {
			if(!res){
				console.log('end');
				this.mysql.close();
				return;
			}else{
				let days = day(res[0].gr_time);
				this.mysql.sql(`UPDATE TABLE(usergameresult) SET addday = ${days} WHERE id = ${this.fid}`,res=>{
					this.fid++;
					this._compute();
				})
			}
		})
	}
	//数据汇总
	_summary() {
		let daytime = this.daytime/1000; //秒时间戳
		//新增用户
		return new Promise( resolve => {
			this.mysql.sql("SELECT COUNT(*) as num FROM TABLE(user) WHERE `regtime_day`= "+this.daycount, res => {
				this.sumobj.user = res[0].num;
				resolve();
			});
		}).then( resolve => {
			//授权人数
			return new Promise( resolve => {
				this.mysql.sql("SELECT COUNT(*) as num FROM TABLE(user) WHERE `regtime_day`>= "+this.daycount+" and `oauth` = 1", res => {
					this.sumobj.oauth = res[0].num;
					resolve();
				});
			})
		}).then( resolve => {
			//视频点击量和平均播放时长
			return new Promise( resolve => {
				this.mysql.sql("SELECT COUNT(*) as num,sum(ontime) as times FROM TABLE(tg_gameontime) WHERE `starttime`>= "+daytime, res => {
					this.sumobj.click = res[0].num
					this.sumobj.averageplaytime = Math.round(res[0].times/res[0].num);
					resolve();
				});
			})
		}).then( resolve => {
			//分享人数
			return new Promise( resolve => {
				this.mysql.sql("SELECT COUNT(*) as num FROM (SELECT * FROM TABLE(usershare) WHERE share_day = "+ this.daycount +" GROUP BY user_id) a ", res => {
					this.sumobj.shareuser = res[0].num || 0;
					resolve();
				});
			})
		}).then( resolve => {
			//分享次数
			return new Promise( resolve => {
				this.mysql.sql("SELECT sum(share_times) as num FROM TABLE(usershare) WHERE share_day = " + this.daycount, res => {
					this.sumobj.sharenum = res[0].num || 0;
					resolve();
				});
			})
		}).then( resolve => {
			//平均时长
			return new Promise( resolve => {
				this.mysql.sql("SELECT COUNT(*) as num,sum(ontime) as times FROM TABLE(tg_userontime) WHERE `logintime`>= "+daytime, res => {
					if(!res[0].times) res[0].times = 0;
					if(res[0].num == 0) this.sumobj.averagetime = 0;
					else this.sumobj.averagetime = Math.round(res[0].times/res[0].num);
					resolve();
				});
			})
		})
	}
	//汇总留存数据
	_keep(){
		//次留
		return new Promise( resolve => {
			this.mysql.sql(`SELECT COUNT(*) as num FROM TABLE(userlogin) WHERE login_day = ${this.daycount - 1} AND user_id IN (SELECT id FROM TABLE(user) WHERE regtime_day = ${this.daycount - 2})`, res => {
				this.sumobj.liu2 = res[0].num;
				resolve();
			});
		}).then( res => {
			//三留
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) as num FROM TABLE(userlogin) WHERE login_day = ${this.daycount - 1} AND user_id IN (SELECT id FROM TABLE(user) WHERE regtime_day = ${this.daycount - 3})`, res => {
					this.sumobj.liu3 = res[0].num;
					resolve();
				});
			})
		}).then( res => {
			//7留
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) as num FROM TABLE(userlogin) WHERE login_day = ${this.daycount - 1} AND user_id IN (SELECT id FROM TABLE(user) WHERE regtime_day = ${this.daycount - 7})`, res => {
					this.sumobj.liu7 = res[0].num;
					resolve();
				});
			})
		}).then( res => {
			//30留
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) as num FROM TABLE(userlogin) WHERE login_day = ${this.daycount - 1} AND user_id IN (SELECT id FROM TABLE(user) WHERE regtime_day = ${this.daycount - 30})`, res => {
					this.sumobj.liu30 = res[0].num;
					console.log(this.sumobj);
					resolve();
				});
			})
		})
	}
	//汇总数据写入
	_write(){
		let data = this.sumobj;
		//写入汇总数据
		return new Promise( resolve => {
			this.mysql.sql(`INSERT INTO TABLE(statistics)(date,usernum,click,averplay,averlogin,sharenum,shareuser,oauth,liu2,liu3,liu7,liu30) VALUES(${this.daycount},${data.user},${data.click},${data.averageplaytime},${data.averagetime},${data.sharenum},${data.shareuser},${data.oauth},0,0,0,0)`, res => {
				resolve();
			});
		}).then( res => {
			return new Promise( resolve => {
				this.mysql.sql(`UPDATE TABLE(statistics) SET liu2=${data.liu2},liu3=${data.liu3},liu7=${data.liu7},liu30=${data.liu30} WHERE date=${this.daycount-1}`,res => {
					resolve();
				})
			})
		})
	}
	//视频数据
	_video(){
		return new Promise( resolve => {
			this.mysql.sql(`SELECT id,name FROM TABLE(game) WHERE state = 2`, res => {
				this.sumobj.games = res;
				resolve();
			});
		}).then( res=> {
			return new Promise( resolve => {
				// for( let [index,item] of this.sumobj.games.entries()) {
				// 	this._videodata(index,item.id);
				// }
				for(let i = 0; i < this.sumobj.games.length; i++) {
					this._videodata(i,this.sumobj.games[i].id).then( res => {
						if(res == this.sumobj.games.length - 1 ) resolve();
					});
				}
			})
		})
	}
	_videodata(i,id){
		return new Promise( resolve => {
			//视频新增用户
			this.mysql.sql(`SELECT COUNT(*) as num FROM TABLE(userplaygame) WHERE game_id = ${id} AND frist_day = ${this.daycount}`, res => {
				this.videoObj[i] = this.videoObj[i] || {};
				this.videoObj[i].user = res[0].num;
				resolve();
			});
		}).then( res=> {
			//视频点击量
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) as num FROM TABLE(tg_gameontime) WHERE add_day = ${this.daycount} AND game_id = ${id}`,res => {
					this.videoObj[i].click = res[0].num;
					resolve();
				})
			})
		}).then( res => {
			//平均播放时长
			return new Promise( resolve => {
				this.mysql.sql(`SELECT sum(ontime) time FROM TABLE(tg_gameontime) WHERE add_day = ${this.daycount} AND game_id = ${id}`,res => {
					let time = res[0].time || 0;
					this.videoObj[i].avg = this.videoObj[i].click ? time/this.videoObj[i].click : 0;
					resolve();
				})
			})
		}).then( res => {
			//分享人数
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) as num FROM TABLE(usershare) WHERE share_day = ${this.daycount} AND game_id = ${id}`,res => {
					this.videoObj[i].shareuser = res[0].num;
					resolve();
				})
			})
		}).then( res => {
			//分享次数
			return new Promise( resolve => {
				this.mysql.sql(`SELECT sum(share_times) as num FROM TABLE(usershare) WHERE share_day = ${this.daycount} AND game_id = ${id}`,res => {
					this.videoObj[i].sharenum = res[0].num || 0;
					resolve();
				})
			})
		}).then( res => {
			//今日匹配
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) as num from TABLE(friend) WHERE userone_id IN (SELECT user_id FROM TABLE(usergameresult) WHERE game_id = ${id} AND addday = ${this.daycount}) AND usertwo_id IN (SELECT user_id FROM TABLE(usergameresult) WHERE game_id = ${id} AND addday = ${this.daycount})`,res => {
					this.videoObj[i].mate = res[0].num;
					resolve();
				})
			})
		}).then( res => {
			//次留
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) num FROM (SELECT * FROM TABLE(tg_gameontime) WHERE add_day = ${this.daycount - 1} AND game_id = ${id} AND user_id IN (SELECT user_id FROM TABLE(userplaygame) WHERE game_id = ${id} AND frist_day = ${this.daycount - 2}) GROUP BY user_id) a `,res => {
					this.videoObj[i].liu2 = res[0].num;
					resolve();
				})
			})
		}).then( res => {
			//三留
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) num FROM (SELECT * FROM TABLE(tg_gameontime) WHERE add_day = ${this.daycount - 1} AND game_id = ${id} AND user_id IN (SELECT user_id FROM TABLE(userplaygame) WHERE game_id = ${id} AND frist_day = ${this.daycount - 3}) GROUP BY user_id) a `,res => {
					this.videoObj[i].liu3 = res[0].num;
					resolve();
				})
			})
		}).then( res => {
			//七留
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) num FROM (SELECT * FROM TABLE(tg_gameontime) WHERE add_day = ${this.daycount - 1} AND game_id = ${id} AND user_id IN (SELECT user_id FROM TABLE(userplaygame) WHERE game_id = ${id} AND frist_day = ${this.daycount - 7}) GROUP BY user_id) a `,res => {
					this.videoObj[i].liu7 = res[0].num;
					resolve();
				})
			})
		}).then( res => {
			//30留
			return new Promise( resolve => {
				this.mysql.sql(`SELECT COUNT(*) num FROM (SELECT * FROM TABLE(tg_gameontime) WHERE add_day = ${this.daycount - 1} AND game_id = ${id} AND user_id IN (SELECT user_id FROM TABLE(userplaygame) WHERE game_id = ${id} AND frist_day = ${this.daycount - 30}) GROUP BY user_id) a `,res => {
					this.videoObj[i].liu30 = res[0].num;
					resolve();
				})
			})
		}).then( res => {
			//数据写入
			let data = this.videoObj[i];
			return new Promise( resolve => {
				this.mysql.sql(`INSERT INTO TABLE(videodata)(date,gameid,user,click,avg,shareuser,sharenum,mate,liu2,liu3,liu7,liu30) VALUES(${this.daycount},${id},${data.user},${data.click},${data.avg},${data.shareuser},${data.sharenum},${data.mate},0,0,0,0)`,res => {
					resolve();
				})
			})
		}).then( res => {
			//留存写入
			let data = this.videoObj[i];
			return new Promise( resolve => {
				this.mysql.sql(`UPDATE TABLE(videodata) SET liu2=${data.liu2},liu3=${data.liu3},liu7=${data.liu7},liu30=${data.liu30} WHERE date=${this.daycount-1}`,res => {
					resolve(i)
				})
			})
		})
	}
}();
