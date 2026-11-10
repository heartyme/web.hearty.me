/* crm.push.js — 推播後台前端（對應 hood/push.php）

- 群發：send_push_bulk() → send_push_bulk_stream()：一次 POST 整批，讀 SSE 串流逐筆更新 UI
- 單筆：點擊名單中的裝置 → send_push()：確認後發送（測試用）
*/

"use strict";

const PUSH_DEVICES = ["iPhone", "iPad", "Android", "手機網頁", "電腦版"];

$(function(){
	get_sent_stats();

	window.onbeforeunload = function(){
		return false;
	};

	let $u = $(".notify .page_up"),
		u_shown = null;
	$(document).on("scroll", function(){
		let show = $(this).scrollTop()>200;
		if(show===u_shown) return;
		u_shown = show;
		$u.stop()[show ? "fadeIn" : "fadeOut"]("slow");
	});

	if(!!getUrlPara("order_id")) $("select[data-template]").val("unpaid_order").trigger("change");
});

function hj_update__push(d){
	return $.ajax({
		url: location.href,
		type: "POST",
		dataType: "json",
		data: d,
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
		num_asc = (a, b) => a-b,
		uid_selection = parseInt($("input[name='uid_selection']:checked").val() || 0),
		device = $("input[name='device']:checked").map(function(){return parseInt(this.value);}).get().sort(num_asc),
		uid_interval = $("input[data-uid_interval]").map(function(){return parseInt(this.value || 1);}).get().sort(num_asc),
		uid_listed = $("textarea[data-uid_listed]").val().split(",").map(function(u){return parseInt(u.trim())||1}).sort(num_asc);

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
			case 1: {
				let items = [];
				Object.values(r["Values"]).forEach(function(u){
					Object.values(u["tokens"]).forEach(function(t){
						let fcm_id = parseInt(t["fcm_id"]),
							sent_today = parseInt(t["sent_today"]);

						items.push($("<li>", {
							onclick: sent_today>0 ?
								"alertify.error('* 略過重複 #"+fcm_id+"')" :
								"send_push($(this));",
							title: u["username"]+" - "+PUSH_DEVICES[parseInt(t["device"])]+" # "+fcm_id,
							"data-username": u["username"],
							"data-nickname": u["nickname"],
							"data-fcm_id": fcm_id,
							"data-fcmtoken": t["fcmtoken"],
							"data-device": t["device"],
							"data-sent_today": sent_today
						}));
					});
				});

				$recipients.empty().append(items).slideDown("fast", function(){
					$(window).scrollTop($recipients.get(0)?.offsetTop-50);
				});
			break;
			}

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

// 讀取推播表單；標題或內文過短時提示並回傳 null
function get_push_template(){
	let $push = $(".push_data"),
		val = (k, def) => ($push.find("[data-"+k+"]").val() || def).trim(),
		template = {
			title: val("title", ""),
			body: val("body", ""),
			url: val("url", "https://hearty.me"),
			tag: val("tag", "hj-default")
		};

	if(template.title.length<2 || template.body.length<4){
		msg('<i class="far fa-exclamation-triangle"></i> 請填寫推播訊息'); return null;
	}
	return template;
}

// 將 li 的 data-* 轉為收件裝置資料
function get_push_recipient(li){
	let d = li.dataset;
	return {
		fcm_id: Number(d.fcm_id || 0),
		fcmtoken: (d.fcmtoken || "").trim(),
		device: Number(d.device || 0),
		username: (d.username || "").trim(),
		nickname: (d.nickname || "").trim()
	};
}

// 單筆發送（點擊名單中的裝置）
function send_push($btn){
	if(!$btn || !$btn.length) return false;

	let template = get_push_template();
	if(!template) return false;

	let push = Object.assign(get_push_recipient($btn.get(0)), template),
		fill = s => s.replace(/\{{username}}/g, push.username).replace(/\{{nickname}}/g, push.nickname);

	push.title = fill(push.title);
	push.body = fill(push.body);
	push.url = push.url.replace(/\{{username}}/g, push.username);

	alertify.set({labels: {ok: "取消", cancel: '<i class="fas fa-inbox-out"></i> 發送'}, buttonReverse: false});
	alertify.confirm('<i class="far fa-comment-lines"></i> 即將推播予：'+push.nickname+" ("+push.username+"，# "+numberWithCommas(push.fcm_id)+")", function(e){
		if(!e) send_push_exec(push, $btn);
	});
}
	function send_push_exec(push, $btn){
		hj_update__push({
			action: "send_push",
			push: JSON.stringify(push)
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					console.log(JSON.stringify(r));
				break;

				case 3:
					push_skipped_alert(push);
				break;

				default:
					// firebase.google.com/docs/reference/fcm/rest/v1/ErrorCode
					if(r["Values"]?.error?.code==404){
						revoke_fcmtoken(push);
					}
					else{
						alertify.error('<i class="far fa-exclamation-triangle"></i> 推播失敗<br>：'+JSON.stringify(r));
						console.error(JSON.stringify(r));
					}
				break;
			}

			$btn.remove();
			push_result_prepend(push, r["Status"]==1);
		}).fail(function(e){
			alertify.error('<i class="far fa-exclamation-triangle"></i> 異常：'+JSON.stringify(e));
			$btn.remove();
		});
	}

// 群發（一次只跑一組）
let bulk_running = false;

function send_push_bulk(){
	if(bulk_running){
		msg('<i class="fal fa-sync-alt"></i> 群發進行中，一次只能跑一組'); return;
	}

	let $d = $(".recipients li[data-sent_today='0']"),
		d = $d.length;

	if(d>0){
		alertify.set({labels: {ok: "取消", cancel: '<i class="fas fa-inbox-out"></i> 確定群發'}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-comments-alt"></i> 即將推播至 '+d+"台裝置", function(e){
			if(!e) send_push_bulk_stream($d);
		});
	}
	else{
		msg('<i class="far fa-exclamation-triangle"></i> 沒有可發送的裝置，請先行查詢');
	}
}
	// 一次 POST 整批 → 讀 SSE 串流逐筆更新
	async function send_push_bulk_stream($d){
		if(bulk_running) return; // 防止確認框連點

		let template = get_push_template();
		if(!template) return;

		let recipients = [],
			li_map = {},
			finished = false,
			err;
		$d.each(function(){
			recipients.push(get_push_recipient(this));
			li_map[this.dataset.fcmtoken] = this;
		});

		bulk_running = true;
		hj_loading(true);

		try{
			let response = await fetch(location.href, {
				method: "POST",
				body: new URLSearchParams({
					action: "send_push_bulk",
					template: JSON.stringify(template),
					recipients: JSON.stringify(recipients)
				}),
				credentials: "same-origin"
			});
			if(!response.ok || !response.body) throw new Error("HTTP "+response.status);

			let reader = response.body.getReader(),
				decoder = new TextDecoder(),
				buf = "";

			for(;;){
				let r = await reader.read();
				if(r.done) break;

				buf += decoder.decode(r.value, {stream: true});
				let frames = buf.split("\n\n");
				buf = frames.pop(); // 最後一段可能不完整，留待下次
				for(let frame of frames){
					if(handle_sse_frame(frame, li_map)) finished = true;
				}
			}
		}
		catch(e){
			err = e?.message || JSON.stringify(e);
		}

		bulk_running = false;
		hj_loading(false);
		if(!finished) alertify.error('<i class="far fa-exclamation-triangle"></i> 群發中斷'+(err ? "："+err : "，請重新查詢後再試"));
	}

	// 回傳 true 表示收到 done
	function handle_sse_frame(frame, li_map){
		let event_name = "message",
			data = "",
			payload;

		for(let line of frame.split("\n")){
			if(line.startsWith("event:")) event_name = line.slice(6).trim();
			else if(line.startsWith("data:")) data += line.slice(5).trim();
		}
		if(!data) return false;

		try{ payload = JSON.parse(data); } catch(e){ return false; }

		if(event_name==="done"){
			hj_loading(false);
			get_sent_stats();
			if($("input[name='done_dingdong']:checked").length) dingdong();
			msg('<i class="far fa-comments-alt"></i> 推播群發完畢 (已寄 '+numberWithCommas(payload.sent||0)+'，略過 '+numberWithCommas(payload.skipped||0)+'，失敗 '+numberWithCommas(payload.failed||0)+')', "好耶", function(){
				$(window).scrollTop(0);
			});
			return true;
		}

		// FCM 404 → revoke token
		if(payload.error_code===404) revoke_fcmtoken(payload);

		if(payload.status===3) push_skipped_alert(payload);
		else push_result_prepend(payload, payload.status===1);

		li_map[payload.fcmtoken]?.remove();
		return false;
	}

// 共用：略過提示、註銷 token、結果列表
function push_skipped_alert(p){
	alertify.error('<i class="fas fa-exclamation-triangle"></i> 略過重複：'+p.username+" (# "+numberWithCommas(p.fcm_id)+")");
}

function revoke_fcmtoken(p){
	hj_update__push({
		action: "revoke_fcmtoken",
		fcmtoken: p.fcmtoken
	}).then(function(r){
		if(r["Status"]==1){
			alertify.success('<i class="far fa-comment-alt-times"></i> token # '+numberWithCommas(p.fcm_id)+" 已註銷");
		}
		else{
			alertify.error('<i class="far fa-exclamation-circle"></i> token # '+numberWithCommas(p.fcm_id)+" 註銷失敗");
		}
	});
}

function push_result_prepend(p, success){
	let $res = $(".result");
	$res.children().slice(19).remove(); // 只留前 19個，減少 loading

	$("<ol>", {
		title: p.nickname,
		onclick: "$(this).fadeOut('fast');",
		"data-username": p.username,
		"data-success": +success,
		html: [
			$("<li>", {"data-device": p.device, text: p.username+" (#"+numberWithCommas(p.fcm_id)+")"}),
			$("<li>", {text: p.title}),
			$("<li>", {text: p.body}),
			$("<li>", {title: p.url, text: "🌐 "+p.url}),
			$("<li>", {title: p.tag, text: "🔖 "+p.tag})
		]
	}).prependTo($res).fadeIn();
}

function filter_finished(hide){
	$(".recipients").toggleClass("unfinished", !!hide);
}

// 推播模板（unpaid_order 的網址依當下年份與網址參數產生，故用 getter）
const PUSH_TEMPLATES = {
	"vip_7": {
		title: "哈囉{{nickname}}",
		body: "謝謝你填寫知心小調查，7日 VIP 已送達你的溫度日記嚕~",
		url: "https://hearty.me/{{username}}?a={{username}}&link=bitly.com/33GVqRW",
		// ALT: url: "https://hearty.me/{{username}}?link=hearty.me/account?wvtab=1",
		tag: "hj-billing"
	},
	"vip_7-en": {
		title: "Hi {{nickname}}",
		body: "Received a 7-day VIP credit for the survey",
		url: "https://hearty.me/{{username}}?a={{username}}&link=bitly.com/33GVqRW",
		// ALT: url: "https://hearty.me/{{username}}?link=hearty.me/account?wvtab=1",
		tag: "hj-billing"
	},
	"response": {
		title: "嗨{{nickname}}",
		body: "已透過 Email回覆您的客服，請看信箱，並確認垃圾信 ( ´･ヮ･)ﾉ",
		url: "https://hearty.me/{{username}}?link=hearty.me/wv?o=go.hearty.me/hj-gmail",
		tag: "hj-cs"
	},
	"response-en": {
		title: "Hi {{nickname}}",
		body: "Check email inbox for the reply ( ´･ヮ･)ﾉ",
		url: "https://hearty.me/{{username}}?link=hearty.me/wv?o=go.hearty.me/hj-gmail",
		tag: "hj-cs"
	},
	"post_public": {
		title: "{{nickname}}",
		body: "你的公開日記已公開 ~ ◍•ᴗ•◍",
		url: "https://hearty.me/{{username}}?link=hearty.me/feed",
		tag: "hj-cs"
	},
	"post_publish": {
		title: "{{nickname}}",
		body: "你的投稿日記已成功投稿，快到日記牆上看看吧！✧❛◡❛",
		url: "https://hearty.me/{{username}}?link=hearty.me/feed",
		tag: "hj-cs"
	},
	"post_unqualified": {
		title: "系統提醒",
		body: "您的投稿日記遭檢舉，請遵守《投稿日記規範》呦 (;´ㅁ`)=3",
		url: "https://hearty.me/{{username}}",
		tag: "hj-cs"
	},
	"faq_penpal": {
		title: "{{nickname}}",
		body: "如何與筆友交換日記 (FAQ)",
		url: "https://hearty.me/{{username}}?link=faq.hearty.me/tutorial/penpal_diaries",
		tag: "hj-cs"
	},
	"buyer_survey": {
		title: "{{nickname}}，溫度 VIP致謝",
		body: "1分鐘填寫滿意度調查",
		url: "https://hearty.me/{{username}}?link=www.surveycake.com/s/oVkmm?ssn0={{username}}",
		tag: "hj-survey"
	},
	get "unpaid_order"(){
		return {
			title: "{{nickname}}",
			body: "小提醒：購買的 VIP尚未繳款唷",
			url: "https://hearty.me/{{username}}?link=hearty.me/shop/bill?o=HJ_"+(new Date()).getFullYear()+(getUrlPara("order_id")||"1").padStart(6,"0"),
			tag: "hj-order"
		};
	}
};

function template_prefill(n){
	if(n==="greeting"){
		$.ajax({
			url: "//hearty.me/home",
			type: "POST",
			dataType: "json",
			data: {
				action: "greeting",
				greeting_id: 0
			}
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
	}
	else if(Object.hasOwn(PUSH_TEMPLATES, n)){
		template_prefilling(PUSH_TEMPLATES[n]);
	}
}
	function template_prefilling(d){
		let $p = $(".push_data");
		$p.find("[data-title]").val(d["title"]);
		$p.find("[data-body]").val(d["body"]);
		$p.find("[data-url]").val(d["url"]);
		$p.find("[data-tag]").val(d["tag"]);
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
	$u.eq(0).val(1).attr({max: max_user_id});
	$u.eq(1).val(max_user_id).attr({max: max_user_id});
}
function uid_toggle(mode, mode_text){
	$(".user_data tr").attr("data-off", "").filter(".uid_"+mode).removeAttr("data-off");
	alertify.success("<i class='fas fa-filter'></i> "+mode_text+"模式");
}

function dingdong(){
	let context = new window.AudioContext(),
		now = context.currentTime,
		playTone = (freq, startTime, duration) => {
			let oscillator = context.createOscillator(),
				gainNode = context.createGain();

			oscillator.type = "sine";
			oscillator.frequency.value = freq;

			gainNode.gain.setValueAtTime(0, startTime);
			gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05); // 漸入
			gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // 漸出

			oscillator.connect(gainNode);
			gainNode.connect(context.destination);

			oscillator.start(startTime);
			oscillator.stop(startTime + duration);
			return oscillator;
		};

	playTone(880, now, 0.4); // "叮" - 880Hz
	playTone(660, now + 0.4, 0.6).onended = () => context.close(); // "咚" - 660Hz；播畢釋放音訊資源
}
