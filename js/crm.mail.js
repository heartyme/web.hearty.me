/* crm.mail.js — Email 群發改 SSE
對應 hood/mail.php 的 send_mail_bulk action。將原本「setInterval 每 2秒寄一封」
改為「一次 POST 整批 user_id → 讀 SSE 串流逐筆更新 UI」。
- send_mail_bulk_stream()：蒐集模板 + user_ids，fetch POST 後串流解析
- handle_sse_frame()：start / 逐筆 (status 1 成功、0 失敗、3 略過) / done
- mail_render()：變數替換，單筆寄送與串流預覽共用
- Google Forms log 改由後端寫入；單筆點擊寄送 send_mail() 維持原樣
*/

"use strict";

$(function(){
	get_menu_templates();
	get_sent_stats();

	window.onbeforeunload = function(){
		return false;
	};

	$(document).on("scroll", function(){
		let $u = $(".notify .page_up");
		if($(this).scrollTop()>200) $u.stop().fadeIn("slow");
		else $u.stop().fadeOut("slow");
	});
});

function hj_preview(on, html){
	let $p = $(".hj_preview");
	if(!(html==null)) $p.find("iframe").attr("srcdoc", html);
	if(on) $p.slideDown("fast");
	else $p.fadeOut("fast");
}

function get_templates(k){
	return $.getJSON("templates.json?"+"v="+new Date().toISOString().slice(0,13).replace("T","-"), function(d){
		return (k==null) ? d : (k in d ? d[k] : false);
	});
}
	function get_template(k){
		get_templates(k).then(function(d){
			if(!!d && k in d){
				d = d[k];

				let $push = $(".push_data");
				$push.find("[data-sender]").val(d["sender"]["name"]);
				$push.find("[data-subject]").val(d["subject"]);
				$push.find("[data-body]").val(d["body"]);
				$push.find("[data-tag]").val(d["tag"]);
				$("select[name='list']").val(d["list"]);
			}
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
		}).get(0)?.click();
		alertify.success('<i class="fas fa-arrow-to-bottom"></i> 開始下載');
	}

function editor_init(){
	$(".push_data textarea[data-body]").tinymce({
		base_url: "https://cdn.jsdelivr.net/npm/tinymce@5.10.9", 
		placeholder: "Email 內文", 
		statusbar: false, 
		branding: false, 
		save_enablewhendirty: false, 
		skin: "oxide"+(window.matchMedia("(prefers-color-scheme: dark)").matches?"-dark":""), 
		relative_urls : false, 
		remove_script_host : false, 
		height: 300, 
		menubar: false, 
		image_caption: true, 
		plugins: "autolink preview directionality code visualblocks visualchars fullscreen image link template codesample table charmap toc advlist wordcount imagetools textpattern noneditable charmap emoticons table paste save", 
		toolbar: "code preview fullscreen | undo redo | formatselect bold underline alignjustify aligncenter alignright | forecolor backcolor removeformatk | table image link emoticons | fontsizeselect save", 
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
	$("[data-sender_domain]").val("notify.heartymail.com").find("[data-plaintext]").prop("disabled", true);
	$("select[data-templates] option").prop("disabled", false);
}

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
		$("[data-sent_stats]").text(r["date"]+" 午夜起，已寄給 "+numberWithCommas(r["users_sent"]||0)+"人");
	});
}

function get_recipients(){
	let $recipients = $(".recipients"), 
		uid_selection = parseInt($("input[name='uid_selection']:checked").val() || 0), 
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
					$(window).scrollTop($recipients.get(0)?.offsetTop-50);
				});
			break;

			case 2:
				$recipients.show();
				msg('<i class="far fa-exclamation-triangle"></i> 有資料漏填');
			break;

			default:
				msg();
			break;
		}
	}).fail(function(e){
		msg('<i class="far fa-exclamation-triangle"></i> 喔不，<br>'+JSON.stringify(e));
	}).always(function(){
		hj_loading(false);
	});
}

function send_mail(bulk, $btn){
	bulk = bulk || false;
	$btn = $btn==null ? $(".recipients li[data-sent_today='0']:first") : $btn;
	if(!$btn.length) return false;

	let d = $btn.get(0)?.dataset, 
		$push = $(".push_data"), 
		user_id = (d["user_id"] || "").trim(), 
		username = (d["username"] || "").trim(), 
		nickname = (d["nickname"] || username || "").trim(), 
		email = (d["email"] || "").trim(),
		domain = $push.find("[data-sender_domain]").val() || "notify.heartymail.com",
		mail = {
			sender: {
				name: ($push.find("[data-sender]").val() || "Hearty Journal 溫度日記").trim(), 
				email: username+"@"+domain, 
				domain: domain, 
				list: $("select[name='list']").val()||0
			}, 
			recipient: {
				name: nickname, 
				email: email, 
				nickname: nickname, 
				username: username
			}, 
			content: {
				subject: ($push.find("[data-subject]").val() || "").trim(), 
				body: ((!!window.tinymce && !!tinymce.activeEditor) ? tinymce.activeEditor.getContent() : ($push.find("[data-body]").val()||"")).trim(), 
				tag: ($push.find("[data-tag]").val()||""), 
				richformat: +$push.find("input[name='format']").prop("checked") || 0
			}
		}, 
		c = mail["content"];

	if(c["subject"].length<4 || c["body"].length<6){
		msg('<i class="far fa-exclamation-triangle"></i> 沒有填寫信件內容');
		return false;
	}

	let rendered = mail_render(c, {
		user_id: user_id,
		username: username,
		nickname: nickname,
		email: email
	});
	mail["content"]["subject"] = rendered["subject"];
	mail["content"]["body"] = rendered["body"];

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
	// 個人化變數 (同 hood/mail.php send_mail_bulk 的 $render)
	function mail_render(c, u){
		let month = new Date().getMonth()+1,
			subject = c["subject"]
				.replace(/\{{user_id}}/g, u["user_id"])
				.replace(/\{{username}}/g, u["username"])
				.replace(/\{{nickname}}/g, u["nickname"])
				.replace(/\{{email}}/g, u["email"])
				.replace(/\{{month}}/g, month),
			body = c["body"]
				.replace(/\{{subject}}/g, c["subject"])
				.replace(/\{{user_id}}/g, u["user_id"])
				.replace(/\{{username}}/g, u["username"])
				.replace(/\{{nickname}}/g, u["nickname"])
				.replace(/\{{email}}/g, u["email"])
				.replace(/\{{month}}/g, month);
		return {subject: subject, body: body};
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
					send_mail_log(
						mail, 
						"1FAIpQLSdn8CZP3i0xD5jL2SQ8Zj6d8h7yk9V-ReRKho54mPRuRX_g0g"
					);

					console.log(JSON.stringify(r));
				break;

				case 3:
					// forms.gle/n6EAW6CUPEgyQPmo8
					send_mail_log(
						mail, 
						"1FAIpQLSd1ktd9NEKxFAJBb8bG2HJwaOcs4VT6L0xUWEg7XGYmMMiW0A"
					);

					alertify.error('<i class="far fa-exclamation-triangle"></i> 略過重複寄發：'+nickname+" ("+username+")");
				break;

				default:
					alertify.error('<i class="far fa-exclamation-triangle"></i> 發信失敗：<br><b>'+username.substr(0,20)+"</b>");
					console.error(r["Values"]);
				break;
			}

			/* ### debug
			if(bulk){
				if($btn.next().length>0){
					send_mail(bulk, $btn.next());
				}
				else{
					get_sent_stats();
					msg('<i class="fal fa-envelope-open"></i> 批次群發完成', "好耶", function(){
						
						$(window).scrollTop(0);
					});
				}
			}
			*/

			if(bulk && $btn.next().length==0){
				get_sent_stats();
				
				// 完成提醒
				if($("input[name='done_dingdong']:checked").length) dingdong();

				msg('<i class="fal fa-envelope-open"></i> 批次群發完成', "好耶", function(){
					$(window).scrollTop(0);
				});
			}
			$btn.remove();

			let $res = $(".result");
			$res.children().slice(19).remove(); // 只留前 19個，減少 loading

			$("<ol>", {
				title: nickname, 
				onclick: "hj_preview(true,$(this).data('html'))", 
				"data-username": username, 
				"data-success": +(r["Status"]==1), 
				html: $("<li>", {"data-device": ""}).text(username)
						.add($("<li>", {text: mail["content"]["subject"]}))
						.add($("<li>", {html: mail["content"]["body"]}))
			}).data({
				html: mail["content"]["body"]
			}).prependTo($res).fadeIn();
		}).fail(function(e){
			e = JSON.stringify(e);
			console.error(e);
			alertify.error('<i class="far fa-exclamation-triangle"></i> 糟了，<br>'+e.substr(0,20));
		});
	}

	function send_mail_bulk(){
		if(!!window.send_bulk){
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
			msg('<i class="far fa-exclamation-triangle"></i> 沒有可發信的 Email，請先行查詢');
		}
	}

	// 一次 POST 整批 → 讀 SSE 串流逐筆更新 (ref: crm.push2.js)
	function send_mail_bulk_stream($d){
		let $push = $(".push_data"),
			template = {
				sender: {
					domain: $push.find("[data-sender_domain]").val() || "notify.heartymail.com",
					list: $("select[name='list']").val()||0
				},
				content: {
					subject: ($push.find("[data-subject]").val() || "").trim(),
					body: ((!!window.tinymce && !!tinymce.activeEditor) ? tinymce.activeEditor.getContent() : ($push.find("[data-body]").val()||"")).trim(),
					tag: ($push.find("[data-tag]").val()||"")
				}
			};

		if(template.content.subject.length<4 || template.content.body.length<6){
			msg('<i class="far fa-exclamation-triangle"></i> 沒有填寫信件內容'); return;
		}

		let user_ids = $d.map(function(){
			return Number(this.dataset.user_id || 0);
		}).get();

		let li_map = {};
		$d.each(function(){ li_map[this.dataset.user_id] = this; });

		window.send_bulk = true;
		hj_loading(true);

		let body = "action=send_mail_bulk"
			+"&template="+encodeURIComponent(JSON.stringify(template))
			+"&user_ids="+encodeURIComponent(JSON.stringify(user_ids)),
			finished = false;

		function stream_end(err){
			window.send_bulk = null;
			hj_loading(false);
			if(!finished) alertify.error('<i class="far fa-exclamation-triangle"></i> 群發中斷'+(err ? "："+err : "，請重新查詢後再試"));
		}

		fetch(location.href, {
			method: "POST",
			headers: {"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
			body: body,
			credentials: "same-origin"
		}).then(function(response){
			if(!response.ok || !response.body) throw new Error("HTTP "+response.status);
			let reader = response.body.getReader(),
				decoder = new TextDecoder("utf-8"),
				buf = "";

			function pump(){
				return reader.read().then(function(r){
					if(r.done){ stream_end(); return; }
					buf += decoder.decode(r.value, {stream: true});
					let sep;
					while((sep = buf.indexOf("\n\n")) >= 0){
						let frame = buf.slice(0, sep);
						buf = buf.slice(sep+2);
						if(handle_sse_frame(frame, li_map, template.content)) finished = true;
					}
					return pump();
				});
			}
			return pump();
		}).catch(function(e){
			stream_end(e && e.message || JSON.stringify(e));
		});
	}

	// 回傳 true 表示收到 done
	function handle_sse_frame(frame, li_map, content){
		let event_name = "message", data = "";
		frame.split("\n").forEach(function(line){
			if(line.indexOf("event:")===0) event_name = line.slice(6).trim();
			else if(line.indexOf("data:")===0) data += line.slice(5).trim();
		});
		if(!data) return false;

		let payload;
		try{ payload = JSON.parse(data); } catch(e){ return false; }

		if(event_name==="start"){
			alertify.success('<i class="fal fa-paper-plane"></i> 開始寄送 '+numberWithCommas(payload.sendable||0)+' 封 (略過 '+numberWithCommas(payload.skipped||0)+'，每秒 '+(payload.rate||0)+' 封)');
			return false;
		}

		if(event_name==="done"){
			hj_loading(false);
			window.send_bulk = null;
			get_sent_stats();
			if($("input[name='done_dingdong']:checked").length) dingdong();
			msg('<i class="fal fa-envelope-open"></i> 批次群發完成 (已寄 '+numberWithCommas(payload.sent||0)+'，略過 '+numberWithCommas(payload.skipped||0)+'，失敗 '+numberWithCommas(payload.failed||0)+')', "好耶", function(){
				$(window).scrollTop(0);
			});
			return true;
		}

		let li = li_map[payload.user_id];

		if(payload.status===3){
			alertify.error('<i class="far fa-exclamation-triangle"></i> 略過重複寄發：'+payload.nickname+" ("+payload.username+")");
		}
		else{
			if(payload.status!==1){
				alertify.error('<i class="far fa-exclamation-triangle"></i> 發信失敗：<br><b>'+(payload.username||"").substr(0,20)+"</b>");
				console.error(payload.error);
			}

			let rendered = mail_render(content, payload),
				$res = $(".result");
			$res.children().slice(19).remove(); // 只留前 19個，減少 loading

			$("<ol>", {
				title: payload.nickname,
				onclick: "hj_preview(true,$(this).data('html'))",
				"data-username": payload.username,
				"data-success": +(payload.status===1),
				html: $("<li>", {"data-device": ""}).text(payload.username)
						.add($("<li>", {text: rendered["subject"]}))
						.add($("<li>", {html: rendered["body"]}))
			}).data({
				html: rendered["body"]
			}).prependTo($res).fadeIn();
		}

		if(li) li.remove();
		return false;
	}
/*
	function send_mail_bulk__legacy(){
		let $d = $(".recipients li[data-sent_today='0']"), 
			d = $d.length;
		if(d>0){
			alertify.set({labels: {ok: "取消", cancel: "<i class='fas fa-inbox-out'></i> 確定群發"}, buttonReverse: false});
			alertify.confirm("<i class='fal fa-envelope-open-text'></i> 即將寄送至 "+d+"組 Emails", function(e){
				if(!e){
					// ref: stackoverflow.com/a/3672400
					send_mail(true, $d.odd().attr({"data-bulk": "odd"}).eq(0) );
					send_mail(true, $d.even().attr({"data-bulk": "even"}).eq(0) );
				}
			});
		}
		else{
			msg("<i class='far fa-exclamation-triangle'></i> 沒有可發信的 Email，請先行查詢");
		}
	}
*/
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
			"entry.605239846": new Date((new Date).getTime()+288e5).toISOString().split("T")[0]
		});
	}
	function filter_finished(hide){
		let $r = $(".recipients");
		if(!hide) $r.removeClass("unfinished");
		else $r.addClass("unfinished");
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
	$u.filter(":eq(0)").val(1).attr({max: max_user_id});
	$u.filter(":eq(1)").val(max_user_id).attr({max: max_user_id});
}
function uid_toggle(mode, mode_text){
	let mode_another = mode=="listed" ? "interval" : "listed";

	$(".user_data tr").removeAttr("data-off").filter(".uid_"+mode_another).attr("data-off", "");
	alertify.success('<i class="fas fa-filter"></i> '+mode_text+"模式");
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
