"use strict";

function account_init(){
	let t = getUrlPara("tab"),
		v = getUrlPara("vr"),
		m = getUrlPara("msg");
	if(t) nav_account(parseInt(t), true);
	if(m) msg('<i class="fal fa-info-circle"></i> '+decodeURIComponent(m));

	if(getUrlPara("ev")){
		if(email_resendable()) email_edit();
	}
	else if(getUrlPara("pc")){
		password_edit();
	}
	else if(v==1){
		nav_account(1, true);
		voucher_redeem();
	}
	else if(v==2){
		msg('<i class="far fa-times-circle"></i> '+_h("a-voucher_invalid"), _h("a-retry"), function(){
			voucher_redeem();
		});
		nav_account(1, true);
	}

	// 針對僅參與徵文活動者，移除客服框
	if((getUrlPara("utm_campaign")||"").indexOf("award")>-1) $(".chat_btn").remove();

	birthday_init();
	uploader_init();
	account_area_calc();
	account_stats();
	language_edit();

	window.addEventListener("resize", account_area_calc, {passive: true});

	$(".mh-head .left").on("click", function(){
		nav_toggle($(".menu"), true);
	});
	$(".chat_btn").on("click", function(){
		hj_href("d?f=1");
	});
	$("a[data-fonts]").on("click", font_info);
	$(".hj_preview").on("click", function(){
		hj_preview(false);
	});

	// 移除已停用的字體
	$("#post_font option").filter(function(){
		return [2,16,23,24,25,26,27,28,29,30,31].includes(+this.value);
	}).remove();

	document.title = _h("a-title")+" | 💝 Hearty Journal 溫度日記";
}

// 更新個人資料：Status 1 時記錄 GA 並執行 ok()；2 要求登入；其餘顯示錯誤
function profile_update(field, data, ok){
	return hj_update({
		action: "profile_update",
		field: field,
		data: data
	}).then(function(r){
		switch(+r["Status"]){
			case 1:
				ga_profile(field.replace(/(^|_)[a-z]/g, function(c){ return c.toUpperCase(); })); // post_font → Post_Font
				if(ok) ok(r);
			break;

			case 2:
				signin_ask();
			break;

			default:
				msg();
		}
	}).fail(function(){
		msg();
	});
}
	function ga_profile(label){
		ga_evt_push(label, {
			event_category: "Profile Update",
			event_label: label
		});
	}

// 設定 alertify 確認／取消按鈕文字
function alertify_labels(ok, cancel, reverse){
	alertify.set({labels: {ok: ok, cancel: cancel}, buttonReverse: !!reverse});
}

// 密碼長度限制（設定密碼、匯出備份共用）
const PWD_MIN = 6, PWD_MAX = 20;
function password_valid(pwd){
	return pwd.length>=PWD_MIN && pwd.length<=PWD_MAX;
}

// 密碼輸入框（設定密碼、匯出備份共用）
function alertify_input_password(placeholder){
	return alertify_input_custom({
		type: "password",
		placeholder: placeholder,
		autocomplete: "new-password",
		minlength: PWD_MIN,
		maxlength: PWD_MAX
	}, {
		"letter-spacing": "2px"
	});
}

function signin_ask(f){
	let a = getcookie("hearty_account") || "",
		u = "?r="+location.pathname+(a ? "&account="+a : "")+"#signin";
	if(f){
		hj_href(u);
	}
	else{
		alertify_labels(_h("a-no"), '<i class="fas fa-door-open"></i> '+_h("a-signin-0"));
		alertify.confirm('<i class="fal fa-user-lock"></i> '+_h("a-signin-1"), function(e){
			if(!e) hj_href(u);
		});
	}
}

function account_area_calc(){
	$(".account").height(
		$(document).height()-$(".nav_toggle_account").height()
	);
}

// 篇數字數、小布點
function account_stats(){
	[
		[".usage", {action: "account_usage"}, function(r){
			return _h("a-usage", {
				$num: numberWithCommas(parseInt(r["num"]||0)),
				$chars: numberWithCommas(parseInt(r["chars"]||0))
			});
		}],
		[".points", {action: "hearty_points", query: "balance_lookup"}, function(r){
			return _h("a-points", {
				$p: numberWithCommas(parseInt(r["points"]||0))
			});
		}]
	].forEach(function([sel, req, text]){
		hj_update(req).then(function(r){
			let $e = $(sel);
			if(r["Status"]==1){
				let t = text(r["Values"]);
				$e.text(t).attr({title: t});
			}
			else{
				$e.remove();
			}
		});
	});
}

function birthday_init(){
	let $bd = $("#birthday");

	if(check_OS("iOS") || check_browser("Safari")){
		if(/zh/i.test(hj_lang())){
			hj_getScript_gh({path: "js/safari.datepicker.tw.min.js"}, function(){
				datepicker_load($bd);
			});
		}
		else{
			datepicker_load($bd);
		}
	}
	birthday_age();

	$bd.filter("[disabled]").parent().on("click", function(){
		msg('<i class="fal fa-birthday-cake"></i> '+_h("a-bday_ask-1"));
	});
}
	function datepicker_load($d){
		$("<link>", {
			rel: "stylesheet",
			href: hj_jsdelivr()+"css/datepicker/jquery.ui.datepicker.custom.min.css"
		}).appendTo("head");

		let yr = new Date().getFullYear();

		// datepicker 需使用 onchange觸發
		return $d.attr({
			type: "text",
			readonly: ""
		}).datepicker({
			changeYear: true,
			changeMonth: true,
			yearRange: (yr-70)+":"+(yr-7),
			yearSuffix: _h("a-year"),
			dateFormat: "yy-mm-dd",
			showAnim: "slideDown",
			minDate: $d.attr("min") || "",
			maxDate: $d.attr("max") || "",
			showButtonPanel: true
		}).on("click", function(){
			$(this).datepicker("show").trigger("select");
		});
	}

	function birthday_edit(bday){
		if(bday==null) return;

		alertify_labels('<i class="fas fa-check-circle"></i> '+_h("a-ok-3"), _h("a-no"));
		alertify.confirm('<i class="fal fa-birthday-cake"></i> '+_h("a-bday_ask-0", {$bday: bday.replace(/-/g,"/")}), function(e){
			if(e){
				profile_update("birthday", bday, function(){
					alertify.success('<i class="far fa-birthday-cake"></i> '+_h("a-bday_ask-2"));
				});
			}
			birthday_age();
		});
	}
	function birthday_age(){
		let age = parseInt((Date.now()-new Date($("#birthday").val()))/31557600000) || 0,
			age_restricted = age>0 && age<18;

		$("#age").text(_h("a-age", {$age: age}));

		// 年齡限制
		$(".menu [data-btn='home'],.menu [data-btn='feed']").toggle(!age_restricted);
		setcookie("hearty_children", age_restricted ? 1 : 0, 7);

		return age;
	}

function password_edit(txt){
	if(!email_verified_required(_h("a-pwd_edit"))) return false;

	alertify_labels('<i class="fas fa-lock"></i> '+_h("a-pwd_apply-0"), _h("a-no"));
	alertify.prompt('<i class="far fa-key"></i> '+(txt || _h("a-pwd_enter")), function(e, pwd){
		if(!e) return;

		if(!password_valid(pwd)){
			password_edit(_h("a-pwd_invalid"));
			alertify_input_shake();
			return;
		}

		alertify_labels('<i class="fas fa-lock"></i> '+_h("a-pwd_apply-1"), _h("a-no"));
		alertify.prompt('<i class="far fa-key"></i> '+_h("a-pwd_confirm"), function(e, pwd2){
			if(!e) return;

			if(pwd!=pwd2){
				password_edit(_h("a-pwd_mismatch"));
				alertify_input_shake();
				return;
			}

			profile_update("password", pwd, function(){
				msg('<i class="fas fa-check-circle"></i> '+_h("a-pwd_ok-0")+"<br><small>"+_h("a-pwd_ok-1")+"</small>");
				$(".account_btn[data-password]").attr({
					"data-password": 1,
					title: _h("a-pwd_edited")
				});
			});
		}, "");
		alertify_input_password(_h("a-pwd_confirm"));
	}, "");
	alertify_input_password(_h("a-pwd_format"));
}

// 大頭貼上傳
function uploader_init(){
	$("#profile_uploader").on("input", function(evt){
		let file = evt.target.files[0];
		if(!file) return;

		let d = new FormData();
		d.append("myfile", file);
		d.append("category", 0);
		d.append("privacy", 9);

		$.ajax({
			url: "/update",
			type: "POST",
			data: d,
			dataType: "json",
			contentType: false, // 需為 false
			processData: false, // 需為 false
			complete: function(){
				$("#profile_uploader").val(""); // 清除已選檔，以便後續可重選
			},
			success: function(r){
				if(r["status"]==1){ // 1: 成功; 0: 錯誤
					let img = "//i.hearty.app/u/"+r["basenames"][0];

					$("#profile_image img").attr({src: img});
					$(".profile_image div").css({"background-image": "url("+img+")"});

					picture_rotate();
					alertify.success('<i class="far fa-address-card"></i> '+_h("a-avatar-3"));
					ga_profile("Avatar");
				}
				else{
					msg('<i class="far fa-times"></i> '+_h("a-avatar_err-"+(r["err"]||0)));
				}
			},
			error: function(xhr, status, err){
				msg('<i class="far fa-info-circle"></i> '+_h("a-avatar_err-0")+"<br><small>"+JSON.stringify(status)+"："+JSON.stringify(err)+"</small>");
			}
		});
	});
}

function hj_picture(ask){
	if(ask){
		alertify_labels(_h("a-no"), '<i class="fas fa-arrow-circle-up"></i> '+_h("a-upload"), true);
		alertify.confirm('<i class="fal fa-image"></i> '+_h("a-avatar-0"), function(e){
			if(!e) hj_picture();
		});
		return;
	}
	$("#profile_uploader").get(0)?.click();
}

// 旋轉大頭貼：檔名後綴 #1～#3 代表旋轉 90°～270°
function picture_rotate(){
	let $i = $("#profile_image img");

	alertify_labels('<i class="fas fa-check-circle"></i> '+_h("a-ok-1"), '<i class="fas fa-undo fa-flip-horizontal"></i> '+_h("a-rotate"));
	alertify.confirm($i.prop("outerHTML"), function(e){
		if(e) return;

		let [src, n] = ($i.attr("src")||"").split("#");
		n = (+n||0)+1;
		let i = n==4 ? src : src+"#"+n;

		$i.add(".alertify img").attr({src: i});
		$(".profile_image div").css("background-image", "url("+i+")");

		hj_update({
			action: "profile_update",
			field: "profile_image",
			data: i.split("/").pop()||""
		});

		picture_rotate();
		ga_evt_push("Rotate Picture");
	});
}

function nickname_edit(changed){
	let $btn = $(".account_btn[data-nickname]");

	if(changed){
		$btn.fadeIn();
		return;
	}

	let $n = $("#nickname"),
		n = $n.val().trim();
	profile_update("nickname", n, function(){
		alertify.success('<i class="far fa-user"></i> '+_h("a-nickname_edited", {$n: n}));
		$n.attr({placeholder: n});
		$btn.fadeOut();
	});
}

function email_edit(email){
	email = (email || $("[data-email]").attr("data-email") || "").toLowerCase();
	alertify_labels('<i class="fas fa-chevron-right"></i> '+_h("a-next"), _h("a-no"));
	alertify.prompt('<i class="far fa-envelope"></i> '+_h("a-email_new"), function(e, email_new){
		if(!e) return;

		email_new = (email_new || "").trim().toLowerCase();
		if(email==email_new){
			if(email_resendable()) email_verification(false);
		}
		else if(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,12}$/.test(email_new) &&
			!/@(hearty(\.(me|app|gift)|mail\.com)|miss\.com\.tw|hj\.rs|ht\.mk|(|chen)nien\.(co(m|)|org))/.test(email_new)
		){
			alertify_labels(_h("a-ok-1"), _h("a-no"));
			alertify.confirm(_h("a-email_confirm", {$email: email_new}), function(e){
				if(!e) return;

				profile_update("email", email_new, function(){
					email_verification();
					$("[data-email-verify]").attr("data-email-verify", 0)
						.find("[data-email]").attr("data-email", email_new);

					// 同步更新至療癒商城
					sync_wp_user({email: email_new});
				});
			});
		}
		else{
			msg('<i class="fas fa-times"></i> '+_h("a-email_invalid"));
			email_edit(email_new);
		}
	}, email);

	alertify_input_custom({
		type: "email",
		placeholder: email || "eg. my@hearty.me",
		maxlength: 64
	});
}
	// 同步更新至療癒商城
	function sync_wp_user(data){
		return $.ajax({
			url: "/life/api/sync_wp_user.php",
			type: "POST",
			dataType: "json",
			data: data
		});
	}

	// 驗證信可重寄（未驗證且不在倒數中）
	function email_resendable(){
		return $("#email_resend[data-timeout='0']:visible").length==1;
	}

	function email_verified_required(fn){
		if($("[data-email-verify='1']").length>0) return true;

		msg('<i class="far fa-envelope-open"></i> '+_h("a-email_verify-0")+(fn || _h("a-email_verify-1")), _h("a-email_verify-2"), function(){
			email_edit();
		});
		return false;
	}

	function email_verification(ask){
		if(ask){
			alertify_labels(_h("a-ok-2"), _h("a-no"));
			alertify.confirm('<i class="far fa-envelope"></i> '+_h("a-email_send"), function(e){
				if(e) email_verification(false);
			});
			return;
		}

		let $v = $("[data-email-verify]");
		hj_update({action: "email_verification"}).then(function(r){
			switch(+r["Status"]){
				case 1: {
					hj_timer($v.find("#email_resend"), true);
					$v.attr("data-email-verify", 0);

					let u = r["Values"]["email_login_url"];
					if(u.length>0){
						alertify_labels(_h("a-ok-0"), _h("a-no"));
						alertify.confirm(_h("a-email_sent-0", {$isp: u[0]}), function(e){
							if(!e) return;
							if(/iOS|Android/i.test(check_hjapp())) hj_href("wv?o="+u[1]);
							else open_url("//"+u[1]);
						});
					}
					else{
						msg('<i class="fas fa-mailbox"></i> '+_h("a-email_sent-1"), _h("a-ok-0"));
					}

					ga_profile("Email Sent");
				break;
				}

				case 2:
					signin_ask();
				break;

				case 3:
					msg('<i class="far fa-mobile"></i> '+_h("a-email_verified"));
					$v.attr("data-email-verify", 1);
				break;

				default:
					msg();
			}
		}).fail(function(){
			msg();
		});
	}

function gender_edit(gender){
	profile_update("gender", gender, function(){
		alertify.success('<i class="far fa-'+(gender=="1" ? "mars" : "venus")+'"></i> '+_h("a-gender_edited"));
	});
}

function newsletter(optin){
	profile_update("newsletter", optin, function(){
		alertify.success('<i class="fal fa-mailbox"></i> '+_h("a-newsletter_edited"));
	});
}

function phone_verification($e){
	$e = $e.find("[data-phone-no]");
	hj_href("p/phone.php?cc="+($e.attr("data-phone-cc")||"")+"&no="+($e.attr("data-phone-no")||""));
}

// 倒數計時（秒），倒數中 data-timeout>0；start=false 時停止
function hj_timer($e, start, dur){
	$e.attr("data-timeout", 0).text("");
	if(!start) return;

	$.wait(1000).then(function(){
		dur = dur || 60;
		$e.attr("data-timeout", dur);

		(function countdown(){
			if(Number($e.attr("data-timeout"))>0){
				dur--;
				if(dur>0) $.wait(1000).then(countdown);
				$e.attr("data-timeout", dur).text(dur>0 ? String(dur%60).padStart(2, "0") : "");
			}
		})();
	});
}

function support_pincode(reissue){
	hj_update({
		action: "support_pincode",
		reissue: +(reissue!=null)
	}).then(function(r){
		if(r["Status"]!=1) return;

		let pin = r["Values"]["pincode"];
		alertify_labels('<i class="fas fa-arrow-alt-to-bottom"></i> '+_h("a-pin-1"), '<i class="fas fa-reply"></i> '+_h("a-back"));
		alertify.confirm('<i class="far fa-comment-dots"></i> '+_h("a-pin-0", {$pin: pin}), function(e){
			if(e){
				$("<a>", {
					href: "data:text/plain;charset=utf-8,"+encodeURIComponent(pin),
					download: "Hearty-PINcode.txt"
				}).get(0)?.click();
			}
			let $s = $("#Smallchat iframe");
			if($s.length>0 && !is_touch_device()) $s.contents().find(".Launcher").trigger("click");
		});
	}).fail(function(){
		msg();
	});
}

function font_info(x){
	if(!x){
		msg('<i class="fal fa-file-certificate"></i> '+_h("a-font-2"));
		return;
	}
	alertify_labels('<i class="fas fa-copyright"></i> '+_h("a-font-3"), _h("a-ok-0"), true);
	alertify.confirm('<img src="//i.hearty.app/'+_h("a-font-1")+'" title="'+_h("a-font-0")+'" alt="'+_h("a-font-0")+'">', function(e){
		if(e) font_info(false);
	});
}

function post_font_change(font_id, font_name){
	post_font(font_id);
	profile_update("post_font", font_id, function(){
		alertify.success('<i class="far fa-font-case"></i> '+_h("a-font_change", {$font: font_name}));
	});
}

function language_edit(lang, title){
	if(!lang){
		// 將帳號內的設定同步至 cookie
		lang = $("#language").val();
	}
	else{
		msg('<i class="far fa-language" style="font-size:26px"></i> '+_h("i-lang", {$lang: title}));
		profile_update("language", lang, function(){
			location.reload(true);
		});
	}
	setcookie("hearty_language", lang, 730);
}

function timezone_edit(tz){
	profile_update("timezone", tz, function(){
		alertify.success('<i class="far fa-clock"></i> '+_h("a-timezone_edited", {$tz: tz}));
	});
}

function username_details(){
	let username = $(".hj_username").attr("title") || "";
	alertify_labels('<i class="fas fa-sync"></i> '+_h("a-id_edit"), '<i class="fas fa-hand-peace"></i> '+_h("a-back"), true);
	alertify.confirm('<i class="fal fa-user"></i> '+_h("a-id")+"<u>"+username+'</u> <i class="far fa-globe-asia"></i><br>('+_h("a-id_public")+")", function(e){
		if(e) username_edit(username);
	});
}
	function username_validate(username){
		return (username||"").toLowerCase().replace(/[\W_]+/g,"");
	}
	function username_edit(username, dialog){
		if(!email_verified_required(_h("a-id_edit"))) return false;

		alertify_labels('<i class="fas fa-check-circle"></i> '+_h("a-id_edit"), _h("a-no"), true);
		alertify.prompt('<i class="fal fa-user"></i> '+_h("a-id_new")+'<br><i class="fal fa-info-circle"></i> '+(dialog || _h("a-id_format")), function(e, new_username){
			if(!e) return;

			new_username = (new_username || "").trim().toLowerCase();
			if(username==new_username){
				username_edit(username, _h("a-id_same"));
				alertify_input_shake();
				return;
			}
			if(new_username.length<4 || !isNaN(new_username) || !/^[a-z0-9]*$/.test(new_username)){
				username_edit(username, _h("a-id_invalid"));
				alertify_input_shake();
				return;
			}

			hj_update({
				action: "username_edit",
				username: new_username
			}).then(function(r){
				if(r["Status"]!=1){
					username_edit(username, _h("a-id_taken", {$id: new_username}));
					alertify_input_shake();
					return;
				}

				msg('<i class="fal fa-check-circle"></i> '+_h("a-id_edited", {$id: new_username}), '<i class="fas fa-door-open"></i> '+_h("a-id_signout"), signout);
				setcookie("hearty_account", new_username, 90);

				// 同步更新至療癒商城
				sync_wp_user({username: new_username});

				// forms.gle/bG1EnEKeYyqv3BR88
				gform_post("1FAIpQLScMUCYu17vjPovyr8Ywr9wbgfVxZ7E5FPYvqdpbPdlEw7TMVQ", {
					"entry.1182370364": getcookie("hearty_u"),
					"entry.847068538": getcookie("hearty_id"),
					"emailAddress": getcookie("hearty_em"),
					"entry.1353731030": new_username,
					"entry.1460125899": today(8),
					"entry.1757674378": (navigator.userAgent || "")
				});

				ga_profile("Username");
			}).fail(function(){
				msg();
			});
		}, username);

		alertify_input_custom({
			type: "search",
			autocomplete: "off",
			placeholder: _h("a-id_format"),
			minlength: 4,
			maxlength: 20,
			onkeyup: "this.value=username_validate(this.value)"
		}, {
			"letter-spacing": "3px",
			"ime-mode": "disabled"
		});
	}

function nav_account(p, no_animation){
	p = p||0;
	let $a = $(".account");
	$a.get(0)?.scroll({
		left: $a.children().get(p)?.offsetLeft,
		behavior: no_animation ? "instant" : "smooth" // CSS scroll-behavior
	});
	$(".nav_account li").removeAttr("data-active").eq(p).attr("data-active", "");
}

// 匯出備份：選擇格式 (.txt／.docx)
function export_journal(){
	hj_loading();
	account_status().then(function(r){
		if(r["Values"]["vip"]!=1){
			vip_only(_h("a-dl"));
			export_stats("notice_upgrade");
			return;
		}
		if(is_touch_device()){
			msg('<i class="far fa-desktop"></i> '+_h("a-dl_pc"));
			export_stats("use_pc_instead");
			return;
		}

		let fmt = "txt";
		alertify_labels(_h("a-dl_fmt-3"), _h("a-no"));
		alertify.confirm('<i class="far fa-briefcase"></i> '+_h("a-dl_fmt-0")+
			'<label style="display:block;margin-top:.8em;cursor:pointer"><input type="radio" name="export_fmt" value="txt" checked> <i class="far fa-file-alt"></i> '+_h("a-dl_fmt-1")+"</label>"+
			'<label style="display:block;margin-top:.4em;cursor:pointer"><input type="radio" name="export_fmt" value="docx"> <i class="far fa-file-word"></i> '+_h("a-dl_fmt-2")+"</label>", function(e){
			if(!e) return;

			if(fmt=="txt"){
				export_txt();
			}
			else if(!("showSaveFilePicker" in window)){
				msg('<i class="fab fa-chrome"></i> '+_h("a-dl_doc-7"));
				export_stats("doc_unsupported");
			}
			else{
				export_docx();
			}
		});
		$("#alertify input[name=export_fmt]").on("change", function(){
			fmt = this.value;
		});
	}).fail(function(){
		msg();
	}).always(function(){
		hj_loading(false);
	});
}
	// 輸入溫度密碼：格式不符時以 retry 重新詢問
	function export_password(txt, retry, callback, ok){
		alertify_labels('<i class="fas fa-lock"></i> '+(ok || _h("a-dl_pwd-2")), _h("a-no"));
		alertify.prompt((txt || '<i class="far fa-briefcase"></i> '+_h("a-dl_pwd-0")), function(e, pwd){
			if(!e) return;

			if(!password_valid(pwd)){
				retry('<i class="far fa-info-circle"></i> '+_h("a-dl_pwd-1"));
				alertify_input_shake();
				export_stats("password_malformatted");
				return;
			}
			callback(pwd);
		}, "");
		alertify_input_password(_h("a-dl_pwd-1"));
	}

	function export_txt(txt){
		export_password(txt, export_txt, function(pwd){
			hj_loading();

			let $f = $("<form>", {
				method: "POST",
				target: "_self",
				action: "/update",
				enctype: "application/x-www-form-urlencoded",
				html: $("<input>", {type: "hidden", name: "action", value: "export_txt"}).add(
					$("<input>", {type: "hidden", name: "password", value: pwd})
				)
			}).appendTo("body").trigger("submit");

			alertify.success('<i class="far fa-arrow-to-bottom"></i> '+_h("a-dl_pwd-3"));

			$.wait(1000).then(function(){
				$f.remove(); // 送出後移除，避免密碼留在 DOM、重複匯出時累積表單
				hj_loading(false);
			});
			$.wait(2000).then(function(){
				export_stats("txt_exported");
				ga_evt_push("Posts Exported", {
					event_category: "Posts",
					event_label: "Posts Exported"
				});
				msg('<i class="fas fa-folder-download"></i> '+_h("a-dl_pwd-4"), _h("a-ok-1"));
			});
		});
	}

	function export_docx(txt){
		export_password(txt, export_docx, function(pwd){
			hj_loading();
			hj_update({action: "export_doc_data", password: pwd}).then(function(r){
				switch(+r["Status"]){
					case 1:
						export_docx_confirm(r["Values"]);
					break;

					// 密碼錯誤
					case 2:
						export_docx('<i class="far fa-info-circle"></i> '+_h("a-dl_doc-9"));
						alertify_input_shake();
						export_stats("password_incorrect");
					break;

					// 非 VIP
					case 3:
						vip_only(_h("a-dl"));
						export_stats("notice_upgrade");
					break;

					// 沒有日記
					case 4:
						msg('<i class="far fa-info-circle"></i> '+_h("a-dl_doc-10"));
					break;

					default:
						msg();
				}
			}).fail(function(){
				msg();
			}).always(function(){
				hj_loading(false);
			});
		}, _h("a-dl_doc-11"));
	}
	function export_docx_confirm(d){
		let images = d["posts"].reduce(function(n, p){
			return n+p["images"].length;
		}, 0);

		alertify_labels('<i class="fas fa-file-word"></i> '+_h("a-dl_doc-1"), _h("a-no"));
		alertify.confirm('<i class="far fa-file-word"></i> '+_h("a-dl_doc-0", {"$posts": d["posts"].length.toLocaleString(), "$images": images.toLocaleString()}), function(e){
			if(!e) return;

			// 須在使用者手勢內呼叫
			window.showSaveFilePicker({
				suggestedName: "Hearty_Journal_"+d["username"]+".docx",
				types: [{
					description: "Word",
					accept: {"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]}
				}]
			}).then(function(handle){
				return export_docx_run(d, handle);
			}).catch(function(err){
				// 取消存檔
				if(err && err.name=="AbortError") return;
				msg('<i class="far fa-info-circle"></i> '+_h("a-dl_doc-6"));
				export_stats("doc_failed");
			});
		});
	}
	async function export_docx_run(d, handle){
		let $b = $("body"),
			writable = null,
			$p = null,
			progress = function(html){
				html = '<i class="far fa-spinner fa-spin"></i> '+html;
				if($p && $p.parent().length>0){
					$p.html(html);
				}
				else{
					alertify.log(html, "", 0); // 常駐
					$p = $("#alertify-logs .alertify-log").last();
				}
			},
			unload = function(e){
				e.preventDefault();
				e.returnValue = "";
			};

		// 不用 hj_loading()：其 8秒逾時會在匯出途中移除；並清除先前 hj_loading() 排定的移除
		$b.clearQueue().addClass("loading");
		progress(_h("a-dl_doc-3"));
		window.addEventListener("beforeunload", unload);

		try{
			writable = await handle.createWritable();
			if(!("fflate" in window)) await hj_getScript_npm("fflate@0.8.2/umd/index.js");
			if(!("export_doc" in window)) await hj_getScript_gh({
				commit: "305bcf569af234914997ae63e4427eb8ae01620c",
				path: "js/export_doc.min.js"
			});

			let r = await export_doc(d, writable, function(done, total){
				progress(total>0 ? _h("a-dl_doc-2", {"$done": done.toLocaleString(), "$total": total.toLocaleString()}) : _h("a-dl_doc-3"));
			});

			msg('<i class="fas fa-folder-download"></i> '+_h("a-dl_doc-4")+(r.skipped>0 ? "<br>"+_h("a-dl_doc-5", {"$n": r.skipped.toLocaleString()}) : ""), _h("a-ok-1"));
			export_stats("docx_exported");

			ga_evt_push("Posts Exported", {
				event_category: "Posts",
				event_label: "Posts Exported (docx)",
				value: r.skipped
			});
		}
		catch(e){
			console.error(e);
			if(writable) writable.abort().catch(function(){});
			msg('<i class="far fa-info-circle"></i> '+_h("a-dl_doc-6"));
			export_stats("doc_failed");
		}
		finally{
			window.removeEventListener("beforeunload", unload);
			if($p) $p.get(0).click(); // 關閉進度
			$b.removeClass("loading");
		}
	}

	function export_stats(action){
		// forms.gle/ak6RutfWkMkGY6QJ7
		gform_post("1FAIpQLSfvmnOWgvwQfBjQIoJeH6EzxLUq62mwcRB7RQeODoWF1oC7Pg", {
			"emailAddress": getcookie("hearty_em"),
			"entry.1537657449": getcookie("hearty_u"),
			"entry.1470526977": getcookie("hearty_id"),
			"entry.1332414907": action || "",
			"entry.164417788": check_browser()+", "+check_OS(),
			"entry.657077146": today(8)
		});
	}

function vip_only(fn){
	alertify_labels(_h("a-vip_only-3"), '<i class="fas fa-star"></i> '+_h("a-vip_only-2"), true);
	alertify.confirm('<i class="fal fa-box-full"></i> '+(!fn ? _h("a-vip_only-0") : "「"+fn+"」")+_h("a-vip_only-1"), function(e){
		if(!e) hj_href("d?plans=1");
	});
}

function account_suspend(){
	alertify_labels('<i class="fas fa-check-circle"></i> '+_h("a-suspend-3"), _h("a-suspend-2"));
	alertify.confirm(_h("a-suspend-0")+'<br>(<a onclick="$(\'#alertify-ok\').trigger(\'click\');username_details()" href="javascript:void(0)">'+_h("a-suspend-1")+"</a>)", function(e){
		if(!e) account_suspend2(false);
	});
	hj_vibrate(80);
}
	function account_suspend2(v){
		if(!v){
			hcaptcha_init(function(){
				msg($("<div>", {id: "confirm"}).prop("outerHTML"), '<i class="fas fa-reply"></i> '+_h("i-back"));
				hcaptcha.render("confirm", {
					sitekey: "5ee3e1cd-7bc2-4623-bb21-df1295a52d98",
					size: "compact",
					callback: "account_suspend2"
				});
			});
			return;
		}

		// forms.gle/pG9hstUbCSYF64kP9
		// open_url will be blocked by Safari here (due to no user interaction detected)
		hj_href("//docs.google.com/forms/d/e/1FAIpQLSfVJkAOUtBdmwXo6Hc7GBoCRnXBk41PRdcutHnHfgkrBBL3oA/viewform?"+$.param({
			embedded: true,
			emailAddress: $("[data-email]").attr("data-email") || "",
			"entry.537131775": $(".hj_username").attr("title") || "",
			"entry.1511837812": check_browser()+", "+check_OS()
		}));
		$("#alertify-ok").trigger("click");
	}

function signin_history(){
	hj_update({action: "signin_history"}).then(function(r){
		if(r["Status"]!=1) return;

		let rows = r["Values"].map(function(d){
			let cc = d["country"]||"";
			if(cc.length==2){
				cc = $("<img>", {
					src: "//i0.wp.com/flagcdn.com/28x21/"+cc.toLowerCase()+".png",
					title: cc
				});
			}

			return $("<tr>").append(
				$("<td>", {text: _h("a-auth_log-1", {$device: d["device"]||"", $browser: d["browser"]||""})}),
				$("<td>", {text: d["ip"]||"", class: "desktop tablet"}),
				$("<td>", {html: cc, class: "desktop"}),
				$("<td>", {text: date_format(d["created"], true)})
			).prop("outerHTML");
		});

		alertify_labels('<i class="fas fa-reply"></i> '+_h("a-back"), '<i class="fas fa-shield-check"></i> '+_h("a-auth_log-2"), true);
		alertify.confirm("<h3>"+_h("a-auth_log-0")+"</h3>"+$("<table>", {class: "signin_history", html: rows.join("")}).prop("outerHTML"), function(e){
			if(!e) open_url(_h("a-auth_log-3"));
		});
	});
}

function voucher_redeem(voucher){
	voucher = voucher || getcookie("hearty_voucher") || "";

	alertify_labels('<i class="fas fa-check-circle"></i> '+_h("a-redeem-1"), _h("a-no"));
	alertify.prompt('<i class="far fa-gift-card"></i> '+_h("a-redeem-0"), function(e, voucher){
		if(!e) return;

		voucher = (voucher || "").trim();
		let v = voucher.toLowerCase();

		if(voucher.length<3){
			voucher_redeem(voucher);
			alertify_input_shake();
		}
		// 1. 老用戶限定優惠：序號同為用戶 ID
		else if(v==$(".hj_username").attr("title")){
			alertify_labels(_h("a-no"), '<i class="fas fa-arrow-alt-circle-right"></i> '+_h("a-voucher_vvip-2"), true);
			alertify.confirm('<img src="//i.hearty.app/i/vvip.png"><br><br><b>'+_h("a-voucher_vvip-0")+" ヽ(✿´･ヮ･)ﾉ♡</b><br>"+_h("a-voucher_vvip-1"), function(e){
				if(e) return;

				ga_evt_push("add_to_cart", {
					items: [{
						// GA 4
						item_id: 1,
						item_name: "VIP Premium",
						item_list_name: "pricing",
						item_variant: "Prepaid Plan",

						// GA 3
						id: 1,
						name: "VIP Premium",
						list_name: "pricing",
						variant: "Prepaid Plan",

						quantity: 12,
						price: 50
					}]
				});
				fb_evt_push("AddToCart", {
					content_type: "product",
					content_name: "VIP Premium",
					contents: [{
						id: 1,
						quantity: 12
					}],
					value: 600,
					num_items: 1,
					currency: "TWD"
				});

				hj_href("shop/vvip");
			});
		}
		// 2. EC 開頭，為療癒商城購物金序號
		else if(v.startsWith("ec-")){
			alertify_labels('<i class="fas fa-shopping-cart"></i> '+_h("a-voucher_ec-1"), _h("a-back"));
			alertify.confirm('<i class="fal fa-info-circle"></i> '+_h("a-voucher_ec-0"), function(e){
				if(e) location.href = "/life";
			});
		}
		// 3. 外部合作專案
		else if(/gift/i.test(voucher)){
			msg('<i class="far fa-gift-card"></i> '+_h("a-coupon_ok-0", {$coupon: voucher})+' <i class="far fa-check-circle"></i><br>'+_h("a-coupon_ok-1"), '<i class="fas fa-thumbs-up"></i> '+_h("a-ok-0"), function(){
				hj_href("d");
			});
			setcookie("hearty_voucher", "", -1);

			// forms.gle/peppaXua7R7cuEyb8
			gform_post("1FAIpQLSdUp4rnErJoEynfg60KgLrkF-7r5qzUh8rScViJ5CmGbwEoLg", {
				"entry.1182370364": getcookie("hearty_u"),
				"entry.847068538": getcookie("hearty_id"),
				"emailAddress": getcookie("hearty_em"),
				"entry.1353731030": voucher,
				"entry.1460125899": today(8),
				"entry.1757674378": check_browser()+", "+check_OS()
			});
			ga_evt_push("Voucher Redeem");
		}
		// 4. 標準序號
		else{
			hj_loading(true);

			$.ajax({
				url: "/gift/"+voucher,
				type: "POST",
				dataType: "json",
				data: {voucher: voucher}
			}).then(function(r){
				switch(+r["Status"]){
					case 0:
						msg('<i class="far fa-times-circle"></i> '+_h("a-voucher_invalid"), _h("a-retry"), function(){
							voucher_redeem();
							alertify_input_shake();
						});
					break;

					case 1:
						r = r["Values"]||[];
						msg('<i class="far fa-gift"></i> '+_h("a-voucher_ok", {
							$code: voucher,
							$days: r["dur"]||0,
							$exp: new Date(r["exp"]||"").toLocaleDateString()
						})+' <i class="far fa-check-circle"></i>', '<i class="fas fa-thumbs-up"></i> '+_h("a-ok-0"), function(){
							location.href = "/account?tab=1";
						});
						ga_evt_push("Voucher Redeem");
					break;

					case 3:
						msg('<i class="fal fa-info-circle"></i> '+_h("a-voucher_disqualified"), _h("a-ok-0"));
					break;

					default:
						msg();
				}
			}).fail(function(){
				msg();
			}).always(function(){
				hj_loading(false);
			});
		}
	}, voucher);

	alertify_input_custom({
		oninput: "this.value=this.value.toUpperCase()",
		placeholder: _h("a-redeem-0")
	}, {
		"ime-mode": "disabled",
		"letter-spacing": "2px"
	});
}

function hj_preview(o, url){
	let $d = $(".hj_preview"),
		$i = $d.find("iframe");

	if(o){
		url = url || "//go.hearty.me/hjview";
		if(url!=$i.attr("src")){
			$i.attr({src: url}).on("load", function(){
				$(this).removeClass("loading");
			});
		}
		else{
			$i.removeClass("loading");
		}
		$d.fadeIn();
		$("body").css({"overflow-y": "hidden", "touch-action": "none"});
	}
	else{
		$d.fadeOut();
		$("body").css({"overflow-y": "auto", "touch-action": "auto"});
		$i.off("load").addClass("loading");
	}
}
