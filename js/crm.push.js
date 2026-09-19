"use strict";

$(function(){
	get_sent_stats();

	window.onbeforeunload = function(){
		return false;
	};

	$(document).on("scroll", function(){
		let $u = $(".notify .page_up");
		if($(this).scrollTop()>200) $u.stop().fadeIn("slow");
		else $u.stop().fadeOut("slow");
	});

	if(!!getUrlPara("order_id")) $("select[data-template]").val("unpaid_order").trigger("change");
});

function hj_update__push(d){
	return $.ajax({
		url: location.href, 
		type: "POST", 
		dataType: "json", 
		data: d, 
		async: true, 
		timeout: 10000
	});
}

function get_sent_stats(){
	hj_update__push({
		action: "get_sent_stats"
	}).then(function(r){
		r = r["Values"];
		$("[data-sent_stats]").text(r["date"]+" 午夜起，已寄給 "+numberWithCommas(r["users_sent"]||0)+"人，共 "+numberWithCommas(r["pushs_sent"]||0)+"則");
	});
}

function get_recipients(){
	let $recipients = $(".recipients"), 
		uid_selection = parseInt($("input[name='uid_selection']:checked").val() || 0), 
		devices = [
			"iPhone", 
			"iPad", 
			"Android", 
			"手機網頁", 
			"電腦版"
		], 
		device = $("input[name='device']:checked").map(function(){return parseInt(this.value);}).get().sort(), 
		uid_interval = $("input[data-uid_interval]").map(function(){return parseInt(this.value || 1);}).get().sort(), 
		uid_listed = $("textarea[data-uid_listed]").val().split(",").map(function(u){return parseInt(u.trim())||1}).sort();

	$recipients.slideUp("fast");
	$(".recipient_data .result").empty();

	if(uid_interval[1]-uid_interval[0]>100000){
		msg('<i class="far fa-exclamation-triangle"></i> 考量查詢量能，避免一次選擇超過 10萬位用戶'); return;
	}

	hj_loading(true);
	hj_update__push({
		action: "get_recipients", 
		uid_interval: uid_selection==0 ? JSON.stringify(uid_interval) : "", 
		uid_listed: uid_selection==1 ? JSON.stringify(uid_listed) : "", 
		device: JSON.stringify(device)
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				r = r["Values"];
				$recipients.empty();
				for(let user_id in r){
					let u = r[user_id];
					for(let t in u["tokens"]){
						let device = devices[parseInt(u["tokens"][t]["device"])], 
							fcm_id = parseInt(u["tokens"][t]["fcm_id"]), 
							sent_today = parseInt(u["tokens"][t]["sent_today"]);

						$("<li>", {
							onclick: sent_today>0 ? 
								"alertify.error('* 略過重複 #"+fcm_id+"')" : 
								"send_push(false, $(this));", 
							title: u["username"]+" - "+device+" # "+fcm_id, 
							"data-username": u["username"], 
							"data-nickname": u["nickname"], 
							"data-fcm_id": fcm_id, 
							"data-fcmtoken": u["tokens"][t]["fcmtoken"], 
							"data-device": u["tokens"][t]["device"], 
							"data-sent_today": sent_today
						}).appendTo($recipients);

					}
				}

				$recipients.slideDown("fast", function(){
					$(window).scrollTop($recipients.get(0)?.offsetTop-50);
				});
			break;

			case 2:
				$recipients.show();
				msg('<i class="far fa-exclamation-triangle"></i> 資料漏填，或未選任何裝置');
			break;
		}
	}).fail(function(e){
		msg('<i class="far fa-exclamation-triangle"></i> 出錯了：<br>'+JSON.stringify(e));
	}).always(function(){
		hj_loading(false);
	});
}

function send_push(bulk, $btn){
	bulk = bulk || false;
	$btn = $btn==null ? $(".recipients li[data-sent_today='0']:first") : $btn;
	if(!$btn.length) return false;

	let d = $btn.get(0)?.dataset, 
		$push = $(".push_data"), 
		push = {
			title: ($push.find("[data-title]").val() || "").trim(), 
			body: ($push.find("[data-body]").val() || "").trim(), 
			url: ($push.find("[data-url]").val() || "https://hearty.me").trim(), 
			tag: ($push.find("[data-tag]").val() || "hj-default").trim(), 
			device: Number(d["device"] || 0), 
			fcm_id: Number(d["fcm_id"] || 0), 
			fcmtoken: (d["fcmtoken"] || "").trim(), 
			username: (d["username"] || "").trim(), 
			nickname: (d["nickname"] || "").trim()
		};

	if(push["title"].length<2 || push["body"].length<4){
		msg('<i class="far fa-exclamation-triangle"></i> 請填寫推播訊息'); return false;
	}

	push["title"] = push["title"]
		.replace(/\{{username}}/g, push["username"])
		.replace(/\{{nickname}}/g, push["nickname"]);
	push["body"] = push["body"]
		.replace(/\{{username}}/g, push["username"])
		.replace(/\{{nickname}}/g, push["nickname"]);
	push["url"] = push["url"].replace(/\{{username}}/g, push["username"]);

	if(bulk){
		send_push_exec(push, bulk, $btn);
	}
	else{
		alertify.set({labels: {ok: "取消", cancel: '<i class="fas fa-inbox-out"></i> 發送'}, buttonReverse: false});
		alertify.confirm('<i class="far fa-comment-lines"></i> 即將推播予：'+push["nickname"]+" ("+push["username"]+"，# "+numberWithCommas(push["fcm_id"])+")", function(e){
			if(!e) send_push_exec(push, bulk, $btn);
		});
	}
}
	function send_push_exec(push, bulk, $btn){
		hj_update__push({
			action: "send_push", 
			push: JSON.stringify(push)
		}).then(function(r){
			let v = r["Values"];
			switch(r["Status"]){
				case 1:
					console.log(JSON.stringify(r));
				break;

				case 3:
					alertify.error('<i class="fas fa-exclamation-triangle"></i> 略過重複：'+push["username"]+" (# "+numberWithCommas(push["fcm_id"])+")");
				break;

				default:
					// firebase.google.com/docs/reference/fcm/rest/v1/ErrorCode
					if("error" in v && v["error"]["code"]==404){
						hj_update__push({
							action: "revoke_fcmtoken", 
							fcmtoken: push["fcmtoken"]
						}).then(function(r){
							if(r["Status"]==1){
								alertify.success('<i class="far fa-comment-alt-times"></i> token # '+numberWithCommas(push["fcm_id"])+" 已註銷");
							}
							else{
								alertify.error('<i class="far fa-exclamation-circle"></i> token # '+numberWithCommas(push["fcm_id"])+" 註銷失敗");
							}
						});
					}
					else{
						alertify.error('<i class="far fa-exclamation-triangle"></i> 推播失敗<br>：'+JSON.stringify(r) );
						console.error( JSON.stringify(r) );
					}
				break;
			}

			if(bulk){
				let $btn_next = $btn.nextAll("[data-bulk='"+$btn.attr("data-bulk")+"']").eq(0);

				// ### debug
				console.log("* debug: "+$btn_next.length+"; data-sent_today: "+$(".recipients li[data-sent_today='0']").length);

				if($btn_next.length>0){
					send_push(bulk, $btn_next);
				}
				else if($(".recipients li[data-sent_today='0']").length<=1){
					get_sent_stats();
					msg('<i class="far fa-comments-alt"></i> 推播群發完畢', "好耶", function(){
						$(window).scrollTop(0);
					});
				}
			}
			$btn.remove();

			let $res = $(".result");
			$res.children().slice(19).remove(); // 只留前 19個，減少 loading

			$("<ol>", {
				title: push["nickname"], 
				onclick: "$(this).fadeOut('fast');", 
				"data-username": push["username"], 
				"data-success": +(r["Status"]==1), 
				html: $("<li>", {
						"data-device": push["device"], 
						text: push["username"]+" (#"+numberWithCommas(push["fcm_id"])+")"
					}).add($("<li>", {
						text: push["title"]
					})).add($("<li>", {
						text: push["body"]
					})).add($("<li>", {
						title: push["url"], 
						text: "🌐 "+push["url"]
					})).add($("<li>", {
						title: push["tag"], 
						text: "🔖 "+push["tag"]
					}))
			}).prependTo($res).fadeIn();
		}).fail(function(e){
			alertify.error('<i class="far fa-exclamation-triangle"></i> 異常：'+JSON.stringify(e));

			// 使其繼續
			if(bulk){
				let $btn_next = $btn.nextAll("[data-bulk='"+$btn.attr("data-bulk")+"']").eq(0);

				// ### debug
				console.log("* debug: "+$btn_next.length+"; data-sent_today: "+$(".recipients li[data-sent_today='0']").length);

				if($btn_next.length>0){
					send_push(bulk, $btn_next);
				}
				else if($(".recipients li[data-sent_today='0']").length<=1){
					get_sent_stats();

					// 完成提醒
					if($("input[name='done_dingdong']:checked").length) dingdong();

					msg('<i class="far fa-comments-alt"></i> 推播群發完畢', "好耶", function(){
						$(window).scrollTop(0);
					});
				}
			}
			$btn.remove();
		});
	}

	function send_push_bulk(){
		let $d = $(".recipients li[data-sent_today='0']"), 
			d = $d.length;

		if(d>0){
			alertify.set({labels: {ok: "取消", cancel: '<i class="fas fa-inbox-out"></i> 確定群發'}, buttonReverse: false});
			alertify.confirm('<i class="fal fa-comments-alt"></i> 即將推播至 '+d+"台裝置", function(e){
				if(!e){
					// ref: stackoverflow.com/a/3672400
					send_push(true, $d.odd().attr({"data-bulk": "odd"}).eq(0) );
					send_push(true, $d.even().attr({"data-bulk": "even"}).eq(0) );
				}
			});
		}
		else{
			msg('<i class="far fa-exclamation-triangle"></i> 沒有可發送的裝置，請先行查詢');
		}
	}
	function filter_finished(hide){
		let $r = $(".recipients");
		if(!hide) $r.removeClass("unfinished");
		else $r.addClass("unfinished");
	}

function template_prefill(n){
	switch(n){
		case "greeting":
			$.ajax({
				url: "//hearty.me/home", 
				type: "POST", 
				dataType: "json", 
				data: {
					action: "greeting", 
					greeting_id: 0
				}, 
				async: true
			}).then(function(r){
				r = r["Values"];
				if("greeting_title" in r){
					template_prefilling({
						title: "{{nickname}}晚安", 
						body: r["greeting_title"].trim(), // 換行： .split("？").join("？\n").trim(), 
						url: "https://hearty.me/{{username}}?a={{username}}&link=bitly.com/3I8Kc7x", 
						// ALT: url: "https://hearty.me/{{username}}?link=hearty.me/home?a={{username}}", 
						tag: "hj-greeting"
					});
				}
			});
		break;

		case "vip_7":
			template_prefilling({
				title: "哈囉{{nickname}}", 
				body: "謝謝你填寫知心小調查，7日 VIP 已送達你的溫度日記嚕~", 
				url: "https://hearty.me/{{username}}?a={{username}}&link=bitly.com/33GVqRW", 
				// ALT: url: "https://hearty.me/{{username}}?link=hearty.me/account?wvtab=1", 
				tag: "hj-billing"
			});
		break;

		case "vip_7-en":
			template_prefilling({
				title: "Hi {{nickname}}", 
				body: "Received a 7-day VIP credit for the survey", 
				url: "https://hearty.me/{{username}}?a={{username}}&link=bitly.com/33GVqRW", 
				// ALT: url: "https://hearty.me/{{username}}?link=hearty.me/account?wvtab=1", 
				tag: "hj-billing"
			});
		break;

		case "response":
			template_prefilling({
				title: "嗨{{nickname}}", 
				body: "已透過 Email回覆您的客服，請看信箱，並確認垃圾信 ( ´･ヮ･)ﾉ", 
				url: "https://hearty.me/{{username}}?link=hearty.me/wv?o=go.hearty.me/hj-gmail", 
				tag: "hj-cs"
			});
		break;

		case "response-en":
			template_prefilling({
				title: "Hi {{nickname}}", 
				body: "Check email inbox for the reply ( ´･ヮ･)ﾉ", 
				url: "https://hearty.me/{{username}}?link=hearty.me/wv?o=go.hearty.me/hj-gmail", 
				tag: "hj-cs"
			});
		break;

		case "post_public":
			template_prefilling({
				title: "{{nickname}}", 
				body: "你的公開日記已公開 ~ ◍•ᴗ•◍", 
				url: "https://hearty.me/{{username}}?link=hearty.me/feed", 
				tag: "hj-cs"
			});
		break;

		case "post_publish":
			template_prefilling({
				title: "{{nickname}}", 
				body: "你的投稿日記已成功投稿，快到日記牆上看看吧！✧❛◡❛", 
				url: "https://hearty.me/{{username}}?link=hearty.me/feed", 
				tag: "hj-cs"
			});
		break;

		case "post_unqualified":
			template_prefilling({
				title: "系統提醒", 
				body: "您的投稿日記遭檢舉，請遵守《投稿日記規範》呦 (;´ㅁ`)=3", 
				url: "https://hearty.me/{{username}}", 
				tag: "hj-cs"
			});
		break;

		case "faq_penpal":
			template_prefilling({
				title: "{{nickname}}", 
				body: "如何與筆友交換日記 (FAQ)", 
				url: "https://hearty.me/{{username}}?link=faq.hearty.me/tutorial/penpal_diaries", 
				tag: "hj-cs"
			});
		break;

		case "buyer_survey":
			template_prefilling({
				title: "{{nickname}}，溫度 VIP致謝", 
				body: "1分鐘填寫滿意度調查", 
				url: "https://hearty.me/{{username}}?link=www.surveycake.com/s/oVkmm?ssn0={{username}}", 
				tag: "hj-survey"
			});
		break;

		case "unpaid_order":
			template_prefilling({
				title: "{{nickname}}", 
				body: "小提醒：購買的 VIP尚未繳款唷", 
				url: "https://hearty.me/{{username}}?link=hearty.me/shop/bill?o=HJ_"+(new Date()).getFullYear()+(getUrlPara("order_id")||"1").padStart(6,"0"), 
				tag: "hj-order"
			});
		break;
	}
}
	function template_prefilling(d){
		let $p = $(".push_data");
			$p.find("[data-title]").val(d["title"]);
			$p.find("[data-body]").val(d["body"]);
			$p.find("[data-url]").val(d["url"]);
			$p.find("[data-tag] option").removeAttr("selected")
			.filter("[value='"+d["tag"]+"']").attr("selected", "");
	}

function empty_recipients(){
	$(".recipients").slideUp("fast", function(){
		$(this).empty().show();
	});
}
function filter_recipients(v){
	$(".recipients li[data-device="+v+"]").slideUp("fast", function(){
		$(this).remove();
	});
}
function filter_all(max_user_id){
	let $u = $(".user_data [data-uid_interval]");
	$u.filter(":eq(0)").val(1).attr({max: max_user_id});
	$u.filter(":eq(1)").val(max_user_id).attr({max: max_user_id});
}
function uid_toggle(mode, mode_text){
	$(".user_data tr").attr("data-off", "").filter(".uid_"+mode).removeAttr("data-off");
	alertify.success("<i class='fas fa-filter'></i> "+mode_text+"模式");
}

function dingdong(){
	let context = new window.AudioContext(), 
	playTone = (freq, startTime, duration) => {
	let oscillator = context.createOscillator(), 
		gainNode = context.createGain();

		oscillator.type = 'sine';
		oscillator.frequency.value = freq;

		gainNode.gain.setValueAtTime(0, startTime);
		gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05); // 漸入
		gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // 漸出

		oscillator.connect(gainNode);
		gainNode.connect(context.destination);

		oscillator.start(startTime);
		oscillator.stop(startTime + duration);
	};

	let now = context.currentTime;
	playTone(880, now, 0.4); // "叮" - 880Hz
	playTone(660, now + 0.4, 0.6); // "咚" - 660Hz
}
