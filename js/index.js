"use strict";

home_init();

function home_init(){
	$(function(){
		browser_check();
		os_targeting();
		language_switch("init");
		hj_localize_cn();
		document.title = _h("i-title-1")+" | 💝 Hearty Journal 溫度日記";

		// PWA
		if(typeof a2hs_init=="function") a2hs_init();

		// 帳號記憶
		var account = getcookie("hearty_account") || getUrlPara("account") || "";
		if(!!account){
			$("#account").val(account); $(".toggler").removeClass("off");
			$(".toggle_signup").css({color: "#fff", background: "#555"});
		}
		else{
			box("signup");
		}

		// Email 認證 & 重設密碼
		var status, 
			verified = getUrlPara("verified"), 
			reset = getUrlPara("reset"), 
			app = getUrlPara("app"), 
			ref = getUrlPara("ref"), 
			err = getUrlPara("err"), 
			song = getUrlPara("song");

		// 來自 Email 驗證所跳轉
		if(!!verified){
			switch(parseInt(verified)){
				case 1:
					status = _h("i-email-0");
				break;

			    case 2:
			    	status = _h("i-email-1");
				break;

			    case 3:
			    	status = _h("i-email-2"); shake($(".authform"));
				break;

				default:
					status = _h("i-email-3"); shake($(".authform"));
				break;
			}
			authbox(true);
			toast(status);
		}
		// 來自重設密碼所跳轉
		else if(!!reset){
			if(reset=="1"){
					authbox(true);
					toast(_h("i-reset-1"));
					$("#account").val(getUrlPara("account") || "");
					$("#password").val(getUrlPara("token") || "");
					signin("profile");
			}
			else{
				toast(_h("i-reset-2"));
				shake($(".authform"));
			} 
			history.replaceState({}, document.title, location.pathname);
		}
		// 來自推薦連結所跳轉
		else if(!!ref && !app){
			authbox(true);
			box("signup");
			toast(_h("i-ref-0", {$user: getUrlPara("ref")}));
		}
		// 錯誤頁面
		else if(!!err){
			msg(_h("i-404"));
		}
		// 溫度主題曲
		else if(!!song){
			soundtrack(!0);
		}

		// 重置密碼 Cookie (3分鐘)
		var revoke = Number(getcookie("hearty_reset_suspended"));
		if(!!revoke && revoke>timestamping()) reset_suspended(!0, revoke);

		// Email 認證 Cookie (3分鐘)
			revoke = Number(getcookie("hearty_email_verification_suspended"));
		if(!!revoke && revoke>timestamping()) email_verification_suspended(!0, revoke);

		if(/(sign(in|up)|apply)/.test(location.hash.substring(1))){
			$("body").css("overflow-y", "hidden");
			authbox(true);
			// box("signin");
		}

		$(".chat_btn").on("click", chat_notice);

		// 12月自動換聖誕版 Logo (檔名加 .xmas)
		if(new Date().getMonth()==11){
			$("img[data-xmas]").each(function(){
				let img = ($(this).attr("src")||"").split('.'), 
					ext = img.pop();
				img.push("xmas", ext);
				$(this).attr({src: img.join(".")});
			});
		}

		// 防堵中共網軍
		if(!!getcookie("hearty_ccp_sucks")) top.location.href = "//supr.link/Ih6o1";
	});
}

function os_targeting(){
	var os = check_hjapp();
	// 刪除非 iOS 鈕 (Apple 政策)、在 App 上隱藏所有下載鈕
	if(!!os) $(".non-"+os+"app,[data-os]").remove();
	// 桌面捷徑、App 上隱藏所有下載鈕
	else if(check_hjpwa()) $("[data-os='Windows'],[data-os='Macintosh']").remove();

	// 依照各平台顯示對應下載鈕
	os = check_OS(); $("[data-os]").hide();
	if(os=="Macintosh")
		$("[data-os='"+(["Chrome","Edg"].indexOf(check_browser())>=0 ? os : "default")+"']").show();
	else
		$("[data-os='"+(/iOS|Android|Windows/.test(os) ? os : "default")+"']").show();
}

function browser_check(check){
	if(check){
		if(!navigator.cookieEnabled){
			alertify.set({labels: {ok: '<i class="fas fa-question-circle"></i> '+_h("i-cookie-1"), cancel: _h("i-no-0")}, buttonReverse: !1});
			alertify.confirm('<i class="fab fa-chrome"></i> '+_h("i-cookie-0"), function(e){
				if(e){
					var u = "support.google.com/chrome/answer/95647";
					switch(check_browser()){
						case "Safari":
							u = "support.apple.com/"+(check_OS("iOS") ? "HT201265" : "guide/safari/sfri11471");
						break;

						case "Firefox":
							u = "mzl.la/1BAQKUb";
						break;

						case "OPR":
						case "Opera":
							u = "help.opera.com/web-preferences/#cookies";
						break;
					}
					open_url("//"+u);
				}
			});
			return true;
		}

		hj_ip().then(function(d){
			var cc = d.loc||"", 
				$cookies = $(".cookies");
			$("body").attr({
				"data-ip": d.ip||"", 
				"data-cc": cc
			});

			// Cookie 同意
			if(!getcookie("hearty_cookies") && [
				"BE","BG","CZ","DK","DE","EE","IE","EL","ES","FR","HR","IT","CY","LV","LT","LU","HU","MT","NL","AT","PL","PT","RO","SI","SK","FI","SE"
			].indexOf(cc)>=0){
				$cookies.removeClass("hide").on("click", function(){
					$(this).remove();
				});
				setcookie("hearty_cookies", 1, 365);
			}
			else{
				$cookies.remove();
			}

			if(cc=="CN"){
				msg('<i class="fal fa-info-circle"></i> 在中国 🇨🇳，需「<i class="fal fa-swimming-pool"></i> 用魔法」才能使用完整功能');
			}
		});

		if(window.attachEvent && !window.addEventListener) alert(_h("i-browser-0"));
		else if(!("values" in Object)) alert(_h("i-browser-0"));
		else if(["Edge","Trident","MSIE"].indexOf(check_browser())>-1) alert(_h("i-browser-1"));
		else return true;
		return false;
	}
	else{
		leave_InAppBrowser();
		if(!browser_check(true))
			window.open(check_OS("Android") ? "market://details?id=com.android.chrome" : "//google.c"+(hj_lang_zhcn()?"n":"om")+"/chrome", "_blank");
	}
}

/* iPad 背景相容
function background_ipad(){
	if(/iPad/.test((navigator.userAgent||"")))
		$(".home_cover").css({"background-attachment": "scroll"});
}
*/

// 登入
function signin(para){
	var $f = $(".authform"), 
		$s = $("#status"), 
		$a = $("#account"), 
		$p = $("#password"), 
		$b = $("body"), 
		account = $a.val().toLowerCase(), 
		via_API = !!window.via_API; // 透過 API

	if(account.length<3){
		shake($f);
		toast(_h("i-signin-2"));
		$a.focus(); return;
	}
	else if($p.val().length<6){
		shake($f);
		toast(_h("i-signin-8"));
		$p.focus(); return;
	}

	hj_update({
		action: "signin", 
		account: account, 
		password: $p.val(), 
		ip: $b.attr("data-ip") || "", 
		cc: $b.attr("data-cc") || "", 
		app: +(!!check_hjapp() || check_hjpwa()), 
		via_API: via_API
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				var val = r["Values"];
				$("#signin").hide(); $(".loading-bars").show();

				// Cookie 記憶
				if(!$("a.toggler").hasClass("off")) setcookie("hearty_account", account, 90);
				else setcookie("hearty_account", "", 90);

				// 登入後跳轉
				toast(_h("i-signin-1", {$user: account}));
				$("body").css({cursor: "wait"});

				if(typeof mixpanel!="undefined"){
					mixpanel.identify(val["user_id"]);
					mixpanel.people.set({
						"$username": val["username"], 
						"$email": val["email"], 
						"$last_login": new Date()
					});
				}
				ga_evt_push("Sign In", {
					event_category: "Auth", 
					event_label: "Sign In"
				});

				var redirect;
				if(!!via_API){
					redirect = Return_URL;
					redirect += (redirect.indexOf("?")<0?"?":"&")+"Hearty_Signin="+val["token_signin"]; // 網址帶 Token 參數
			    	location.assign(redirect);
				}
				else if(!!getUrlPara("r")){
					location.assign(htmlspecialchars(getUrlPara("r")).replace("？", "?").replace(/＆/g, "&"));
				}
				else{
					switch(para){
						case "first": // 需要導覽
							redirect = "/"+val["username"]+"?first=1";
						break;
						
						case "profile": // 導至 profile
							redirect = "/account?pc=1";
						break;

						default:
							redirect = "/"+val["username"];
						break;
					}
					location.assign(redirect);
				}
			break;

			case 2:
				shake($f);
				toast(_h("i-signin-"+(account.indexOf("@")<0 ? 3 : 4), {$user: account}));
				$a.focus();
			break;

			case 3:
				shake($f);
				toast(_h("i-signin-5", {$user: account}));
				msg(_h("i-signin-6", {$user: account}));
			break;

			default:
				shake($f);
				toast(_h("i-signin-7"));
				$p.val("").focus();
			break;
		}
	}).fail(function(){
		msg();
	});
}
	function signin_viaapi(client){
		if(!!client){
			$(function(){
				toast(_h("i-signin-9", {$client: client}));
				authbox(true);
			});
		}
	}

// 註冊
function signup(){
	// 防呆機制 (避免 ID 誤填為 Email)
	var $a = $("#account"), 
		account = $a.val().toLowerCase()
			.replace(/((g(|oogle)|y(|7)|hot|fox|live|zoho|proton|rocket)mail|outlook|msn|live|passport|aol|ya(hoo|ndex)|qq|1(26|63)|icloud|mac|me)(com([a-z]{2}|)|[a-z]{2})/gi, "")
			.replace(/[^a-z0-9]/gi, "");
		$a.val(account);

	var $f = $(".authform"), 
		$s = $("#status"), 
		$e = $("#email"), 
		$p = $("#password"), 
		$p2 = $("#password2"), 
		email = $e.val().toLowerCase().replace(/\s+/g, ''), 
		email_domain = email.split("@").pop(), 
		password = $p.val(), 
		password2 = $("#password2").val(), 
		// nickname = $('#nickname').val(), 
		// gender = isNaN($("input[name=gender]:checked").val()) ? 0 : $("input[name=gender]:checked").val(), 
		referrer = getUrlPara("ref") || "", 
		referral = document.referrer || "", 
		timezone = !window.Intl ? "Asia/Taipei" : new Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Taipei";

	if(!isNaN(account)){
		shake($f);
		toast(_h("i-signup-0"));
		$a.focus(); return;
	}
	else if(account.length<4 || account.length>20){
		shake($f);
		toast(_h("i-signup-1"));
		$a.focus();
		return;
	}
	else if(email.length<6 || !/@/.test(email)){
		shake($f);
		toast(_h("i-signup-2"));
		$e.focus();
		return;
	}
	else if(/relay\.firefox|nien\.co|heart/.test(email_domain)||email_domain=="email.com"){
		shake($f);
		toast(_h("i-signup-3"));
		$e.val("").focus();
		return;
	}
	else if(password.length<6 || password.length>20){
		shake($f);
		toast(_h("i-signup-4"));
		$p2.val("");
		$p.val("").focus();
		return;
	}
	else if(password!=password2){
		shake($f);
		toast(_h("i-signup-5"));
		$p2.val("");
		$p.val("").focus();
		return;
	}
	// 不建議使用 Yahoo! 信箱
	else if(/yahoo\.co/.test(email_domain) && !confirm(_h("i-signup-6"))){
		return;
	}
	// 網軍 Email
	else if(/chaobang\.cc/.test(email_domain)){

		// 回傳檢舉
		// forms.gle/LDSjDMsxAaqc8Th58
		gform_post("1FAIpQLSfQd9LCzscTxKktRS21I3NoIpkguHd6pti5U04CSarieL5QLg", {
			"emailAddress": email, 
			"entry.527303026": "🇨🇳 中共網軍", 
			"entry.355700800": "註冊", 
			"entry.1592095357": email, 
			"entry.1259076046": today(8), 
			"entry.124585191": check_browser()+", "+check_OS()
		});

		setcookie("hearty_ccp_sucks", 1, 7); // 標記為網軍

		top.location.href = "//supr.link/Ih6o1";
		return;
	}

	// 是否為拋棄式信箱
	var disposable = false;
	$.ajax({
		url: "//api.usercheck.com/domain/"+email_domain, 
		// headers: {Authorization: "Bearer m6MHxfLy2tU1Ro9Y0laS0WQy3GZg7Vfm"}, 
		type: "GET", 
		crossDomain: true, 
		dataType: "json", 
		async: false, 
		timeout: 2000, 
		success: function(r){
			disposable = (r["disposable"]||"")==true;
		}
	});
	if(disposable){
		toast(_h("i-signup-14"));
		shake($f); $e.val(""); $e.focus();
		return;
	}


	// referrer 暫存 Cookie
	if(!getcookie("hearty_referrer") && !!referrer)
		setcookie("hearty_referrer", referrer, 90);
	else if(!!getcookie("hearty_referrer") && !referrer)
		referrer = getcookie("hearty_referrer");

	hj_update({
		action: "signup", 
		account: account, 
		email: email, 
		password: password, 
		// nickname: nickname, 
		// gender: gender, 
		language: $(".language").val()||0, 
		timezone: timezone, 
		referrer: referrer, 
		referral: referral
	}).then(function(r){
		switch(r["Status"]){
			case 0:
				msg(_h("i-signup-7"));
				$a.focus();
			break;

			case 1:
				var val = r["Values"];
				if(!val["verification"]){ // if(val["verification"]=="1"){
					alertify.success(_h("i-signup-9", {$user: account})); // 發信失敗
				}
				else{
					alert(_h("i-signup-8", {$user: account}));
					email_verification_suspended(!0);
				}

				$("a.toggler").removeClass("off");
				box("signin"); signin("first");

				if(typeof mixpanel!="undefined"){
					mixpanel.identify(val["user_id"]);
					mixpanel.people.set({
						"$username": val["username"], 
						"$email": val["email"], 
						"$created": new Date()
					});
				}

				ga_evt_push("Sign Up", {
					event_category: "Auth", 
					event_label: "Sign Up"
				});
				fb_evt_push("CompleteRegistration");
				ln_evt_push("CompleteRegistration");
				ga_evt_push("conversion", {send_to: "AW-1027812032/VU59COmFmNIBEMDVjOoD"});
			break;

			case 2:
				box("signin");
				toast(_h("i-signup-10")); shake($f);
				$a.focus();
			break;

			case 3:
				box("signin");
				toast(_h("i-signup-11")); shake($f);
				$a.val(email).focus();
			break;

			case 4:
				toast(_h("i-signup-12"));
				shake($f);
				$a.focus();
			break;

			case 5:
				toast(_h("i-signup-13"));
				shake($f);
				$e.focus();
			break;

			case 9:
			    toast(_h("i-signup-15"));
			    shake($f);
			    msg();
			break;

			default:
				msg();
			break;
		}
	}).fail(function(){
		msg();
	});
}

// 密碼重設
function hj_reset(){
	var account = $("#account").val().toLowerCase();
	if(account.length<3){
		shake($(".authform"));
		toast(_h("i-reset-3"));
		$("#account").focus(); return;
	}

	hj_update({
		action: "password_reset", 
		account: account
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				reset_suspended(!0);
				var val = r["Values"];
				alert(_h("i-reset-5", {$domain: val["email_domain"]}));

				if(val["email_login_url"].length>0){
					alertify.set({labels: {ok: _h("i-go"), cancel: _h("i-no-0")}, buttonReverse: !1});
					alertify.confirm(_h("i-reset-6", {$url: val["email_login_url"][0]}), function(e){
						if(e) location.href = "//"+val["email_login_url"][1];
						else box("signin");
						toast(_h("i-reset-4"));
					});
				}
			break;

			default:
				shake($(".authform"));
				toast(_h("i-reset-7"));
				$("#account").focus();
			break;
		}
	}).fail(function(){
		msg();
	});
}

function authbox(on){
	var $h = $(".home_signin"), 
		$c = $(".content");
	if(on){
		$h.show(); $c.hide();
		setTimeout(function(){
			$h.fadeIn();
		}, 200);
	}
	else{
		$h.fadeOut(); $c.show();
	}
	$("body").css("overflow-y", on ? "hidden" : "auto");
}

// 登入/註冊切換
function box(toggle){
	var $s = $("#status"), 
		$a = $("#account"), 
		$p = $("#password"), 
		$sup = $(".signup"), 
		$sin = $(".signin"), 
		$res = $(".reset");

	switch(toggle){
		case "signup":
			$(".toggle_signup").css({color: "#fff", background: "#555"});
			$(".toggle_signin").css({color: "#222", background: "transparent"});

			toast(_h("i-box-3"));
		    $a.add($p).attr({onkeypress: "press_enter(event,'signup')"});
		    $sup.show(); $sin.add($res).hide("slide");
		    password_show(!0);
		    if(!!$p.val().length) password2_show(!0);
		break;

		case "signin":
			$(".toggle_signin").css({color: "#fff", background: "#555"});
			$(".toggle_signup").css({color: "#222", background: "transparent"});

			toast(_h("i-box-4"));
		    $a.add($p).attr({onkeypress: "press_enter(event,'signin')"});
			$sup.add($res).hide("slide"); $sin.show(); 
			password_show(!0); password2_show(!1);
		break;

		case "reset":
			toast(_h("i-box-5"));
			$a.attr({onkeypress: "press_enter(event,'hj_reset')"});
		    $sup.add($sin).hide("slide"); $res.show();
		    password_show(!1);

			if(!$("#captcha").html()){
				if(!window.recaptcha){
					window.recaptcha = function(){
						var $r = $("#reset");
						turnstile.render("#captcha", {
							sitekey: "0x4AAAAAAAAt_P1lgP_qe9nY", 
							theme: "light", 
							callback: function(){
								$r.show();
							}, 
							"expired-callback": function(){
								$r.slideUp();
							}
						});
					};
				}
				hj_getScript("//challenges.cloudflare.com/turnstile/v0/api.js?onload=recaptcha&render=explicit");
			}
		break;
	}

	var title = _h("i-box-"+(toggle=="signup" ? 6 : 7)), 
		reg = toggle=="signup" ? "/[^a-z0-9]/g" : "/[^a-z0-9-_.@]/g", 
		oninput = "this.value=(this.value||'').toLowerCase().replace("+reg+",'')";

	$a.focus().attr({title: title, 
			placeholder: title, 
			oninput: oninput
		}).parent("td").attr("data-tooltip", title);
}
	function toast(t){
		return $("#status").text(t||"").show();
	}

function password_reveal($btn){
	let $pwd = $("#password");
	$pwd.add($("#password2")).attr({type: $pwd.attr("type")=="text" ? "password" : "text"});
	$btn.toggleClass("fa-eye fa-eye-slash");
}

function password_show(on, sec){
	var $e = $("#password"+(sec==null ? "" : "2")).parent().parent();
	if(on) $e.css({display: "table-row"});
	else $e.hide("slide");
}
	function password2_show(on){
		password_show(on, !0);
	}

// Email 認證分時限制
function email_verification_suspended(on, revoke){
	if(on) setcookie("hearty_email_verification_suspended", revoke || timestamping()+180, 1);
}

// 密碼重設分時限制
function reset_suspended(on, revoke){
	var $r = $("#reset");
	if(on){
		revoke = revoke || timestamping()+180;
		setcookie("hearty_reset_suspended", revoke, 1);
		window.reset_suspended_timer = Timer(Math.max(0, revoke-timestamping()), $r);

		$r.attr({onclick: "shake($('.authform'))"}).css({cursor: "not-allowed"});
	}
	else{
		$r.attr({onclick: "hj_reset()"}).css({cursor: "pointer"}).text(_h("i-reset-0"));
	}
	$r.toggleClass("pure-button-default pure-button-gray");

	function Timer(duration, display){
		var timer = duration, minutes, seconds;
		return window.setInterval(function(){
			minutes = parseInt(timer/60, 10)
			seconds = parseInt(timer%60, 10);
			minutes = minutes<10 ? "0"+minutes : minutes;
			seconds = seconds<10 ? "0"+seconds : seconds;
			display.text(_h("i-timer", {$min: minutes, $sec: seconds}));
			if(--timer<0){
				window.clearInterval(reset_suspended_timer);
				reset_suspended(!1);
			}
		}, 1000);
	}
}

// 語言
function language_switch(lang, title){
	var $lang = $(".language"), 
		$icon = '<i class="far fa-language" style="font-size:26px"></i> '+_h("i-footer-0")+":<br>";

	// Cookie 及選單同步
	if(lang=="init"){
		var lang = parseInt(getcookie("hearty_language"));

		// 為空
		if(isNaN(lang)){
			lang = +(/zh/i.test(hj_lang()));
			setcookie("hearty_language", lang, 730);
		}
		$lang.val(lang).find("[value="+lang+"]").attr("selected", "selected");
	}
	// alert 切換的 DOM
	else if(!lang){
		msg($icon+$lang.prop("outerHTML"), '<i class="fas fa-reply"></i> '+_h("i-back"));
	}
	// 切換
	else{
		setcookie("hearty_language", lang, 730);
		$(".alertify-button-ok").click();
		msg($icon+_h("i-lang", {$lang: title}));
		location.reload(true);
	}
}

// 範例
function hj_preview(o, url){
	var $b = $("body"), 
		$d = $(".hj_preview"), 
		$i = $d.find("iframe"), 
		evt = "Sample Preview";

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
		ga_evt_push(evt);
	}
	else{
		$d.fadeOut();
		$b.css({"overflow-y": "auto", "touch-action": "auto"});
		$i.off("load").addClass("loading");
	}
}
	function hj_video(){
		hj_preview(true, "//www.youtube-nocookie.com/embed/hEALdS4xMQU?playlist=hEALdS4xMQU&loop=1&controls=1&fs=1&modestbranding=1&cc_load_policy=0&rel=0&autoplay=1&playsinline=0");
	}
	function hj_reviews(){
		hj_preview(true, "//go.hearty.me/hjreviews");
	}

// 播放器
function soundtrack(on){
	var s = "Soundtrack", 
		$c = $(".content"), 
		$t = $(".home_soundtrack");

	switch(on){
		case "onplay":
			ga_evt_push(s+" Play");
		break;

		case true:
			if(!$("#harmony").length){
				var t = _h("i-song-0");
				$("<audio>", {
					id: "harmony", 
					preload: "auto", 
					controls: "", 
					controlsList: "nodownload noplaybackrate", 
					loop: "", 
					title: t, 
					html: $("<source>", {
						src: "//cdn.jsdelivr.net/gh/chennien/d.hearty.app@0/docs/wendu.mp3", 
						type: "audio/mpeg"
					}).text(t)
				}).on("play", function(){
					soundtrack("onplay");
				}).prependTo(".home_soundtrack .lyrics>div>div").get(0).volume = 0.6;

				ga_evt_push(s);
			}
			$c.fadeOut();
			$t.fadeIn();
		break;

		default:
			$("body").css("overflow-y", "auto");
			$c.show();
			$t.fadeOut();
		break;
	}
}

function chat_notice(){
	alertify.set({labels: {ok: '<i class="fas fa-door-open"></i> '+_h("i-signin-0"), cancel: '<i class="fas fa-envelope"></i> '+_h("i-chat-2")}, buttonReverse: false});
	alertify.confirm('<i class="fal fa-info-circle"></i> '+_h("i-chat-1"), function(e){
		if(e){
			authbox(true); box("signup");
		}
		else{
			contact(false);
		}
	});
}
	function contact(v){
		if(!v){
			hcaptcha_init(function(){
				msg($("<div>", {id: "contact"}).prop("outerHTML"), '<i class="fas fa-reply"></i> '+_h("i-back"));
				hcaptcha.render("contact", {
					sitekey: "5ee3e1cd-7bc2-4623-bb21-df1295a52d98", 
					size: "compact", 
					callback: "contact"
				});
			});
		}
		else{
			$("#alertify-ok").click();

			var m = "yv1u2s51@nien.co";
			alertify.set({labels: {ok: '<i class="fas fa-copy"></i> '+_h("i-copy-0"), cancel: _h("i-no-0")}, buttonReverse: false});
			alertify.prompt('<i class="fal fa-envelope"></i> '+_h("i-chat-3"), function(e){
				if(e){
					hj_copy($("#alertify .alertify-text"));
					msg('<i class="fal fa-copy"></i> '+_h("i-copy-1")+m);
				}
			}, m);

			alertify_input_custom({
				type: "email", 
				inputmode: "none", 
				placeholder: m, 
				onclick: "hj_copy($(this))"
			}, {
				cursor: "copy", 
				"letter-spacing": "1px"
			});
			hj_copy_text(m);
		}
	}

function account_notice(){
	msg('<i class="fal fa-user"></i> '+_h("i-id_notice-0")+'<br><i class="far fa-cloud-upload"></i> '+_h("i-id_notice-1"), '<i class="fas fa-mug-hot"></i> '+_h("i-ok-0"));
}

function hj_intro(){
	// go.hearty.me/hjintro
	open_url("//"+(is_touch_device()?"get":"try")+".hearty.me/?utm_source=website&utm_medium=footer&utm_campaign=home");
}
