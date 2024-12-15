"use strict";

function account_init(){
	let t = getUrlPara("tab"), 
		v = getUrlPara("vr"), 
		m = getUrlPara("msg"), 
		l = getUrlPara("line");
	if(!!t) nav_account(parseInt(t), true);
	if(!!m) msg('<i class="fal fa-info-circle"></i> '+decodeURIComponent(m));

	if(!!getUrlPara("ev")){
		if($("#email_resend[data-timeout='0']:visible").length==1) email_editing();
	}
	else if(!!getUrlPara("pc")){
		password_editing();
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
	account_usage();
	language_editing();

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

	// hide disabled fonts on iOS
	[2,16,23,24,25,26,27,28,29,30,31].forEach(function(i){
		$("#post_font option[value='"+i+"']").remove();
	});

	document.title = _h("a-title")+" | 💝 Hearty Journal 溫度日記";
}

function signin_ask(f){
	let a = getcookie("hearty_account") || "";
		a = !a ? "" : "&account="+a;
	let u = "?r="+location.href.split("#")[0].split("?")[0].replace(location.origin, "")+a+"#signin";
	if(f){
		hj_href(u);
	}
	else{
		alertify.set({labels: {ok: _h("a-no"), cancel: '<i class="fas fa-door-open"></i> '+_h("a-signin-0")}, buttonReverse: false});
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

function account_usage(){
	return hj_update({action: "account_usage"}).then(function(r){
		let $u = $(".usage");
		if(r["Status"]==1){
			let v = r["Values"], 
				t = " "+_h("a-usage", {
					$num: numberWithCommas(v["num"]||0), 
					$chars: numberWithCommas(v["chars"]||0)
				});
			$u.text(t).attr({title: t});
		}
		else{
			$u.remove();
		}
	});
}

function birthday_init(){
	let $bd = $("#birthday");

	if(check_OS("iOS") || check_browser("Safari")){
		if(/zh/i.test(hj_lang())){
			hj_getScript_gh({
				path: "js/safari.datepicker.tw.min.js", 
				// commit: 40927
			}, function(){
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
			$(this).datepicker("show").select();
		});
	}

	function birthday_editing(bday){
		if(bday==null) return;

		alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> '+_h("a-ok-3"), cancel: _h("a-no")}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-birthday-cake"></i> '+_h("a-bday_ask-0", {$bday: bday.replace(/-/g,"/")}), function(e){
			if(e){
				hj_update({
					action: "profile_update", 
					field: "birthday", 
					data: bday
				}).then(function(r){
					switch(r["Status"]){
						case 1:
							alertify.success('<i class="far fa-birthday-cake"></i> '+_h("a-bday_ask-2"));

							ga_evt_push("Birthday", {
								event_category: "Profile Update", 
								event_label: "Birthday"
							});
						break;

						default:
							msg();
						break;
					}
				}).fail(function(){
					msg();
				});
			}
			birthday_age();
		});
	}
	function birthday_age(){
		let age = parseInt(((Date.now()-new Date($("#birthday").val()))/(31557600000))) || 0, 
			age_restricted = age>0 && age<18, 
			$m = $(".menu [data-btn='home'],.menu [data-btn='feed']");

		$("#age").text(_h("a-age", {$age: age}));

		// 年齡限制
		if(age_restricted) $m.hide();
		else $m.show();
		setcookie("hearty_children", age_restricted ? 1 : 0, 7);

		return age;
	}

function password_editing(txt){
	if(!email_verified_required(_h("a-pwd_edit"))) return false;

	alertify.set({labels: {ok: '<i class="fas fa-lock"></i> '+_h("a-pwd_apply-0"), cancel: _h("a-no")}, buttonReverse: false});
	alertify.prompt('<i class="far fa-key"></i> '+(txt || _h("a-pwd_enter")), function(e, pwd){
		if(e){
			if(pwd.length<6 || pwd.length>20){
				password_editing(_h("a-pwd_invalid"));
				alertify_input_shake();
				return false;
			}

			alertify.set({labels: {ok: '<i class="fas fa-lock"></i> '+_h("a-pwd_apply-1"), cancel: _h("a-no")}, buttonReverse: false});
			alertify.prompt('<i class="far fa-key"></i> '+_h("a-pwd_confirm"), function(e, pwd2){
				if(e){
					if(pwd==pwd2){
						hj_update({
							action: "profile_update", 
							field: "password", 
							data: pwd
						}).then(function(r){
							switch(r["Status"]){
								case 1:
									msg('<i class="fas fa-check-circle"></i> '+_h("a-pwd_ok-0")+"<br><small>"+_h("a-pwd_ok-1")+"</small>");

									$(".account_btn[data-password]").attr({
										"data-password": 1, 
										title: _h("a-pwd_edited")
									});

									ga_evt_push("Password", {
										event_category: "Profile Update", 
										event_label: "Password"
									});
								break;

								default:
									msg();
								break;
							}
						}).fail(function(){
							msg();
						});
					}
					else{
						password_editing(_h("a-pwd_mismatch"));
						alertify_input_shake();
					}
				}
			}, "");

			alertify_input_custom({
				type: "password", 
				placeholder: _h("a-pwd_confirm"), 
				autocomplete: "new-password", // 記憶密碼
				minlength: 6, 
				maxlength: 20
			}, {
				"letter-spacing": "2px"
			});
		}
	}, "");

	alertify_input_custom({
		type: "password", 
		placeholder: _h("a-pwd_format"), 
		autocomplete: "new-password", 
		minlength: 6, 
		maxlength: 20

		// Password Autocomplete Off: stackoverflow.com/a/30344707
		// autocomplete: "off", 
		// onclick: "$(this).prop('readonly', false)", 
		// readonly: ""
	}, {
		"letter-spacing": "2px"
	});
}

// 大頭貼上傳
function uploader_init(){
	$("#profile_uploader").on("input", function(evt){
		let file = evt.target.files[0];
		if(file){
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
					$("#profile_uploader").val(""); // 清除已選檔，以便可後續可重選
				}, 
				success: function(r){
					if(r["status"]==1){ // 1: 成功; 0: 錯誤
						let img = "//i0.wp.com/s3.ap-northeast-1.wasabisys.com/hearty-users/"+r["basenames"][0];
						$("#profile_image img").attr({src: img});
						$(".profile_image div").css({"background-image": 'url("'+img+'")'});

						picture_rotate();
						alertify.success('<i class="far fa-address-card"></i> '+_h("a-avatar-3"));

						/* Prefetch Image from CDNs
						["", "?o=1"].forEach(function(v){
							$("<img>", {src: img+v});
						});
						*/

						ga_evt_push("Avatar", {
							event_category: "Profile Update", 
							event_label: "Avatar"
						});
					}
					else{
						msg('<i class="far fa-times"></i> '+_h("a-avatar_err-"+(data["err"]||0)));
					}
				}, 
				error: function (xhr, status, err){
					msg('<i class="far fa-info-circle"></i> '+_h("a-avatar_err-0")+"<br><small>"+JSON.stringify(status)+"："+JSON.stringify(err)+"</small>");
				}
			});
		}
	});
}

/* blob */
function uploader_handle(f){
	hj_loading();

	let $i = $("#profile_image img"), 
		[file] = f, 
		p1 = uploader_createImageFromFile($i.get(0), file), 
		p2 = uploader_getFileBase64Encode(file);

	Promise.all([p1, p2]).then(function(r){
		let [img, b64] = r;
		$i.attr({src: b64});

		hj_loading(false);
	});
}
	function uploader_createImageFromFile(img, file){
		return new Promise((resolve, reject) => {    
			img.src = URL.createObjectURL(file);
			img.onload = () => {
				URL.revokeObjectURL(img.src);
				resolve(img);
			};
			img.onerror = () => reject("Failure to load image.");
		});
	}
	function uploader_getFileBase64Encode(blob){
		return new Promise((resolve, reject) => {
			let reader = new FileReader();

			reader.readAsDataURL(blob);
			reader.onload = () => resolve(reader.result);
			reader.onerror = error => reject(error);
		});
	}

// 上傳
function hj_picture(ask){
	if(ask){
		alertify.set({labels: {ok: _h("a-no"), cancel: '<i class="fas fa-arrow-circle-up"></i> '+_h("a-upload")}, buttonReverse: true});
		alertify.confirm('<i class="fal fa-image"></i> '+_h("a-avatar-0"), function(e){
			if(!e) hj_picture();
		});
		return;
	}
	$("#profile_uploader").get(0).click();
}
	function hj_picture_onselect(f){
		if(!f || !f[0]) return;

		let ext = (f[0]["name"]||"").toLowerCase().split(".").slice(-1).toString() || "jpg";
		if(/jpg|jpeg|png|gif|bmp|webp|avif|heic|heif/i.test(ext)){
			uploader_handle(f); // blob preview
		}
		else{
			alertify.set({labels: {ok: _h("a-no"), cancel: '<i class="fas fa-chevron-square-up"></i> '+_h("a-avatar-2")}, buttonReverse: true});
			alertify.confirm('<i class="fal fa-image-polaroid"></i> '+_h("a-avatar-1", {$ext: ext.toUpperCase()}), function(e){
				if(!e) hj_picture();
			});
		}
	}

function picture_rotate(){
	let $i = $("#profile_image img");

	alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> '+_h("a-ok-1"), cancel: '<i class="fas fa-undo fa-flip-horizontal"></i> '+_h("a-rotate")}, buttonReverse: false});
	alertify.confirm($i.prop("outerHTML"), function(e){
		if(!e){
			let i = ($i.attr("src")||"").split("#");

			i[1] = i[1] || 0; i[1]++;
			i = i[1]==4 ? i[0] : i.join("#");

			$i.add(".alertify img").attr({src: i});
			$(".profile_image div").css("background-image", "url("+i+")");

			hj_update({
				action: "profile_update", 
				field: "profile_image", 
				data: i.split("/").pop()||""
			});

			picture_rotate();
			ga_evt_push("Rotate Picture");
		}
	});
}

function nickname_editing(changed){
	let $n = $("#nickname"), 
		$btn = $(".account_btn[data-nickname]");

	if(changed){
		$btn.fadeIn();
	}
	else{
		let n = $n.val().trim();
		hj_update({
			action: "profile_update", 
			field: "nickname", 
			data: $n.val().trim()
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					alertify.success('<i class="far fa-user"></i> '+_h("a-nickname_edited", {$n: n}));
					$n.attr({placeholder: n});
					$btn.fadeOut();

					ga_evt_push("Nickname", {
						event_category: "Profile Update", 
						event_label: "Nickname"
					});
				break;

				case 2:
					signin_required();
				break;

				default:
					msg();
				break;
			}
		}).fail(function(){
			msg();
		});
	}
}

function email_editing(email){
	email = (email || $("[data-email]").attr("data-email") || "").toLowerCase();
	alertify.set({labels: {ok: '<i class="fas fa-chevron-right"></i> '+_h("a-next"), cancel: _h("a-no")}, buttonReverse: false});
	alertify.prompt('<i class="far fa-envelope"></i> '+_h("a-email_new"), function(e, email_new){
		if(e){
			email_new = (email_new || "").trim().toLowerCase();
			if(email==email_new){
				if($("#email_resend[data-timeout='0']:visible").length==1)
					email_verification(false);
			}
			else if(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,12}$/.test(email_new) && 
				!(/@(hearty(\.(me|app|gift)|mail\.com)|miss\.com\.tw|hj\.rs|ht\.mk|(|chen)nien\.(co(m|)|org))/).test(email_new)
				){

				alertify.set({labels: {ok: _h("a-ok-1"), cancel: _h("a-no")}, buttonReverse: false});
				alertify.confirm(_h("a-email_confirm", {$email: email_new}), function(e){
					if(e){
						hj_update({
							action: "profile_update", 
							field: "email", 
							data: email_new
						}).then(function(r){
							switch(r["Status"]){
								case 1:
									email_verification();
									$("[data-email-verify]").attr("data-email-verify", 0)
										.find("[data-email]").attr("data-email", email_new);

									ga_evt_push("Email", {
										event_category: "Profile Update", 
										event_label: "Email"
									});
								break;

								case 2:
									signin_required();
								break;

								default:
									msg();
								break;
							}
						}).fail(function(){
							msg();
						});
					}
				});
			}
			else{
				msg('<i class="fas fa-times"></i> '+_h("a-email_invalid"));
				email_editing(email_new);
			}
		}
	}, email);

	alertify_input_custom({
		type: "email", 
		placeholder: email || "eg. nien@hearty.me", 
		maxlength: 64
	});
}
	function email_verified(){
		return $("[data-email-verify='1']").length>0;
	}
	function email_verified_required(fn){
		if(email_verified()){
			return true;
		}
		else{
			msg('<i class="far fa-envelope-open"></i> '+_h("a-email_verify-0")+(fn || _h("a-email_verify-1")), _h("a-email_verify-2"), function(){
				email_editing();
			});
			return false;
		}
	}

	function email_verification(ask){
		if(ask){
			alertify.set({labels: {ok: _h("a-ok-2"), cancel: _h("a-no")}, buttonReverse: false});
			alertify.confirm('<i class="far fa-envelope"></i> '+_h("a-email_send"), function(e){
				if(e) email_verification(false);
			});
		}
		else{
			let $v = $("[data-email-verify]");
			hj_update({action: "email_verification"}).then(function(r){
				switch(r["Status"]){
					case 1:
						hj_timer($v.find("#email_resend"), true);
						$v.attr("data-email-verify", 0);

						let u = r["Values"]["email_login_url"];
						if(u.length>0){
						    alertify.set({labels: {ok: _h("a-ok-0"), cancel: _h("a-no")}, buttonReverse: !1});
						    alertify.confirm(_h("a-email_sent-0", {$isp: u[0]}), function(e){
								if(e){
									if(/iOS|Android/i.test(check_hjapp())) hj_href("wv?o="+u[1]);
									else open_url("//"+u[1]);
								}
						    });
						}
						// 其他的
						else{
							msg('<i class="fas fa-mailbox"></i> '+_h("a-email_sent-1"), _h("a-ok-0"));
						}

						ga_evt_push("Email Sent", {
							event_category: "Profile Update", 
							event_label: "Email Sent"
						});
					break;

					case 2:
						signin_required();
					break;

					case 3:
					    msg('<i class="far fa-mobile"></i> '+_h("a-email_verified"));
					    $v.attr("data-email-verify", 1);
					break;

					default:
						msg();
					break;
				}
			}).fail(function(){
				msg();
			});
		}
	}

function gender_editing(gender){
	hj_update({
		action: "profile_update", 
		field: "gender", 
		data: gender
	}).then(function(r){
		if(r["Status"]==1){
			alertify.success('<i class="far fa-'+(gender=="1" ? "mars" : "venus")+'"></i> '+_h("a-gender_edited"));

			ga_evt_push("Gender", {
				event_category: "Profile Update", 
				event_label: "Gender"
			});
		}
	}).fail(function(){
		msg();
	});
}

function newsletter(optin){
	hj_update({
		action: "profile_update", 
		field: "newsletter", 
		data: optin
	}).then(function(r){
		if(r["Status"]==1){
			alertify.success('<i class="fal fa-mailbox"></i> '+_h("a-newsletter_edited"));

			ga_evt_push("Newsletter", {
				event_category: "Profile Update", 
				event_label: "Newsletter"
			});
		}	
	}).fail(function(){
		msg();
	});
}

function phone_verification($e){
	$e = $e.find("[data-phone-no]");
	hj_href("p/phone.php?cc="+($e.attr("data-phone-cc")||"")+"&no="+($e.attr("data-phone-no")||""));
}

function hj_timer($e, start, dur){
	if(start){
		hj_timer($e, false);
		$.wait(1000).then(function(){
			dur = dur || 60;
			$e.attr("data-timeout", dur);

			(function countdown(){
				if(Number($e.attr("data-timeout"))>0){
					dur--;
					let t = dur>0 ? 
						// parseInt(dur/60, 10).toString().padStart(2, "0")+":"+
						parseInt(dur%60, 10).toString().padStart(2, "0") : "";

					if(dur>0) $.wait(1000).then(countdown);
					$e.attr("data-timeout", dur).text(t);
				}
			})();
		});
	}
	else{
		$e.attr("data-timeout", 0).text("");
	}
}

function support_pincode(reissue){
	hj_update({
		action: "support_pincode", 
		reissue: +!(reissue==null)
	}).then(function(r){
		if(r["Status"]==1){
			let pin = r["Values"]["pincode"];

			alertify.set({labels: {ok: '<i class="fas fa-arrow-alt-to-bottom"></i> '+_h("a-pin-1"), cancel: '<i class="fas fa-reply"></i> '+_h("a-back")}, buttonReverse: false});
			alertify.confirm('<i class="far fa-comment-dots"></i> '+_h("a-pin-0", {$pin: pin}), function(e){
				if(e){
					$("<a>", {
						href: "data:text/plain;charset=utf-8,"+encodeURIComponent(pin), 
						download: "Hearty-PINcode.txt"
					}).get(0).click();
				}
				let $s = $("#Smallchat iframe");
				if($s.length>0 && !is_touch_device()) $s.contents().find(".Launcher").click();
			});
		}
	}).fail(function(){
		msg();
	});
}

function font_info(x){
	if(!x){
		msg('<i class="fal fa-file-certificate"></i> '+_h("a-font-2"));
	}
	else{
		alertify.set({labels: {ok: '<i class="fas fa-copyright"></i> '+_h("a-font-3"), cancel: _h("a-ok-0")}, buttonReverse: true});
		alertify.confirm('<img src="//i.hearty.app/'+_h("a-font-1")+'" title="'+_h("a-font-0")+'" alt="'+_h("a-font-0")+'">', function(e){
			if(e) font_info(false);
		});	
	}
}

function post_font_change(font_id, font_name){
	post_font(font_id);
	hj_update({
		action: "profile_update", 
		field: "post_font", 
		data: font_id
	}).then(function(){
		alertify.success('<i class="far fa-font-case"> '+_h("a-font_change", {$font: font_name}));

		ga_evt_push("Post_Font", {
			event_category: "Profile Update", 
			event_label: "Post_Font"
		});
	});
}

function language_editing(lang, title){
	// 將帳號內的設定同步至 cookie
	if(!lang){
		let lang = parseInt($("#language").val())||1;
	}
	else{
		msg('<i class="far fa-language" style="font-size:26px"></i> '+_h("i-lang", {$lang: title}));

		hj_update({
			action: "profile_update", 
			field: "language", 
			data: lang
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					ga_evt_push("Language", {
						event_category: "Profile Update", 
						event_label: "Language"
					});
					location.reload(true);
				break;

				case 2:
					signin_required();
				break;

				default:
					msg();
				break;
			}
		}).fail(function(){
			msg();
		});
	}
	setcookie("hearty_language", lang, 730);
}

function timezone_editing(tz){
	hj_update({
		action: "profile_update", 
		field: "timezone", 
		data: tz
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				alertify.success('<i class="far fa-clock"></i> '+_h("a-timezone_edited", {$tz: tz}));

				ga_evt_push("Timezone", {
					event_category: "Profile Update", 
					event_label: "Timezone"
				});
			break;

			case 2:
				signin_required();
			break;

			default:
				msg();
			break;
		}
	}).fail(function(){
		msg();
	});
}

function username_details(){
	let username = $(".hj_username").attr("title") || "";
	alertify.set({labels: {ok: '<i class="fas fa-sync"></i> '+_h("a-id_edit"), cancel: '<i class="fas fa-hand-peace"></i> '+_h("a-back")}, buttonReverse: true});
	alertify.confirm('<i class="fal fa-user"></i> '+_h("a-id")+"<u>"+username+'</u> <i class="far fa-globe-asia"></i><br>('+_h("a-id_public")+")", function(e){
		if(e) username_editing(username);
	});
}
	function username_validate(username){
		return (username||"").toLowerCase().replace(/[\W_]+/g,"");
	}
	function username_editing(username, dialog){
		if(!email_verified_required(_h("a-id_edit"))) return false;

		alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> '+_h("a-id_edit"), cancel: ""+_h("a-no")}, buttonReverse: true});
		alertify.prompt('<i class="fal fa-user"></i> '+_h("a-id_new")+'<br><i class="fal fa-info-circle"></i> '+(dialog || _h("a-id_format")), function(e, new_username){
			if(e){
				new_username = (new_username || "").trim().toLowerCase();
				if(username==new_username){
					username_editing(username, _h("a-id_same"));
					alertify_input_shake(); return;
				}
				else if(new_username.length<4 || !isNaN(new_username) || !/^[a-z0-9]*$/.test(new_username)){
					username_editing(username, _h("a-id_invalid"));
					alertify_input_shake(); return;
				}

				hj_update({
					action: "username_editing", 
					username: new_username
				}).then(function(r){
					switch(r["Status"]){
						case 1:
							msg('<i class="fal fa-check-circle"></i> '+_h("a-id_edited", {$id: new_username}), '<i class="fas fa-door-open"></i> '+_h("a-id_signout"), signout);
							setcookie("hearty_account", new_username, 90);

							// forms.gle/bG1EnEKeYyqv3BR88
							gform_post("1FAIpQLScMUCYu17vjPovyr8Ywr9wbgfVxZ7E5FPYvqdpbPdlEw7TMVQ", {
								"entry.1182370364": getcookie("hearty_u"), 
								"entry.847068538": getcookie("hearty_id"), 
								"emailAddress": getcookie("hearty_em"), 
								"entry.1353731030": new_username, 
								"entry.1460125899": today(8), 
								"entry.1757674378": (navigator.userAgent || "")
							});

							ga_evt_push("Username", {
								event_category: "Profile Update", 
								event_label: "Username"
							});
						break;

						default:
							username_editing(username, _h("a-id_taken", {$id: new_username}));
							alertify_input_shake();
							return;
						break;
					}
				}).fail(function(){
					msg();
				});
			}
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
	let $e = $(".account");
	if($e.length>0){
		$e.get(0).scroll({
			left: $e.children().eq(p||0).get(0).offsetLeft, // $e.width()*(p||0)
			behavior: !no_animation ? "smooth" : "instant" // CSS scroll-behavior
		});
	}
	$(".nav_account li").removeAttr("data-active").eq(p||0).attr("data-active", "");
}

function export_txt(txt){
	hj_loading();
	account_status().then(function(r){
		if(r["Values"]["vip"]==1){
			if(is_touch_device()){
				msg('<i class="far fa-desktop"></i> '+_h("a-dl_pc"));
				hj_loading(false);
				export_txt_stats("use_pc_instead");
				return false;
			}

			alertify.set({labels: {ok: '<i class="fas fa-lock"></i> '+_h("a-dl_pwd-2"), cancel: _h("a-no")}, buttonReverse: false});
			alertify.prompt((txt || '<i class="far fa-briefcase"></i> '+_h("a-dl_pwd-0")), function(e, pwd){
				if(e){
					if(pwd.length<6 || pwd.length>20){
						export_txt('<i class="far fa-info-circle"></i> '+_h("a-dl_pwd-1"));
						alertify_input_shake();
						export_txt_stats("password_malformatted");
						return false;
					}

					$("<form>", {
						method: "POST", 
						target: "_self", 
						action: "/update", 
						enctype: "application/x-www-form-urlencoded", 
						html: $("<input>", {
							type: "hidden", 
							name: "action", 
							value: "export_txt"
						}).add(
							$("<input>", {
								type: "hidden", 
								name: "password", 
								value: pwd
							})
						)
					}).appendTo("body").submit();

					alertify.success('<i class="far fa-arrow-to-bottom"></i> '+_h("a-dl_pwd-3"));

					$.wait(2000).then(function(){
						export_txt_stats("txt_exported");

						ga_evt_push("Posts Exported", {
							event_category: "Posts", 
							event_label: "Posts Exported"
						});

						msg('<i class="fab fa-wpforms"></i> '+_h("a-dl_pwd-4"), _h("a-ok-1"));
					});
				}

				$.wait(1000).then(function(){
					hj_loading(false);
				});
			}, "");

			alertify_input_custom({
				type: "password", 
				placeholder: _h("a-dl_pwd-1"), 
				autocomplete: "new-password", // new-password
				minlength: 6, 
				maxlength: 20
			}, {
				"letter-spacing": "2px"
			});
		}
		else{
			vip_only(_h("a-dl"));
			export_txt_stats("notice_upgrade");
		}
	}).fail(function(){
		msg();
	}).always(function(){
		hj_loading(false);
	});
}
	function export_txt_stats(action){
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
	alertify.set({labels: {ok: _h("a-vip_only-3"), cancel: '<i class="fas fa-star"></i> '+_h("a-vip_only-2")}, buttonReverse: true});
	alertify.confirm('<i class="fal fa-box-full"></i> '+(!fn ? _h("a-vip_only-0") : "「"+fn+"」")+_h("a-vip_only-1"), function(e){
		if(!e) hj_href("d?plans=1");
	});
}

function account_suspend(){
	alertify.set({labels: {ok: _h("a-no"), cancel: '<i class="fas fa-ban"></i> '+_h("a-suspend-2")}, buttonReverse: false});
	alertify.confirm('<i class="far fa-exclamation-triangle"></i> '+_h("a-suspend-0")+'<br>(<a onclick="$(\'#alertify-ok\').click();username_details()" href="javascript:void(0)">'+_h("a-suspend-1")+"</a>)", function(e){
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
		}
		else{
			// forms.gle/pG9hstUbCSYF64kP9
			// open_url will be blocked by Safari here (due to no user interaction detected)
			hj_href("//docs.google.com/forms/d/e/1FAIpQLSfVJkAOUtBdmwXo6Hc7GBoCRnXBk41PRdcutHnHfgkrBBL3oA/viewform?embedded=true&emailAddress="+$("[data-email]").attr("data-email")+"&entry.537131775="+$(".hj_username").attr("title")+"&entry.1511837812="+check_browser()+", "+check_OS());

			$("#alertify-ok").click();
		}
	}

function signin_history(){
	hj_update({action: "signin_history"}).then(function(r){
		if(r["Status"]==1){
			let $tr = r["Values"].map(function(d){
				let cc = d["country"]||"";
				if(cc.length==2) 
					cc = $("<img>", {
						src: "//cdn.statically.io/img/flagcdn.com/28x21/"+cc.toLowerCase()+".png", 
						title: cc
					});

				return $("<tr>", {
						html: $("<td>", {text: 
									_h("a-auth_log-1", {
										$device: d["device"]||"", 
										$browser: d["browser"]||""
								})}).add(
									$("<td>", {text: d["ip"]||"", class: "desktop tablet"})
								).add(
									$("<td>", {html: cc, class: "desktop"})
								).add(
									$("<td>", {text: date_format(d["created"], true)})
								)
					}).prop("outerHTML");
			});

			alertify.set({labels: {ok: '<i class="fas fa-reply"></i> '+_h("a-back"), cancel: '<i class="fas fa-shield-check"></i> '+_h("a-auth_log-2")}, buttonReverse: true});
			alertify.confirm(
				"<h3>"+_h("a-auth_log-0")+"</h3>"+
				$("<table>", {
					class: "signin_history", 
					html: $tr.join("")
				}).prop("outerHTML"), function(e){
				if(!e) open_url(_h("a-auth_log-3"));
			});
		}
	});
}

function voucher_redeem(voucher){
	voucher = voucher || getcookie("hearty_voucher") || "";
	let evt = "Voucher Redeem";	

	alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> '+_h("a-redeem-1"), cancel: _h("a-no")}, buttonReverse: false});
	alertify.prompt('<i class="far fa-gift-card"></i> '+_h("a-redeem-0"), function(e, voucher){
		if(e){
			voucher = (voucher || "").trim();
			if(voucher.length<4){
				voucher_redeem(voucher); alertify_input_shake();
			}
			// 老用戶限定優惠：序號同為用戶 ID
			else if(voucher.toLowerCase()==$(".hj_username").attr("title")||""){
				alertify.set({labels: {ok: _h("a-no"), cancel: '<i class="fas fa-arrow-alt-circle-right"></i> '+_h("a-voucher_vvip-2")}, buttonReverse: true});
				alertify.confirm('<img src="//i.hearty.app/i/vvip.png"><br><br><b>'+_h("a-voucher_vvip-0")+" ヽ(✿´･ヮ･)ﾉ♡</b><br>"+_h("a-voucher_vvip-1"), function(e){
					if(!e){
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

						hj_href("//bit.ly/3Jbdfrx"); // hj_href("shop/vvip");
					}
				});
			}
			// 外部合作專案
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
				ga_evt_push(evt);
			}
			else{
				$.ajax({
					url: "/gift/"+voucher, 
					type: "POST", 
					dataType: "json", 
					data: {
						voucher: voucher
					}, 
					async: true
				}).then(function(r){
					switch(r["Status"]){
						case 0:
							msg('<i class="far fa-times-circle"></i> '+_h("a-voucher_invalid"), _h("a-retry"), function(){
								voucher_redeem(); alertify_input_shake();
							});
						break;

						case 1:
							let v = r["Values"]||"";

							msg('<i class="far fa-gift"></i> '+_h("a-voucher_ok", {
								$code: voucher, 
								$days: v["dur"]||0, 
								$exp: new Date(v["exp"]||"").toLocaleDateString()
							})+' <i class="far fa-check-circle"></i>', '<i class="fas fa-thumbs-up"></i> '+_h("a-ok-0"), function(){

								location.href = location.origin+"/account?tab=1";
								// location.reload();
							});
							ga_evt_push(evt);
						break;

						case 3:
							msg('<i class="fal fa-info-circle"></i> '+_h("a-voucher_disqualified"), _h("a-ok-0"));
						break;

						default:
							msg();
						break;
					}
				}).fail(function(){
					msg();
				});
			}
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
	let $b = $("body"), 
		$d = $(".hj_preview"), 
		$i = $d.find("iframe");

	if(o){
		url = url || "//go.hearty.me/hjview";
		if(!$i.attr("src") || url!=$i.attr("src")){
			$i.attr({src: url}).on("load", function(){
				$(this).removeClass("loading");
			});
		}
		else{
			$i.removeClass("loading");
		}
		$d.fadeIn();
		$b.css({"overflow-y": "hidden", "touch-action": "none"});
	}
	else{
		$d.fadeOut();
		$b.css({"overflow-y": "auto", "touch-action": "auto"});
		$i.off("load").addClass("loading");
	}
}
