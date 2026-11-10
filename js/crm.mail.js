/* crm.mail.js — Email 電子報後台前端（對應 hood/mail.php）

- 群發：send_mail_bulk() → send_mail_bulk_stream()：一次 POST 整批 user_id，讀 SSE 串流逐筆更新 UI
	handle_sse_frame()：start / 逐筆 (status 1 成功、0 失敗、3 略過) / done；Google Forms log 由後端寫入
- 單筆：點擊名單中的用戶 → send_mail()：確認後寄送（前端寫 Google Forms log）
- mail_template()：讀取表單模板；mail_render()：個人化變數替換（同後端 strtr，單筆寄送與串流預覽共用）
*/

"use strict";

const MAIL_DOMAIN = "notify.heartymail.com",
	ICON_WARN = '<i class="far fa-exclamation-triangle"></i> ';

let bulk_running = false;

$(function(){
	get_menu_templates();
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
});

function hj_preview(on, html){
	let $p = $(".hj_preview");
	if(html!=null) $p.find("iframe").attr("srcdoc", html);
	if(on) $p.slideDown("fast");
	else $p.fadeOut("fast");
}

function get_templates(){
	return $.getJSON("templates.json?v="+new Date().toISOString().slice(0,13).replace("T","-"));
}
	function get_template(k){
		get_templates().then(function(d){
			if(!d || !(k in d)) return;
			d = d[k];

			let $push = $(".push_data");
			$push.find("[data-sender]").val(d["sender"]["name"]);
			$push.find("[data-subject]").val(d["subject"]);
			$push.find("[data-body]").val(d["body"]);
			$push.find("[data-tag]").val(d["tag"]);
			$("select[name='list']").val(d["list"]);
		});
	}
	function get_menu_templates(){
		get_templates().then(function(d){
			let $l = $("select[data-templates]");
			$l.html( $("<option>", {selected: ""}).text("無"));

			for(let k in d){
				$("<option>", {
					value: k,
					text: d[k]["name"],
					disabled: parseInt(d[k]["format"])>0
				}).appendTo($l);
			}
		});
	}
	function save_template(t){
		$("<a>", {
			href: "data:"+(t||"text/plain")+";charset=utf-8,"+encodeURIComponent(tinymce.activeEditor.getContent()||""),
			download: "信件模板_"+new Date().toLocaleDateString("sv")+".html"
		})[0].click();
		alertify.success('<i class="fas fa-arrow-to-bottom"></i> 開始下載');
	}

function editor_init(){
	$(".push_data textarea[data-body]").tinymce({
		base_url: "https://cdn.jsdelivr.net/npm/tinymce@5.10.9",
		placeholder: "Email 內文",
		statusbar: false,
		branding: false,
		save_enablewhendirty: false,
		skin: "oxide"+(window.matchMedia("(prefers-color-scheme: dark)").matches ? "-dark" : ""),
		relative_urls : false,
		remove_script_host : false,
		height: 300,
		menubar: false,
		image_caption: true,
		plugins: "autolink preview directionality code visualblocks visualchars fullscreen image link template codesample table charmap toc advlist wordcount imagetools textpattern noneditable emoticons paste save",
		toolbar: "code preview fullscreen | undo redo | formatselect bold underline alignjustify aligncenter alignright | forecolor backcolor removeformat | table image link emoticons | fontsizeselect save",
		toolbar_drawer: "sliding",
		link_list: [
			{title: "溫度日記 首頁", value: "https://o.hearty.me"},
			{title: "溫度日記 用戶頁", value: "https://o.hearty.me/{{username}}"}
		],
		image_list: [
			{title: "溫度日記 Logo", value: "https://i.hearty.app/i/mailheader.png?o=1"},
			{title: "溫度日記 Sheara", value: "https://i.hearty.app/e/sheara.640.jpg?o=1"}
		],
		color_map: [
			"ffffff", "潔白",
			"ffd1a4", "皮膚",
			"ffdcdc", "淡粉",
			"ffbdbd", "淺粉",
			"f16d6e", "深紅",
			"d78b7b", "卡其",
			"d28064", "卡其",
			"b4b4b4", "淺灰",
			"444444", "深灰",
			"000000", "純黑"
		],
		contextmenu: "link",
		language: "zh_TW",
		language_url: "//cdn.jsdelivr.net/npm/tinymce-all-in-one@4.9.5/langs/zh_TW.min.js",
		default_link_target: "_blank",
		link_default_protocol: "https",

		// paste
		paste_retain_style_properties: "all",
		paste_word_valid_elements: "*[*]",
		paste_convert_word_fake_lists: false,
		paste_webkit_styles: "all",
		paste_merge_formats: true,
		paste_data_images: true,
		automatic_uploads: true,
		images_upload_url: "../api/mail.img.php",
		images_upload_credentials: true,
		save_onsavecallback: function(){
			save_template();
		}
		/*
		file_picker_types: "image",
		file_picker_callback: function(cb,value,meta){
			let $i = $("<input>", {
				type: "file",
				accept: "image/*"
			}).on("change", function(){
				let file = this.files[0],
					reader = new FileReader();
				reader.onload = function(){
					let id = 'blobid'+(new Date()).getTime(),
						blobCache = tinymce.activeEditor.editorUpload.blobCache,
						base64 = reader.result.split(',')[1],
						blobInfo = blobCache.create(id, file, base64);
					blobCache.add(blobInfo);
					cb(blobInfo.blobUri(), {title: file.name});
				};
				reader.readAsDataURL(file);
			}).trigger("click");
		}
		*/
	});
}

function richformat(){
	editor_init();
	$("[data-sender_domain]").val(MAIL_DOMAIN).find("[data-plaintext]").prop("disabled", true);
	$("select[data-templates] option").prop("disabled", false);
}

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
		$("[data-sent_stats]").text(r["date"]+" 午夜起，已寄給 "+numberWithCommas(r["users_sent"]||0)+"人");
	});
}

function get_recipients(){
	let $recipients = $(".recipients"),
		uid_selection = parseInt($("input[name='uid_selection']:checked").val() || 0),
		uid_interval = $("input[data-uid_interval]").map(function(){return parseInt(this.value || 1);}).get().sort((a, b) => a-b),
		uid_listed = $("textarea[data-uid_listed]").val().split(",").map(u => parseInt(u.trim()) || 1).sort((a, b) => a-b);

	$recipients.slideUp("fast");
	$(".recipient_data .result").empty();

	if(uid_interval[1]-uid_interval[0]>100000){
		msg(ICON_WARN+"考量查詢量能，避免一次選擇超過 10萬位用戶"); return;
	}

	hj_loading(true);
	hj_update__push({
		action: "get_recipients",
		uid_interval: uid_selection==0 ? JSON.stringify(uid_interval) : "",
		uid_listed: uid_selection==1 ? JSON.stringify(uid_listed) : "",
		email_verified: +!$("input[name='email_unverified']").is(":checked"),
		list: $("select[name='list']").val()||0,
		list_optin: $("input[name='list_optin']:checked").val()||0,

		// 進階條件
		lang: $("input[name='lang']:checked").val()||"",
		birthmonth: $("input[name='birthmonth']:checked").length,
		is_vip: $("input[name='is_vip']:checked").val()||0
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				$recipients.html(
					r["Values"].map(function(u){
						let sent_today = parseInt(u["sent_today"]),
							email_verified = parseInt(u["email_verified"]);
						return $("<li>", {
							onclick: sent_today>0 ?
								"alertify.error('* 略過寄送 '+htmlspecialchars(this.dataset.username))" :
								"send_mail(false,$(this))",
							title: "✉️ "+u["nickname"]+" ("+u["username"]+") "+(email_verified>0 ? "✔" : ""),
							"data-user_id": u["user_id"],
							"data-username": u["username"],
							"data-nickname": u["nickname"],
							"data-email": u["email"],
							"data-email_verified": email_verified,
							"data-sent_today": sent_today
						});
					})
				).slideDown("fast", function(){
					$(window).scrollTop($recipients[0].offsetTop-50);
				});
			break;

			case 2:
				$recipients.show();
				msg(ICON_WARN+"有資料漏填");
			break;

			default:
				msg();
			break;
		}
	}).fail(function(e){
		msg(ICON_WARN+"喔不，<br>"+JSON.stringify(e));
	}).always(function(){
		hj_loading(false);
	});
}

// 讀取表單上的信件模板；內容不足時提示並回傳 null
function mail_template(){
	let $push = $(".push_data"),
		editor = window.tinymce?.activeEditor,
		t = {
			name: ($push.find("[data-sender]").val() || "Hearty Journal 溫度日記").trim(),
			domain: $push.find("[data-sender_domain]").val() || MAIL_DOMAIN,
			list: $("select[name='list']").val() || 0,
			subject: ($push.find("[data-subject]").val() || "").trim(),
			body: (editor ? editor.getContent() : ($push.find("[data-body]").val() || "")).trim(),
			tag: $push.find("[data-tag]").val() || "",
			richformat: +$push.find("input[name='format']").prop("checked") || 0
		};

	if(t.subject.length<4 || t.body.length<6){
		msg(ICON_WARN+"沒有填寫信件內容");
		return null;
	}
	return t;
}

// 個人化變數 (同 hood/mail.php send_mail_bulk 的 $render：strtr 單輪替換，內文的 {{subject}} 為替換後的主旨)
function mail_render(c, u){
	let re = /\{\{(user_id|username|nickname|email|month|subject)\}\}/g,
		vars = {
			user_id: u["user_id"],
			username: u["username"],
			nickname: u["nickname"],
			email: u["email"],
			month: new Date().getMonth()+1
		},
		fill = (m, k) => k in vars ? String(vars[k]) : m,
		subject = c["subject"].replace(re, fill);

	vars.subject = subject;
	return {subject: subject, body: c["body"].replace(re, fill)};
}

// 寄送紀錄 (只留最新 20筆，減少 loading)
function result_prepend(username, nickname, success, subject, body){
	let $res = $(".result");
	$res.children().slice(19).remove();

	$("<ol>", {
		title: nickname,
		onclick: "hj_preview(true,$(this).data('html'))",
		"data-username": username,
		"data-success": +success,
		html: $("<li>", {"data-device": ""}).text(username)
				.add($("<li>", {text: subject}))
				.add($("<li>", {html: body}))
	}).data({
		html: body
	}).prependTo($res).fadeIn();
}

function bulk_done(text){
	get_sent_stats();
	if($("input[name='done_dingdong']:checked").length) dingdong();

	msg('<i class="fal fa-envelope-open"></i> '+text, "好耶", function(){
		$(window).scrollTop(0);
	});
}

function send_mail(bulk, $btn){
	bulk = bulk || false;
	$btn = $btn==null ? $(".recipients li[data-sent_today='0']:first") : $btn;
	if(!$btn.length) return false;

	let t = mail_template();
	if(!t) return false;

	let d = $btn[0].dataset,
		user_id = (d["user_id"] || "").trim(),
		username = (d["username"] || "").trim(),
		nickname = (d["nickname"] || username).trim(),
		email = (d["email"] || "").trim(),
		rendered = mail_render(t, {
			user_id: user_id,
			username: username,
			nickname: nickname,
			email: email
		}),
		mail = {
			sender: {
				name: t.name,
				email: username+"@"+t.domain,
				domain: t.domain,
				list: t.list
			},
			recipient: {
				name: nickname,
				email: email,
				nickname: nickname,
				username: username
			},
			content: {
				subject: rendered["subject"],
				body: rendered["body"],
				tag: t.tag,
				richformat: t.richformat
			}
		};

	if(bulk){
		send_mail_exec(mail, bulk, $btn);
	}
	else{
		alertify.set({labels: {ok: "取消", cancel: '<i class="fas fa-inbox-out"></i> 寄信'}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-envelope-open-text"></i> 即將寄信給：'+nickname+" ("+username+")", function(e){
			if(!e) send_mail_exec(mail, bulk, $btn);
		});
	}
}
	function send_mail_exec(mail, bulk, $btn){
		let username = mail["recipient"]["username"],
			nickname = mail["recipient"]["nickname"];

		hj_update__push({
			action: "send_mail",
			mail: JSON.stringify(mail)
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					// forms.gle/qjsc34FeVJkwXPq66
					send_mail_log(mail, "1FAIpQLSdn8CZP3i0xD5jL2SQ8Zj6d8h7yk9V-ReRKho54mPRuRX_g0g");
					console.log(JSON.stringify(r));
				break;

				case 3:
					// forms.gle/n6EAW6CUPEgyQPmo8
					send_mail_log(mail, "1FAIpQLSd1ktd9NEKxFAJBb8bG2HJwaOcs4VT6L0xUWEg7XGYmMMiW0A");
					alertify.error(ICON_WARN+"略過重複寄發："+nickname+" ("+username+")");
				break;

				default:
					alertify.error(ICON_WARN+"發信失敗：<br><b>"+username.slice(0,20)+"</b>");
					console.error(r["Values"]);
				break;
			}

			if(bulk && !$btn.next().length) bulk_done("批次群發完成");
			$btn.remove();

			result_prepend(username, nickname, r["Status"]==1, mail["content"]["subject"], mail["content"]["body"]);
		}).fail(function(e){
			e = JSON.stringify(e);
			console.error(e);
			alertify.error(ICON_WARN+"糟了，<br>"+e.slice(0,20));
		});
	}

	function send_mail_bulk(){
		if(bulk_running){
			msg('<i class="fal fa-sync-alt"></i> 排程進行中，一次只能跑一組排程'); return;
		}

		let $d = $(".recipients li[data-sent_today='0']"),
			d = $d.length;
		if(d>0){
			alertify.set({labels: {ok: "取消", cancel: '<i class="fas fa-inbox-out"></i> 確定群發'}, buttonReverse: false});
			alertify.confirm('<i class="fal fa-envelope-open-text"></i> 即將寄送至 '+d+"組 Emails", function(e){
				if(!e) send_mail_bulk_stream($d);
			});
		}
		else{
			msg(ICON_WARN+"沒有可發信的 Email，請先行查詢");
		}
	}

	// 一次 POST 整批 → 讀 SSE 串流逐筆更新
	async function send_mail_bulk_stream($d){
		let t = mail_template();
		if(!t) return;

		let template = {
				sender: {domain: t.domain, list: t.list},
				content: {subject: t.subject, body: t.body, tag: t.tag}
			},
			user_ids = [],
			li_map = {},
			finished = false,
			err;

		$d.each(function(){
			user_ids.push(Number(this.dataset.user_id || 0));
			li_map[this.dataset.user_id] = this;
		});

		bulk_running = true;
		hj_loading(true);

		try{
			let response = await fetch(location.href, {
				method: "POST",
				body: new URLSearchParams({
					action: "send_mail_bulk",
					template: JSON.stringify(template),
					user_ids: JSON.stringify(user_ids)
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
				let sep;
				while((sep = buf.indexOf("\n\n"))>=0){
					let frame = buf.slice(0, sep);
					buf = buf.slice(sep+2);
					if(handle_sse_frame(frame, li_map, template.content)) finished = true;
				}
			}
		}
		catch(e){
			err = e?.message || JSON.stringify(e);
		}

		bulk_running = false;
		hj_loading(false);
		if(!finished) alertify.error(ICON_WARN+"群發中斷"+(err ? "："+err : "，請重新查詢後再試"));
	}

	// 回傳 true 表示收到 done
	function handle_sse_frame(frame, li_map, content){
		let event_name = "message",
			data = "",
			p;

		for(let line of frame.split("\n")){
			if(line.startsWith("event:")) event_name = line.slice(6).trim();
			else if(line.startsWith("data:")) data += line.slice(5).trim();
		}
		if(!data) return false;

		try{ p = JSON.parse(data); } catch(e){ return false; }

		switch(event_name){
			case "start":
				alertify.success('<i class="fal fa-paper-plane"></i> 開始寄送 '+numberWithCommas(p.sendable||0)+" 封 (略過 "+numberWithCommas(p.skipped||0)+"，每秒 "+(p.rate||0)+" 封)");
			return false;

			case "done":
				hj_loading(false);
				bulk_running = false;
				bulk_done("批次群發完成 (已寄 "+numberWithCommas(p.sent||0)+"，略過 "+numberWithCommas(p.skipped||0)+"，失敗 "+numberWithCommas(p.failed||0)+")");
			return true;
		}

		if(p.status===3){
			alertify.error(ICON_WARN+"略過重複寄發："+p.nickname+" ("+p.username+")");
		}
		else{
			if(p.status!==1){
				alertify.error(ICON_WARN+"發信失敗：<br><b>"+(p.username||"").slice(0,20)+"</b>");
				console.error(p.error);
			}

			let rendered = mail_render(content, p);
			result_prepend(p.username, p.nickname, p.status===1, rendered["subject"], rendered["body"]);
		}

		li_map[p.user_id]?.remove();
		return false;
	}

	function send_mail_log(mail, uri){
		gform_post(uri, {
			"emailAddress": mail["recipient"]["email"] || "guest@hearty.me",
			"entry.1244275016": mail["recipient"]["username"] || "n/a",
			"entry.912693507": mail["recipient"]["nickname"] || "n/a",
			"entry.1367122498": mail["content"]["tag"] || "n/a",
			"entry.2026927390": mail["content"]["subject"] || "n/a",
			"entry.1350707169": mail["content"]["body"] || "n/a",
			"entry.50475957": mail["sender"]["domain"] || "n/a",
			// "entry.list": mail["sender"]["list"] || "n/a",
			"entry.605239846": new Date(Date.now()+288e5).toISOString().slice(0,10)
		});
	}
	function filter_finished(hide){
		$(".recipients").toggleClass("unfinished", !!hide);
	}

function empty_recipients(){
	$(".recipients").slideUp("fast", function(){
		$(this).empty().show();
	});
}
function filter_recipients(v){
	$(".recipients li[data-email_verified="+v+"]").slideUp("fast", function(){
		$(this).remove();
	});
}
function filter_all(max_user_id){
	let $u = $(".user_data [data-uid_interval]");
	$u.eq(0).val(1).attr({max: max_user_id});
	$u.eq(1).val(max_user_id).attr({max: max_user_id});
}
function uid_toggle(mode, mode_text){
	let mode_another = mode=="listed" ? "interval" : "listed";

	$(".user_data tr").removeAttr("data-off").filter(".uid_"+mode_another).attr("data-off", "");
	alertify.success('<i class="fas fa-filter"></i> '+mode_text+"模式");
}

// 完成提醒：叮 (880Hz) 咚 (660Hz)，播完釋放 AudioContext
function dingdong(){
	let context = new window.AudioContext(),
		now = context.currentTime,
		tone = (freq, start, duration) => {
			let osc = context.createOscillator(),
				gain = context.createGain();

			osc.type = "sine";
			osc.frequency.value = freq;

			gain.gain.setValueAtTime(0, start);
			gain.gain.linearRampToValueAtTime(0.2, start+0.05); // 漸入
			gain.gain.linearRampToValueAtTime(0, start+duration); // 漸出

			osc.connect(gain);
			gain.connect(context.destination);

			osc.start(start);
			osc.stop(start+duration);
			return osc;
		};

	tone(880, now, 0.4);
	tone(660, now+0.4, 0.6).onended = () => context.close();
}
