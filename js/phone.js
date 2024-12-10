"use strict";

if(typeof Sentry!="undefined") Sentry.init({dsn: "https://a6cb9b2263814097b85a2170900e6d62@sentry.io/183684"});
// if(typeof Bugsnag!="undefined") Bugsnag.start({apiKey: "5c55b919bc2a4ed35ffa675c9341251c", appType: "client"});

$(function(){
	if(!!window.firebase) phone_firebase_init();
	else phone_not_loaded();

	phone_no_prefill();

	$("[data-unreceived]").on("click", function(){
		phone_manual_verify(this.dataset.username);
	});
	$("[data-goback]").on("click", function(){
		hj_href("account");
	});

	document.title = _h("pv-title")+" | 💝 Hearty Journal 溫度日記";
});

function dial_code(cc){
	cc = (cc||"").toUpperCase();
	let c = {AD:376,AE:971,AF:93,AG:1,AI:1,AL:355,AM:374,AO:244,AQ:672,AR:54,AS:1,AT:43,AU:61,AW:297,AX:358,AZ:994,BA:387,BB:1,BD:880,BE:32,BF:226,BG:359,BH:973,BI:257,BJ:229,BL:590,BM:1,BN:673,BO:591,BQ:599,BR:55,BS:1,BT:975,BV:47,BW:267,BY:375,BZ:501,CA:1,CC:61,CD:243,CF:236,CG:242,CH:41,CI:225,CK:682,CL:56,CM:237,CN:86,CO:57,CR:506,CU:53,CV:238,CW:599,CX:61,CY:357,CZ:420,DE:49,DJ:253,DK:45,DM:1,DO:1,DZ:213,EC:593,EE:372,EG:20,EH:212,ER:291,ES:34,ET:251,FI:358,FJ:679,FK:500,FM:691,FO:298,FR:33,GA:241,GB:44,GD:1,GE:995,GF:594,GG:44,GH:233,GI:350,GL:299,GM:220,GN:224,GP:590,GQ:240,GR:30,GS:500,GT:502,GU:1,GW:245,GY:592,HK:852,HM:672,HN:504,HR:385,HT:509,HU:36,ID:62,IE:353,IL:972,IM:44,IN:91,IO:246,IQ:964,IR:98,IS:354,IT:39,JE:44,JM:1,JO:962,JP:81,KE:254,KG:996,KH:855,KI:686,KM:269,KN:1,KP:850,KR:82,KW:965,KY:1,KZ:7,LA:856,LB:961,LC:1,LI:423,LK:94,LR:231,LS:266,LT:370,LU:352,LV:371,LY:218,MA:212,MC:377,MD:373,ME:382,MF:590,MG:261,MH:692,MK:389,ML:223,MM:95,MN:976,MO:853,MP:1,MQ:596,MR:222,MS:1,MT:356,MU:230,MV:960,MW:265,MX:52,MY:60,MZ:258,NA:264,NC:687,NE:227,NF:672,NG:234,NI:505,NL:31,NO:47,NP:977,NR:674,NU:683,NZ:64,OM:968,PA:507,PE:51,PF:689,PG:675,PH:63,PK:92,PL:48,PM:508,PN:870,PR:1,PS:970,PT:351,PW:680,PY:595,QA:974,RE:262,RO:40,RS:381,RU:7,RW:250,SA:966,SB:677,SC:248,SD:249,SE:46,SG:65,SH:290,SI:386,SJ:47,SK:421,SL:232,SM:378,SN:221,SO:252,SR:597,SS:211,ST:239,SV:503,SX:1,SY:963,SZ:268,TC:1,TD:235,TF:262,TG:228,TH:66,TJ:992,TK:690,TL:670,TM:993,TN:216,TO:676,TR:90,TT:1,TV:688,TW:886,TZ:255,UA:380,UG:256,UM:246,US:1,UY:598,UZ:998,VA:379,VC:1,VE:58,VG:1,VI:1,VN:84,VU:678,WF:681,WS:685,YE:967,YT:262,ZA:27,ZM:260,ZW:263};
	return cc in c ? c[cc] : 886;
}

function phone_no_prefill(){
	let cc = getUrlPara("cc")||"", 
		$cc = $("#country-code");

	if(!cc){
		hj_ip().then(function(d){
			return d["loc"]||"";
		}).then(function(loc){
			cc = dial_code(loc);
			$cc.val(cc).find("[value="+cc+"]").attr({selected: "selected"});
		});
	}
	else{
		$cc.val(cc).find("[value="+cc+"]").attr({selected: "selected"});
	}
	$("#phone-no").val(getUrlPara("no")||"");
}

function phone_firebase_init(){
	// firebase.auth().languageCode = navigator.language||"en-us";
	window.firebase.auth().onAuthStateChanged(function(u){
		if(u){
			let cc = $("#country-code").val() || 886, 
				no = u.phoneNumber.replace("+"+cc, "");
			hj_update({
				action: "phone_verification_firebase", 
				cc: cc, 
				no: no, 
				token: u.uid
			}).then(function(r){
				switch(r["Status"]){
					case 1:
					case 3:
						// forms.gle/7ModWwENoLowh2po6
						gform_post("1FAIpQLSfW2spId3fWb_h31S4jXhv33Vjal-bHGGIAqtXETGhiqjFB0w", {
							"entry.1182370364": getcookie("hearty_u"), 
							"entry.847068538": getcookie("hearty_id"), 
							"emailAddress": getcookie("hearty_em"), 
							"entry.1353731030": cc, 
							"entry.352107652": no, 
							"entry.1205631750": u.uid, 
							"entry.1460125899": today(8), 
							"entry.1757674378": (navigator.userAgent || "")
						});						

						window.phone_firebase_result = null;
						firebase.auth().signOut().then(phone_firebase_verified).catch(function(e){
							msg();
							location.reload(true);
						});
					break;

					case 2:
						msg('<i class="far fa-exclamation-triangle"></i> '+_h("pv-signin-0"), '<i class="fas fa-door-open"></i> '+_h("pv-signin-1"), function(){
							hj_href("?r="+location.href.split("#")[0].split("?")[0].replace(location.origin, "")+"#signin");
						});
					break;

					default:
						msg();
					break;
				}
			}).fail(msg);
			$("#phone-verify-firebase").hide();
			// console.log( JSON.stringify(firebase.auth().currentUser) );
		}
	});

	window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("phone-firebase", {
		size: "invisible",
		callback: phone_firebase
	});
	window.recaptchaVerifier.render().then(function(w){
		window.recaptchaWidgetId = w;
	}).catch(phone_not_loaded);
}

function phone_firebase(){
	let cc = $("#country-code").val() || 886, 
		$phone = $("#phone-no"), 
		phone = $phone.val() || "", 
		verifier = window.recaptchaVerifier;

	if(phone.length<3){
		msg('<i class="far fa-exclamation-triangle"></i> '+_h("pv-format-0"), _h("pv-ok"), function(){
			shake($phone.parent()); $phone.focus();
		});
		resetReCaptcha();
		return false;
	}
	firebase.auth().signInWithPhoneNumber("+"+cc+phone, verifier).then(function(r){
		window.phone_firebase_result = r;
		phone_firebase_verify("", true);
	}).catch(function(e){
		switch(e.code){
			case "auth/invalid-phone-number":
				msg('<i class="far fa-times"></i> '+_h("pv-format-1"), _h("pv-ok"), function(){
					shake($phone); $phone.focus();
				});
			break;

			case "auth/too-many-requests":
				msg('<i class="far fa-exclamation-circle"></i> '+_h("pv-format-2")+"<br>"+e.message);
			break;

			default:
				msg('<i class="far fa-exclamation-circle"></i> '+e.code+"<br>"+e.message);
			break;
		}
		resetReCaptcha();
	});
}

function phone_firebase_verify(code, sms_sent){
	let $btn = $("#phone-verify-firebase");
	if(!window.phone_firebase_result){
		$btn.prop("disabled", true).show();
		return false;
	}

	alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> '+_h("pv-verify1-0"), cancel: _h("pv-no")}, buttonReverse: false});
	alertify.prompt('<i class="far fa-mobile"></i> '+_h("pv-verify1-1")+(sms_sent?_h("pv-verify1-2"):""), function(e, code){
		if(e){
			code = code || "";
			if(code.length<6){
				msg('<i class="far fa-exclamation-circle"></i> '+_h("pv-code-2"), _h("pv-code-1"), function(){
					phone_firebase_verify();
				});
				return false;
			}

			phone_firebase_result.confirm(code).then(function(r){
				let user = r.user;
				msg('<i class="fas fa-check-circle"></i> '+_h("pv-verify1-3", {$no: $("#phone-no").val()}), _h("pv-ok"));
			}).catch(function(e){
				switch(e.code){
					case "auth/invalid-verification-code":
						msg('<i class="far fa-times"></i> '+_h("pv-code-3"), _h("pv-code-1"), function(){
							phone_firebase_verify();
						});
					break;

					case "auth/code-expired":
						msg('<i class="far fa-times"></i> '+_h("pv-code-4")+"<br>"+e.message);
						window.phone_firebase_result = null;
						$btn.hide();
					break;

					default:
						msg('<i class="far fa-exclamation-circle"></i> '+e.code+"<br>"+e.message);
					break;
				}
			});
		}
	}, (code || "").toString());

	alertify_input_custom({
		type: "tel", 
		placeholder: _h("pv-code-0"), 
		minlength: 1, 
		maxlength: 6, 
		onkeyup: "if(this.value.length==6)$('.alertify-button-ok').click()"
	}, {
		"letter-spacing": "3px"
	});

	$btn.removeAttr("disabled").show();

	let $send = $("#phone-firebase");
	$send.finish().prop("disabled", true).text($send.attr("data-wait"))
	.delay(29000).queue(function(){
		$(this).removeAttr("disabled").text($(this).attr("data-text")).dequeue();
	});

	$("[data-unreceived]").delay(20000).queue(function(){
		$(this).show().dequeue();
	});
}

function phone_not_loaded(){
	msg(
		hj_lang_zhcn() ? 
		'<i class="fal fa-signal-slash"></i> 在中国，谷歌国际短信验证功能被牆了' : 
		'<i class="fal fa-exclamation-triangle"></i> '+_h("pv-fail")
	, " Σヽ(ﾟД ﾟ; )ﾉ ");
}

function resetReCaptcha(){
	if(typeof grecaptcha!="undefined" && typeof window.recaptchaWidgetId!="undefined")
		grecaptcha.reset(window.recaptchaWidgetId);
}

function phone_firebase_verified(){
	if(/8(1|86)|66/.test($("#country-code").val())){ // 台日泰
		alertify.set({labels: {ok: _h("pv-no"), cancel: '<i class="fas fa-hand-point-right"></i> '+_h("pv-ok")}, buttonReverse: true});
		alertify.confirm('<i class="fab fa-line"></i> '+_h("pv-line"), function(e){
			hj_href("account"+(e ? "" : "?line=1"));
		});
	}
	else{
		hj_href("account");
	}
}

function phone_manual_verify(username){
	if(is_touch_device()){
		alertify.set({labels: {ok: _h("pv-no"), cancel: '<i class="fas fa-comment-alt-dots"></i> '+_h("pv-verify2-2")}, buttonReverse: true});
		alertify.confirm('<i class="fal fa-question-circle"></i> '+_h("pv-verify2-0")+"<br>"+_h("pv-verify2-1"), function(e){
			if(!e){
				// +886902290532
				location.href = "sms:+886902290532"+(check_OS("iOS")?"&":"?")+"body="+encodeURIComponent(_h("pv-verify2-4")+(username||"")+"\n+"+($("#country-code").val()||"")+" "+($("#phone-no").val()||"")+"\n");

				// 等 7秒 (供 Android 選擇預設 app)
				setTimeout(function(){
					msg('<i class="fal fa-info-circle"></i> '+_h("pv-verify2-3"), _h("pv-ok"), function(){
						hj_href("account");
					});
				}, 7000);
			}
		});
	}
	// 電腦版
	else{
		alertify.set({labels: {ok: _h("pv-no"), cancel: '<i class="fab fa-facebook-messenger"></i> '+_h("pv-verify3-2")}, buttonReverse: true});
		alertify.confirm('<i class="fal fa-question-circle"></i> '+_h("pv-verify3-0")+"<br>"+_h("pv-verify3-1"), function(e){
			if(!e) 
				window.open("//m.me/1"+(/zh/i.test(navigator.language||"")?"15513719073571":"04488928966903"), "_blank");
		});
	}
	fb_evt_push("Contact");
}
