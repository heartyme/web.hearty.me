"use strict";

const BD_PACKS = [30, 90, 180, 365]; // 目前提供的方案天數

$(function(){
	$(document).on("click", ".vouchers [data-copy]", function(){
		hj_copy_text(this.title);
	}).on("click", ".vouchers td[data-link]", function(){
		get_link($(this));
	}).on("click", ".vouchers td[data-email]", function(){
		collect_eml($(this));
	}).on("click", ".vouchers td[data-remark]", function(){
		voucher_remark($(this));
	}).on("click", ".vouchers td[data-hide]", function(){
		hide_voucher($(this));
	});

	$(".user").on("click", () => hj_href("account"));
	$("header [data-menu]").on("click", () => nav_toggle($(".menu"), true));

	$(".eml").on("click", function(){
		if(confirm("ℹ️ 要離開編輯視窗嗎？")) eml_composer(false);
	}).children("div").on("click", function(e){
		e.stopPropagation();
	}).find("input[type='email']").on("click", function(){
		hj_copy($(this));
	});

	$(".eml .variables").on("click", function(e){
		e.preventDefault();
	}).find("a").on("click", function(){
		let $a = $(this);
		hj_tinymce_variable($a.is("[data-voucher-timer]")
			? hj_timer_dom_convert($a.attr("data-voucher-timer")).add($("<br>"))
			: $a
		);
	});

	$(".eml [data-send]").on("click", send_voucher_eml);
	$(".eml [data-sender]").on("click", sender_info).find("address").on("click", function(){
		hj_copy_text(this.innerText);
	});

	// create
	let $c = $(".create");
	$c.on("click", function(){
		$(this).fadeOut("fast");
	}).find("div > div").on("click", function(e){
		e.stopPropagation();
	}).find("input").on("input", function(){ // 張數
		let n = $(this).val();
		if(n<1) $(this).val(1);
		else if(n>20) $(this).val(20);
	});
	$c.find("[data-active]").on("click", create_vouchers);
	$c.find("[data-info]").on("click", function(){
		msg('<i class="fal fa-info-circle"></i> 可選方案依合約而定，<br>原<u>數位兌換卡合作商家</u>可申請升級為<u>經銷商</u>，詳洽業務夥伴');
	});

	// 若未簽經銷，則停用付費型序號選項
	if($("[data-level='0']").length==1) $c.find("optgroup").eq(1).prop("disabled", true);


	// btn
	$("[data-page]").on("click", bd_page);
	$("[data-stats]").on("click", () => count_vouchers(3));
	$("[data-export]").on("click", bd_export);
	$("[data-create]").on("click", function(){
		$c.removeAttr("data-hidden").fadeIn().fadeTo("fast", 1);
	});
	$(".contract").on("click", bd_contract);

	// docs.google.com/document/d/1SAbQsGQjlS1Havnsolie9QwsMVsCwMmeR3mjmD_cgXc/edit
	$(".help_btn").on("click", function(){
		if(!getcookie("hearty_bd_tutorial")) bd_tutorial();
		else hj_preview(true);
	});
	$(".hj_preview").on("click", function(){
		hj_preview(false);
	}).find("iframe").on("load", function(){
		$(this).removeClass("loading");
	});

	// footer
	$("[data-mark]").on("click", bd_mark);
	$("[data-redeem]").on("click", () => redeem_tutorial(true));
	$("[data-kit]").on("click", () => window.open("//bit.ly/3WH7SKy", "_blank"));
	$("[data-shortcut]").on("click", function(){
		hj_getFile("d.hearty.app/win/BD.exe", "溫度日記經銷系統.exe");
	});
	$("[data-tm]").on("click", function(){
		hj_preview(true, "//mozilla.github.io/pdf.js/web/viewer.html?file=//cdn.jsdelivr.net/gh/chennien/d.hearty.app@0/docs/trademarks.pdf");

		if(check_OS("Windows")) hj_getFile("d.hearty.app/win/trademarks.exe", "溫度日記商標.exe");
	});
	$("[data-comingsoon]").on("click", function(){
		msg('<i class="fal fa-box-full"></i> 功能即將推出，好了再讓你知道');
	});

	get_vouchers();
	setInterval(get_vouchers, 300000); // 每 5分鐘自動刷新

	$(".toast_signin_reminder").delay(5000).queue(function(){
		$(this).fadeOut().dequeue();
	});

	hj_localize_cn();
});

function bd_loading(on){
	let $b = $("body");
	if(on===false)
		$b.removeClass("loading");
	else
		$b.addClass("loading").delay(5000).queue(function(){
			$(this).removeClass("loading").dequeue();
		});
}

function bd_update(d){
	return $.ajax({
		url: "/bd/update.php",
		type: "POST",
		crossDomain: true,
		dataType: "json",
		data: d
	});
}

// 通用錯誤提示 (不把 jqXHR 等參數傳給 msg)
function bd_error(){
	msg();
}

function bd_pack(days){
	return {
		// 7: "7日",
		// 14: "14日",
		30: "30日",
		// 60: "2個月",
		90: "3個月",
		180: "6個月",
		365: "一年期"
	}[days]||(days+"日");
}

// 取得同一列中其他欄位的屬性值
function bd_row_attr($e, sel, attr){
	return $e.siblings(sel).attr(attr || "title");
}

// 兌換連結/索取連結對話框：網址輸入框樣式
function bd_url_input(url){
	alertify_input_custom({
		type: "url",
		placeholder: url,
		onclick: "hj_copy($(this))"
	}, {
		cursor: "copy"
	});
}

// 複製連結，觸控裝置另開分享選單
function bd_share(url){
	hj_copy($("#alertify .alertify-text"));
	if(is_touch_device() && "share" in navigator){
		navigator.share({url: url}).catch(function(){});
	}
}

function get_vouchers(){
	bd_update({
		action: "get_vouchers"
	}).then(function(r){
		if(r["Status"]!=1) return msg();

		$(".vouchers tbody[data-empty] tr").remove();
		list_vouchers(r["Values"]);

		// DEMO模式，遮蔽列表個資
		if(getUrlPara("demo")){
			$(".vouchers").find("[data-voucher],[data-email]").css({filter: "blur(4px)"});
			msg('<i class="fas fa-eye-slash"></i> 已啟用 DEMO模式，隱藏既有列表中的個資');
		}
	}).fail(bd_error);
}
	function list_vouchers(vouchers){
		let $b = $(".vouchers tbody").hide(),
			$sample = $("[data-sample] tr");

		// 後到的序號排在最上方
		let rows = vouchers.map(function(v){
			let $r = $sample.clone(),
				dur = v["duration"];

			$r.find("[data-dur]").attr("data-dur", dur).text(bd_pack(dur));
			$r.find("[data-voucher]").attr({title: v["voucher"]});
			$r.find("[data-exp]").attr({
				"data-exp": v["expiration"][0],
				title: v["expiration"][1]
			});

			if("email" in v) $r.find("[data-email]").attr({
				title: v["email"],
				"data-emails_sent": v["emails_sent"]
			});
			if("remark" in v) $r.find("[data-remark]").attr({title: v["remark"]});
			if("redemption" in v){
				let expired = parseInt(v["expired"])>0,
					redeemed = parseInt(v["redemption"])>0;
				$r.find("[data-status]").attr({
					"data-status": redeemed ? 2 : +!expired,
					title: redeemed ? "已兌換" : (expired ? "逾期" : "有效")
				});
			}
			return $r;
		}).reverse();

		$b.prepend(...rows).fadeIn();
	}

function count_vouchers(get_months){ // get_months = 回溯月份數
	get_months = get_months || 3;

	bd_loading(true);
	bd_update({
		action: "count_vouchers",
		month_num: get_months
	}).then(function(r){
		if(r["Status"]!=1) return msg();

		let tr = (cells) => $("<tr>").append(...cells.map((t) => $("<td>", {title: t}))), // <th> 無法正常運作
			$tb = $("<tbody>"),
			now = new Date();

		// 迴圈從 get_months到 0
		for(let m=get_months; m>=0; m--){
			let d = new Date(now.getFullYear(), now.getMonth()-m, 1),
				yr = d.getFullYear(),
				mm = String(d.getMonth()+1).padStart(2, "0"),
				stats = r["Values"][yr+mm]||[]; // key format: 202501

			$tb.append(tr([yr+"/"+mm].concat(
				BD_PACKS.map((p) => numberWithCommas(stats[p]||0))
			)));
		}

		let $t = $("<table>").append(
			$("<thead>").append(tr(["月份"].concat(BD_PACKS.map(bd_pack)))),
			$tb
		);

		msg('<h3><i class="fal fa-chart-bar"></i> 我近期取得的序號張數</h3>'+$t.prop("outerHTML"));
	}).fail(bd_error).always(function(){
		bd_loading(false);
	});
}

function voucher_remark($e){
	if(!$e) return;

	let voucher = bd_row_attr($e, "[data-voucher]")||"";
	alertify.set({labels: {ok: '<i class="fas fa-plus"></i> 貼上', cancel: "取消"}, buttonReverse: false});
	alertify.prompt('<i class="fal fa-edit"></i> 備註一下：', function(e, remark){
		if(!e) return;
		remark = htmlDecode(remark);

		bd_update({
			action: "voucher_remark",
			voucher: voucher,
			remark: remark
		}).then(function(r){
			if(r["Status"]==1) $e.attr({title: remark});
		}).fail(bd_error);
	}, htmlDecode($e.attr("title")));

	alertify_input_custom({
		minlength: 1,
		maxlength: 85,
		placeholder: "eg. 領取者姓名、檔期名稱、其他資訊"
	}, {
		"letter-spacing": "1px"
	});
}

function create_vouchers(){
	let $c = $(".create"),
		num = Math.min($c.find("input").val()||1, 20),
		dur = Math.min($c.find("select").val()||30, 365);

	bd_update({
		action: "create_vouchers",
		dur: dur,
		num: num
	}).then(function(r){
		if(r["Status"]!=1) return msg();

		list_vouchers(r["Values"]);
		$c.fadeOut();
		alertify.success('<i class="fas fa-gift-card"></i> 取得 '+num+"張 "+bd_pack(dur)+"序號");
	}).fail(bd_error);
}

function hide_voucher($e){
	let voucher = bd_row_attr($e, "[data-voucher]")||"",
		active = bd_row_attr($e, "[data-status]", "data-status")==1,
		dur = bd_row_attr($e, "[data-dur]", "data-dur")||30;

	if(dur>30){
		msg('<i class="fal fa-ban"></i> 付費型序號一經取得即等同售出，將無法退回或刪除。<br>如有疑問，請聯繫業務夥伴'); return;
	}

	alertify.set({labels: {ok: "否", cancel: '<i class="fas fa-trash-alt"></i> 刪掉它'}, buttonReverse: false});
	alertify.confirm('<i class="fal fa-exclamation-circle"></i> '+(active ? "此序號尚未被兌換，確認不需要" : "刪除換過的")+"「"+voucher+"」嗎？", function(e){
		if(e) return;

		bd_update({
			action: "hide_voucher",
			voucher: voucher
		}).then(function(r){
			if(r["Status"]!=1) return msg();

			alertify.error('<i class="fas fa-trash-alt"></i> 刪除了 '+voucher);
			$e.parent().slideUp("slow", function(){
				$(this).remove();
			});
		}).fail(bd_error);
	});
}

function check_eml(eml, $e){
	return new Promise(function(resolve){
		// 提示錯誤，重新開啟輸入框 (預填 retry)
		let invalid = function(txt, retry){
			msg(txt);
			collect_eml($e, retry);
			resolve(false);
		};

		bd_loading(true);
		$.ajax({
			url: "//api.usercheck.com/email/"+eml,
			// url: "//api.usercheck.com/domain/"+eml.split("@").pop(),
			type: "GET",
			cache: true,
			crossDomain: true,
			dataType: "json",
			timeout: 2000
		}).then(function(r){
			let status = r["status"]||0;

			// eg. test@mailinator.com
			if(status==429){ // Rate limit exceeded
				console.warn("usercheck.com | Rate limit exceeded");
				resolve(true);
			}
			else if(status==400) invalid('<i class="fal fa-times"></i> Email 格式不符：'+eml, eml);
			else if(!r["mx"]) invalid('<i class="fal fa-times"></i> Email 有誤：'+eml, eml);
			else if(r["disposable"]==true) invalid('<i class="fal fa-ban"></i> 不允許使用臨時信箱：'+eml, "");
			else resolve(true);
		}).fail(function(){
			resolve(true);
		}).always(function(){
			bd_loading(false);
		});
	});
}

function collect_eml($e, email){
	if(!$e) return;

	let voucher = bd_row_attr($e, "[data-voucher]")||"",
		prev_email = $e.attr("title")||"",
		emails_sent = $e.attr("data-emails_sent")||0,
		timer = bd_row_attr($e, "[data-exp]", "data-exp");

	email = (email || prev_email).toLowerCase();

	if(emails_sent<0){
		msg('<i class="fal fa-ban"></i> '+email+" 已退訂通知信，別再寄給他惹");
		return;
	}
	if(emails_sent!=0){
		eml_composer(true, voucher, email, timer);
		return;
	}

	alertify.set({labels: {ok: '<i class="fas fa-chevron-right"></i> 下一步，設定 Email', cancel: "否"}, buttonReverse: false});
	alertify.prompt('<i class="fal fa-envelope"></i> 收件人 Email：<br><small><i class="far fa-shield-alt"></i> 基於個資保護，於此登錄之民眾 Email，將加以保密，<br>僅由貴店的您用於本次通知，不會也無法移作其他用途</small>', function(e, new_email){
		if(!e) return;
		new_email = (new_email||"").trim();

		if(new_email.length<5 || new_email.indexOf("@")<1){
			msg('<i class="fal fa-times"></i> Email 格式不符');
			collect_eml($e, new_email);
			alertify_input_shake();
			return;
		}

		// Email檢查
		check_eml(new_email, $e).then(function(res){
			if(!res) return;

			if(prev_email==new_email){ // prev_email 已經檢查為有效 Email
				eml_composer(true, voucher, new_email, timer);
				return;
			}

			bd_loading(true);
			bd_update({
				action: "voucher_eml",
				voucher: voucher,
				email: new_email
			}).then(function(r){
				switch(r["Status"]){
					case 1:
						eml_composer(true, voucher, new_email, timer);
						$e.attr({title: new_email});
					break;

					case 3:
						msg('<i class="fal fa-times"></i> Email 有誤或格式不符：'+new_email);
						collect_eml($e, new_email);
					break;

					case 4:
						msg('<i class="fal fa-ban"></i> '+new_email+" 已退訂通知信，別再寄給他惹");
						collect_eml($e, "");
					break;

					default:
						msg();
					break;
				}
			}).fail(bd_error).always(function(){
				bd_loading(false);
			});
		});
	}, email);

	alertify_input_custom({
		type: "email",
		min: 5,
		max: 64,
		placeholder: "someone@gmail.com"
	}, {
		"letter-spacing": "1px"
	});
}
	function eml_composer(on, voucher, email, timer){
		let $e = $(".eml"),
			$s = $("#Smallchat");

		if(on){
			let $v = $e.find(".variables"),
				url = "https://hearty.gift/"+voucher+"/"+email;

			$e.removeAttr("data-hidden").fadeTo("fast", 1).find("input[type='email']").val(email);

			$v.find("[data-voucher-email]").attr("data-voucher-email", email);
			$v.find("[data-voucher-timer]").attr("data-voucher-timer", timer);
			$v.find("[data-voucher]").attr({
				href: url,
				"data-voucher": voucher,
				rel: "noopener"
			});
			$v.find("[data-voucher-link]").attr({
				href: url,
				"data-voucher-link": url,
				rel: "noopener"
			});

			hj_tinymce_init();
			$s.fadeOut();
		}
		else{
			$e.fadeOut();
			$s.fadeIn();
		}
		$("body").css({overflow: on ? "hidden" : "auto"});
	}
	function send_voucher_eml(){
		let voucher = hj_template_field("voucher"),
			email = hj_template_field("voucher-email"),
			$emails_sent = $("[data-emails_sent]").filter((i, el) => el.title===email),
			emails_sent = parseInt($emails_sent.attr("data-emails_sent"))||0;

		if(email.length<5 || email.indexOf("@")<0){
			msg('<i class="fal fa-info-circle"></i> Email 格式不正確'); return;
		}
		if(emails_sent>4){
			msg('<i class="fal fa-exclamation-triangle"></i> 超出發信上限 (5封/單一收件人)，請聯絡溫度團隊'); return;
		}

		alertify.set({labels: {ok: "確認寄出", cancel: "取消"}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-eye-slash"></i> 即將發送序號通知信到「'+email+"」", function(e){
			if(!e) return;
			bd_loading(true);

			let $r = $("<i>", {
				html: tinymce.activeEditor.getContent({format: "raw"}) || ""
			});

			// 欄位標籤 → 實際內容
			["voucher", "voucher-email", "voucher-link"].forEach(function(f){
				let attr = "data-"+f,
					$f = $r.find("["+attr+"]");
				$f.text($f.attr(attr)).removeAttr(attr);
			});

			$r.append(
				$("<hr>"),
				$("<span>", {
					text: "您參加了品牌活動，才會收到此封通知("+email+")。如不想再收到，請 ",
					style: "font-size:x-small"
				}),
				$("<a>", {
					target: "_blank",
					href: "https://hearty.gift/u/"+email+"/"+voucher,
					text: "[取消訂閱 Unsubscribe :( ]",
					rel: "noopener",
					style: "text-decoration:none;font-size:x-small"
				})
			).find("a[href*='https://']").attr("href", function(i, href){
				return href.replace(/https:\/\/(?!c.heartymail)/gi, "https://c.heartymail.com/voucher/"+email+"/"+voucher+"/");
			});

			let body = $r.html(),
				subject = $("textarea[name='subject']").val().trim();
			bd_update({
				action: "send_voucher_eml",
				voucher: voucher,
				email: email,
				cc_me: +$("input[name='cc_me']").prop("checked"),
				subject: subject,
				body: body
			}).then(function(r){
				switch(r["Status"]){
					case 1:
						msg('<i class="fas fa-check-circle"></i> 通知信已寄至：'+email+"<br><br><img src='//i.hearty.app/w/hearty.me/bd/images/cute_envelope.gif' style='filter:hue-rotate(145deg)saturate(.9)'>");
						tinymce.activeEditor.windowManager.close();
						eml_composer(false);

						$emails_sent.attr("data-emails_sent", emails_sent+1);

						// Log
						// forms.gle/QTwNUfG3iL4hioef7
						gform_post("1FAIpQLScJfg6TYfg_8NwI5d8yGP6H2Az29K9LA3osLnUcKj9YwUJb6Q", {
							"emailAddress": email,
							"entry.768310548": getcookie("hearty_u"),
							"entry.2003480077": getcookie("hearty_id"),
							"entry.1845355844": subject,
							"entry.2038456161": body,
							"entry.1240071619": today(8),
							"entry.390259802": check_browser()+", "+check_OS()
						});
					break;

					case 3:
						msg('<i class="fal fa-info-circle"></i> Email 有誤，或格式不正確');
					break;

					default:
						msg('<i class="fal fa-info-circle"></i> 抱歉，似乎遇到一些問題：'+JSON.stringify(r["Values"]));
					break;
				}
			}).fail(bd_error).always(function(){
				bd_loading(false);
			});
		});
		tinymce.activeEditor.execCommand("mcePreview");
	}
	function sender_info(){
		alertify.set({labels: {ok: "好的", cancel: '<i class="fas fa-edit"></i> 前往修改'}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-mailbox"></i> Email 前綴 = 溫度 ID；顯示名稱 = 溫度暱稱', function(e){
			if(!e) hj_href("account");
		});
	}

function get_link($e){
	if(!$e) return;
	let voucher = bd_row_attr($e, "[data-voucher]") || "",
		email = bd_row_attr($e, "[data-email]"),
		url = "https://hearty.gift/"+voucher+(email ? "/"+email : "");

	alertify.set({labels: {ok: '下載 QRcode <i class="fas fa-qrcode"></i>', cancel: '<i class="fas fa-copy"></i> 複製連結'}, buttonReverse: true});
	alertify.prompt('<i class="fal fa-link"></i> 專屬兌換連結<br><br><a class="qrcode"></a>', function(e){
		if(e) $("#alertify .qrcode").get(0)?.click();
		else bd_share(url);
	}, url);

	bd_url_input(url);
	hj_copy_text(url);

	get_qrcode($("#alertify .qrcode"), url, voucher);
}

function hj_tinymce_init(){
	if(window.tinymce) return hj_tinymce_template();

	hj_getScript("//cdn.jsdelivr.net/combine/npm/tinymce@5.10.9/tinymce.min.min.js,npm/tinymce@5.10.9/jquery.tinymce.min.min.js")
	.then(function(){
		let $e = $("textarea[data-editor]");
		$e.val(linkify($e.val())).tinymce({
			base_url: "https://cdn.jsdelivr.net/npm/tinymce@5.10.9",
			placeholder: "Email 信件內文",
			content_css: "https://cdn.jsdelivr.net/gh/heartyme/web.hearty.me@40929/css/vouchers.tinymce.min.css",
			content_css_cors: true,
			statusbar: false,
			branding: false,
			// skin: "oxide"+(window.matchMedia("(prefers-color-scheme: dark)").matches?"-dark":""),
			relative_urls : false,
			remove_script_host : false,
			height: 300,
			menubar: false,
			image_caption: true,
			save_enablewhendirty: false,
			plugins: "autolink preview directionality code visualblocks visualchars fullscreen image link codesample table charmap toc advlist imagetools textpattern noneditable emoticons paste save",
			toolbar: "reset-to-default save code preview fullscreen | image table link | undo redo | bold underline alignjustify aligncenter alignright | forecolor backcolor formatselect removeformat | emoticons | fontsizeselect",
			toolbar_drawer: "sliding",
			link_list: [
				{title: "溫度日記", value: "https://go.hearty.me/hj"}
			],
			image_list: [
				{title: "溫度日記 信頭圖片", value: "https://i.hearty.app/i/mailheader.png?o=1"},
				{title: "溫度日記 Logo PNG", value: "https://i.hearty.app/i/logo.png?o=1"},
				{title: "溫度日記 Logo JPG", value: "https://i.hearty.app/i/logo.jpg?o=1"},
				{title: "溫度日記 Sheara", value: "https://i.hearty.app/i/illustrations/sheara.jpg?o=1"}
			],
			color_map: [
				"ffffff", "潔白",
				"ffd1a4", "膚色",
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
			language_url : "//cdn.jsdelivr.net/npm/tinymce-all-in-one@4.9.5/langs/zh_TW.min.js",
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
			save_onsavecallback: hj_tinymce_template_save,
			setup: function(e){
				e.on("init", function(){
					hj_tinymce_template();

					// 載入用戶相片
					bd_update({
						action: "get_uploaded_images"
					}).then(function(r){
						if(r["Status"]==1)
							e.settings.image_list = e.settings.image_list.concat(r["Values"]);
					});
				});
				e.ui.registry.addButton("reset-to-default", {
					icon: "restore-draft",
					tooltip: "重置為預設格式",
					onAction: function(){
						hj_tinymce_template_reset();
					}
				});
			}
		});
	});

	window.onbeforeunload = () => false;
}
	function hj_tinymce_template(){
		bd_update({
			action: "voucher_eml_template"
		}).then(function(r){
			if(r["Status"]!=1) return;

			let v = r["Values"];
			if(!v["subject"].length && !v["template"].length)
				hj_tinymce_template_reset(true);
			else
				hj_tinymce_template_rendering(v["subject"], v["template"]);
		});
	}
		function hj_tinymce_template_rendering(subject, template){
			let voucher = hj_template_field("voucher"),
				email = hj_template_field("voucher-email"),
				url = "https://hearty.gift/"+voucher+"/"+email,
				timer = hj_template_field("voucher-timer"),
				$t = $("<i>", {html: template});

			$("textarea[name='subject']").val(subject);
			$t.find("[data-voucher]").attr({
				href: url,
				"data-voucher": voucher
			});

			// [data-voucher-url] 為模版專用參數，自動取代網址連結網址
			["voucher-link", "voucher-url"].forEach(function(f){
				$t.find("[data-"+f+"]").attr({
					href: url,
					["data-"+f]: url
				});
			});

			$t.find("[data-voucher-email]").attr("data-voucher-email", email);
			$t.find("[data-voucher-timer]").replaceWith(hj_timer_dom_convert(timer));
			$t.find("[data-nickname]").text($("header .user").attr("title")||"");
			$t.find("[data-date]").text(today().replace(/-/g, "/"));

			tinymce.activeEditor.setContent($t.html(), {format: "raw"});
		}
			function hj_timer_dom_convert(ts){
				ts = parseInt(ts) || 0;
				if(ts<Math.floor(Date.now()/1000)) ts=0;

				return $("<div>", {
					title: "期限倒數",
					"data-voucher-timer": ts,
					html: $("<img>", {
						src: "https://i.hearty.app/t/"+new Date(ts*1000).toISOString(),
						"data-voucher-timer": ts,
						alt: "期限倒數",
						width: 310,
						height: "auto",
						onerror: "this.style.display='none'"
					}).css({
						"border-radius": "5px"
					})
				}).css({
					height: "70px",
					"text-align": "center",
					overflow: "hidden"
				});
			}

	function hj_tinymce_template_reset(y){
		if(y){
			$.ajax({
				url: "email.template.html?v="+today(8),
				dataType: "text"
			}).then(function(d){
				hj_tinymce_template_rendering("你的溫度日記 VIP 兌換序號已送達 💌", d);
			});
			return;
		}

		alertify.set({labels: {ok: "取消", cancel: '<i class="fas fa-truck-plow"></i> 清掉它'}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-history"></i> 要清除內容，並回到預設格式嗎？', function(e){
			if(!e) hj_tinymce_template_reset(true);
		});
	}
	function hj_tinymce_template_save(){
		bd_update({
			action: "voucher_email_template",
			subject: $("textarea[name='subject']").val(),
			template: tinymce.activeEditor.getContent({format: "raw"}) || ""
		}).then(function(r){
			if(r["Status"]==1) alertify.success('<i class="fal fa-save"></i> 已存為預設範本');
		});
	}
	function hj_template_field(field){
		return $(".eml [data-"+field+"]").attr("data-"+field);
	}
	function hj_tinymce_variable($e){
		tinymce.activeEditor.insertContent(" "+$e.prop({
			contenteditable: false
		}).prop("outerHTML")+" ", "");
		alertify.success('<i class="fal fa-plus"></i> 插入 '+($e.attr("title")||""));
	}
	function linkify(s){
		return (s || "")
			// starts with http(s)://
			.replace(/\bhttps?:\/\/[\w\p{L}\p{N}\-+&@#\/%?=~_|!:,.;]*[\w\p{L}\p{N}\-+&@#\/%=~_|]/gimu, '<a target="_blank" href="$&">$&</a>')

			// starts with "www."
			.replace(/(^|[^\/])(www\.[\w\p{L}\p{N}\-+&@#\/%?=~_|!:,.;]*)(?=$|[^a-zA-Z\p{L}\p{N}\-+&@#\/%?=~_|!:,.;])/gimu, '$1<a target="_blank" href="https://$2">$2</a>');
	}

function bd_export(){
	let $t = $(".vouchers table").clone();
	$t.find("th[title],td[title]").text(function(){
		return $(this).attr("title")||"";
	});
	$t.find("[data-link]").remove();

	exportTableToCSV($t,
		($("header .user").attr("title")||"溫度日記序號")+"_"+today().replace(/-/g, "")+".csv");

	alertify.success('<i class="fas fa-file-excel"></i> CSV檔匯出中');
}
	function exportTableToCSV($table, filename){
		let rows = $table.find("tr:has(th)").get().concat($table.find("tr:has(td)").get()),
			csv = rows.map(function(row){
				let $cols = $(row).find("td");
				if(!$cols.length) $cols = $(row).find("th");

				return $cols.map(function(){
					return '"'+$(this).text().replace(/"/g, '""')+'"';
				}).get().join(",");
			}).join("\r\n"),
			// BOM：讓 Excel 正確辨識 UTF-8 中文
			url = URL.createObjectURL(new Blob(["\uFEFF"+csv], {type: "text/csv;charset=utf-8"}));

		$("<a>", {
			href: url,
			download: filename
		}).get(0)?.click();

		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

function bd_page(){
	let $b = $("body"),
		url = "https://hearty.gift/g/"+($b.attr("data-bd")||"")+"/"+encodeURIComponent($b.attr("data-name")||"");

	alertify.set({labels: {ok: ' <i class="fas fa-eye"></i> 立即查看', cancel: '<i class="fas fa-copy"></i> 複製連結'}, buttonReverse: false});
	alertify.prompt('<i class="fal fa-browser"></i> VIP 30日免費體驗型序號索取連結<br><small><i class="fal fa-info-circle"></i> 僅限用於消費者/會員/員工/粉絲限定活動，勿公開於網路上</small><br><br><a class="qrcode"></a><br><small><i class="fal fa-qrcode"></i> 點擊 QRcode可另存為圖片</small>', function(e){
		if(e){
			hj_copy_text(url);
			window.open(url, "_blank");
		}
		else{
			bd_share(url);
		}
	}, url);

	bd_url_input(url);

	get_qrcode($("#alertify .qrcode"), url);
}

function bd_mark(){
	let img = "hearty.me/bd/images/reseller_mark.png",
		$b = $("body"),
		username = $b.attr("data-user")||"",
		name = $b.attr("data-name")||"",
		alt = "溫度日記授權經銷商"+(name ? " "+name : ""),
		heading = '<h3><i class="fal fa-badge-check"></i> 授權經銷商標章</h3>',

		// 複製用 (直接轉譯 plainHTML)
		code = "<!-- Reseller Mark, Hearty Journal -->\n"+$("<a>", {
			href: "https://hearty.me/bd?utm_source="+username, // & 不可用，會被 .text() 轉譯
			target: "_blank",
			title: alt,
			html: $("<img>", {
				width: "300px",
				height: "300px",
				src: "https://"+img,
				alt: alt
			})
		}).prop("outerHTML"),

		// 顯示+下載用 (HTML物件)
		dl = $("<a>", {
			href: "//"+img,
			title: alt,
			download: alt+".png",
			html: $("<img>", {
				src: "//i0.wp.com/"+img+"?w=250&strip=all",
				width: "250px",
				height: "250px",
				alt: alt
			})
		}).get(0);

	alertify.set({labels: {ok: '<i class="fas fa-copy"></i> 複製 HTML程式碼', cancel: '<i class="fas fa-arrow-alt-to-bottom"></i> 下載圖片'}, buttonReverse: false});
	alertify.confirm(heading+dl.outerHTML+'<br><small><i class="fal fa-info-circle"></i> 請展示於網站明顯處，供消費者識別</small>', function(e){
		if(!e) return dl.click();

		msg(
			heading+
			$("<textarea>", {
				title: alt,
				text: code,
				rows: 6,
				onclick: "hj_copy($(this))"
			}).prop("outerHTML")
		, '<i class="fas fa-copy"></i> 複製 HTML程式碼', function(){
			hj_copy_text(code);
		});
	});
}

function bd_contract(){
	bd_update({
		action: "bd_contract"
	}).then(function(r){
		if((r["Values"]||"").length>0)
			hj_preview(true, "//drive.google.com/file/d/"+r["Values"]+"/preview");
	});
}

function hj_preview(o, url){
	let $d = $(".hj_preview"),
		$i = $d.find("iframe");

	if(o){
		$i.attr({src: url || $i.attr("data-url") || "//docs.google.com/document/d/e/2PACX-1vRmTICp7EIOPI_Lis2JTsVtb5tqoz3wulkTZzh2OUJKrzn_97RSpFmK9NtjXFnW4c5fBK374akpK0f8/pub?embedded=true"}).addClass("loading");
		$d.fadeIn();
	}
	else{
		$d.fadeOut();
		$i.attr({src: ""});
	}
	$("body").css({
		"overflow-y": o ? "hidden" : "auto",
		"touch-action": o ? "none" : "auto"
	});
}

function bd_tutorial(){
	if(!("introJs" in window))
		return hj_getScript_npm("intro.js@3.2.1/intro.min.js", bd_tutorial);

	let $v = $(".vouchers");
	introJs().setOptions({
		showBullets: false,
		prevLabel: "上一步",
		nextLabel: "繼續",
		doneLabel: "朕知道了",
		steps: [{
			element: $v.find("[data-create]").get(0),
			intro: "👉　點「取號」，獲得序號",
			position: "left"
		},
		{
			element: $v.find("table").get(0),
			intro: "🎁　序號會列於表中",
			position: "top"
		},
		{
			element: $v.find("table th:nth-child(6)").get(0),
			intro: "✉️　可自動寄發序號 Email",
			position: "top"
		},
		{
			element: $("#Smallchat iframe").get(0),
			intro: "💬　如有問題，隨時聯繫我們",
			position: "top"
	}]}).start().oncomplete(function(){
		hj_preview(true);
	}).onexit(function(){
		hj_preview(true);
	});
	setcookie("hearty_bd_tutorial", 1, 1);
}

function redeem_tutorial(on){
	let $r = $(".redeem_tutorial");

	if(!on) return $r.fadeOut();
	if($r.length>0) return $r.fadeIn();

	let titles = ["一、手動輸入序號", "二、點選兌換連結"],
		video_url = "//i.hearty.app/b/videos/voucher_redeem",
		t = check_OS("iOS") ? "#t=0.001" : ""; // muffinman.io/blog/hack-for-ios-safari-to-display-html-video-thumbnail/

	// imgur.com/a/vVlUUVX
	$("<section>", {
		class: "redeem_tutorial",
		html: titles.map(function(title, i){
			let src = video_url+(i+1);
			return $("<div>", {
				title: title,
				html: $("<video>", {
					controls: "",
					controlsList: "nodownload noplaybackrate",
					muted: "",
					preload: "",
					disablePictureInPicture: "",
					html: $("<source>", {
						src: src+".webm"+t,
						type: "video/webm"
					}).add($("<source>", {
						src: src+".mp4"+t,
						type: "video/mp4"
					}))
				}).on("play", function(){
					if(this.requestFullscreen) this.requestFullscreen();
				}).on("click", function(e){
					e.stopPropagation();
				})
			});
		})
	}).on("click", function(){
		redeem_tutorial(false);
	}).appendTo("body");
}
