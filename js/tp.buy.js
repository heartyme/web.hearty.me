"use strict";

window.jQuery || alert("Please disable Adblock & clean caches.\n請停用 Adblock及清除快取") || window.open("//bit.ly/3I7cEJz", "_blank");

// 語系檔
var _h$ = {tp: [
	{ // en 0
		// DOMs
		back: "Back", 
		title: "TapPay Payment | Hearty Journal 溫度日記", 
		prd: "Hearty Journal", 
		item: "Item", 
		plan: "Plan", 
		amt: "Amount", 
		ask: "Encountering payment issues?", 
		card: ["Credit Card Payment", "Credit Card Subscription"], 
		phone: ["Country (A-Z)", "Mobile number, Card Holder"], 
		types: "VISA, MasterCard, JCB & Union Pay", 
		pay: "Checkout", 
		agree: [
			"I hereby authorize and permit to sign the power of attorney to execute the credit card payment by Hearty Journal.", 
			"You must authorize the credit card payment to purchase the subscription plan."
		], 
		mpay: "Or use mobile payment", 
		alipay: "Alipay", 
		wechat: "WeChat Pay", 
		footer: "This site uses TapPay SSL 2048-bit payment system. Your payment is securely processed by the bank and we never handle your credit card information. TapPay is PCI-DSS compliant, ensuring the safety of your data.", 

		// JS
		ok: "OK", 
		no: "Cancel", 
		kyc: [
			"To comply with financial regulator's anti-fraud rules in Taiwan, please provide the phone number on file with your card-issuing bank for ID verification.", 
			"The phone number $no doesn't match the bank's records. Please provide the correct number and try again. Thank you."
		], 
		done: [
			"Payment completed. Thank you for upgrading to the VIP plan of Hearty Journal.", 
			"Order No. $no"
		], 
		fail: [
			"Transaction failed. Please check the card number or use a different payment method. If the issue persists, please contact support.", 
			"Transaction failed. Please check the card number or use a different card. If the issue persists, please contact support.", 
			"Order No. $no", 
			"Contact us"
		], 
		err: [
			"Sorry, an unexpected error occurred."
		]
	}, 
	{ // zh-tw 1
		// DOMs
		back: "回前頁", 
		title: "TapPay付款 | 溫度日記 Hearty Journal", 
		prd: "溫度日記 Hearty Journal", 
		item: "方案", 
		plan: "內容", 
		amt: "金額", 
		ask: "遇到刷卡問題？", 
		card: ["信用卡付款", "信用卡訂閱"],  
		phone: ["國碼 (A-Z)", "持卡人手機號碼"], 
		types: "VISA、MasterCard、JCB、銀聯卡", 
		pay: "結帳", 
		agree: [
			"我同意自下次交易起由溫度日記向 TapPay發動信用卡授權指示", 
			"您需同意信用卡授權，才能購買訂閱方案"
		], 
		mpay: "或使用行動支付", 
		alipay: "支付寶", 
		wechat: "微信支付", 
		footer: "本站採⽤喬睿科技(TapPay) SSL 2048-bit 交易系統。刷卡時，將於銀⾏端完成交易，本站絕不會經手您的信⽤卡資料。TapPay系統亦通過 PCI-DSS安全稽核，保障您的資料安全無虞。", 

		// JS
		ok: "好的", 
		no: "取消", 
		kyc: [
			"為遵守台灣金管會的防詐新制，請您提供您在發卡銀行留存的手機號碼，以便進行交易簡訊認證。", 
			"您提供的手機號碼 $no 與銀行留存的不符。請提供正確的號碼並再試一次。"
		], 
		done: [
			"付款完成，謝謝您購買溫度日記 VIP", 
			"訂單編號：$no"
		], 
		fail: [
			"交易失敗，請確認輸入資料無誤，或更換信用卡，或另選付款方式，如問題持續請聯繫客服", // 儲值
			"刷卡失敗，請確認輸入資料無誤，或更換信用卡，如問題持續請聯繫客服", // 訂閱
			"訂單編號：$no", 
			"聯繫客服"
		], 
		err: [
			"不好意思，似乎出錯了"
		]
	}, 
	{ // zh-cn 2
		// DOMs
		back: "回前页", 
		title: "TapPay支付 | 温度日记 Hearty Journal", 
		prd: "温度日记 Hearty Journal", 
		item: "方案", 
		plan: "内容", 
		amt: "金额", 
		ask: "遇到刷卡问题？", 
		card: ["银行卡付款", "银行卡订阅"],  
		phone: ["国码 (A-Z)", "持卡人手机号"], 
		types: "VISA、MasterCard、JCB、银联卡", 
		pay: "结帐", 
		agree: [
			"我同意自下次交易起由温度日记向 TapPay发动银行卡授权指示", 
			"您需同意银行卡授权，才能购买订阅方案"
		], 
		mpay: "或使用移动支付", 
		alipay: "支付宝", 
		wechat: "微信支付", 
		footer: "本站採⽤乔睿科技(TapPay) SSL 2048-bit 交易系统。刷卡时，将于银⾏端完成交易，本站绝不会经手您的银行卡数据。TapPay系统亦通过 PCI-DSS安全稽核，保障您的数据安全无虞。", 

		// JS
		ok: "好的", 
		no: "取消", 
		kyc: [
			"为遵守台湾金管会的防诈新制，请您提供您在发卡银行留存的手机号码，以便进行交易简讯认证。", 
			"您提供的手机号 $no 与银行留存的不符。请提供正确的号码并再试一次。"
		], 
		fail: [
			"交易失败，请确认输入数据无误，或更换银行卡，或另选支付方式，如问题持续请联繫客服", // 储值
			"刷卡失败，请确认输入数据无误，或更换银行卡，如问题持续请联繫客服", // 订阅
			"订单编号：$no", 
			"联繫客服"
		], 
		err: [
			"抱歉，似乎出错了"
		]
	}
	][tp_lang()]};


// onload
$(function(){
	tp_init();
	tp_init_dpay(); // Direct Pay

	// 單筆
	if(getUrlPara("recurring")==0){
		// 非手機 APP，才啟用 GP
		if(!tp_isapp()) tp_init_gpay(); // GP
		tp_init_apay(); // AP
		np_init_ezpay(); // ezPay

		$(".mobile").add($("#agree").parent()).remove(); // 移除手機號碼+續扣同意
	}
	// 訂閱
	else{
		$(".mobile_pay").remove(); // 移除行動支付
		$("h4").attr("data-h", "tp-card-1"); // 更改標題
	}

	// 顯示當地幣值
	let cur = getUrlPara("cur");
	if(!!cur)
		TWD2local(cur).then(function(rate){
			let t = cur+" "+Math.ceil( (parseInt($("#amt").text())||0) *rate*10)/10;
			$("[data-cur]").text(t).attr({title: t});
		});

	// 語系檔
	_h_init();

	// 隱藏網址參數
	tp_params(false);

	// TapPay Logo
	$(".tp_logo").on("click", function(){
		alertify.alert('<i class="fal fa-shield-check"></i> '+_h("tp-footer"));
	});
});

function tp_params(get){
	let $b = $("body");

	// onload
	if(!get){
		// 網址參數為空時
		if(!(location.search||"").length){
			top.location.href = "//bitly.com/3fmoEYD"; return;
		}

		let _3ds = getUrlPara("3ds");
		// if(getcookie("hearty_3ds")=="0") _3ds = 0; // 關 3D

		// 將網址參數寫入 DOM以隱藏
		$b.attr({
			"data-pkg": getUrlPara("pkg"), 
			"data-3ds": _3ds, 
			"data-recurring": getUrlPara("recurring"), 
			"data-ip": getUrlPara("ip"), 
			"data-cc": getUrlPara("cc")
		});

		// 非手機 APP，才藏網址
		if(!tp_isapp() && typeof history.replaceState=="function") history.replaceState(null, "", location.pathname);
	}
	// get
	else{
		return $.param($b.get(0).dataset);
	}
}

function tp_init(){
	let dev_mode = $("body").attr("data-prod")==0, 
		$d = $(".demo");

	// TapPay
	TPDirect.setupSDK(146938, "app_tqcNPY9hA34zrTxrpSiJ263QjhRojqktIxruWM47YobDh83m7E1GKlf3XPN4", 
		dev_mode ? "sandbox" : "production"
	);

	// 測試卡號備註欄
	if(dev_mode){
		$d.removeClass("hidden").on("click", function(){
			window.open("//docs.tappaysdk.com/tutorial/zh/reference.html#test-card", "_blank");
		}).find("a").on("click", function(e){
			e.stopPropagation();
			navigator.clipboard.writeText($(this).text());
		});
	}
	else{
		$d.remove();
	}
}

function tp_dpay_btn(on){
	tp_loading(!on);
	return $("#dpay_btn").prop({disabled: !on});
}

function tp_init_dpay(){
	try{
		TPDirect.card.setup("#dpay", {
			color: 'rgb(0,0,0)', 
			fontSize: '15px', 
			lineHeight: '24px', 
			fontWeight: '300', 
			errorColor: 'red', 
			placeholderColor: ""
		}, {
			isUsedCcv: false, 
			// 會顯示卡號前六後四碼
			isMaskCreditCardNumber: true, 
			maskCreditCardNumberRange: {
				beginIndex: 6, 
				endIndex: 11
			}
		});

		// 預填電話國碼 (如尚未驗證)
		let $cc = $("#phone_cc");
		if($cc.length>0 && !$cc.val()){
			let cc = dial_code(getUrlPara("cc")||"");
			$cc.val(cc).find("[value="+cc+"]").attr({selected: "selected"});
		}

		// 付款鈕
		let $btn = $("#dpay_btn").on("click", function(e){
			e.preventDefault();
			tp_dpay_btn(false);
			TPDirect.card.getPrime(function(r){
				let c = r.card;
				tp_pay(1, c.prime||"", c.countrycode||"");
			});
		});

			TPDirect.card.onUpdate(function(r){
				$btn.prop({disabled: !r.canGetPrime});
			});

		// 授權同意
		$("#agree").on("click", function(e){
			e.preventDefault();
			tp_msg('<i class="fal fa-badge-check"></i> '+_h("tp-agree-1"));
		});
	}
	catch(e){
		console.error("Dpay Error");
	}
}
	function dial_code(cc){
		cc = (cc||"").toUpperCase();
		let c = {AD:376,AE:971,AF:93,AG:1,AI:1,AL:355,AM:374,AO:244,AQ:672,AR:54,AS:1,AT:43,AU:61,AW:297,AX:358,AZ:994,BA:387,BB:1,BD:880,BE:32,BF:226,BG:359,BH:973,BI:257,BJ:229,BL:590,BM:1,BN:673,BO:591,BQ:599,BR:55,BS:1,BT:975,BV:47,BW:267,BY:375,BZ:501,CA:1,CC:61,CD:243,CF:236,CG:242,CH:41,CI:225,CK:682,CL:56,CM:237,CN:86,CO:57,CR:506,CU:53,CV:238,CW:599,CX:61,CY:357,CZ:420,DE:49,DJ:253,DK:45,DM:1,DO:1,DZ:213,EC:593,EE:372,EG:20,EH:212,ER:291,ES:34,ET:251,FI:358,FJ:679,FK:500,FM:691,FO:298,FR:33,GA:241,GB:44,GD:1,GE:995,GF:594,GG:44,GH:233,GI:350,GL:299,GM:220,GN:224,GP:590,GQ:240,GR:30,GS:500,GT:502,GU:1,GW:245,GY:592,HK:852,HM:672,HN:504,HR:385,HT:509,HU:36,ID:62,IE:353,IL:972,IM:44,IN:91,IO:246,IQ:964,IR:98,IS:354,IT:39,JE:44,JM:1,JO:962,JP:81,KE:254,KG:996,KH:855,KI:686,KM:269,KN:1,KP:850,KR:82,KW:965,KY:1,KZ:7,LA:856,LB:961,LC:1,LI:423,LK:94,LR:231,LS:266,LT:370,LU:352,LV:371,LY:218,MA:212,MC:377,MD:373,ME:382,MF:590,MG:261,MH:692,MK:389,ML:223,MM:95,MN:976,MO:853,MP:1,MQ:596,MR:222,MS:1,MT:356,MU:230,MV:960,MW:265,MX:52,MY:60,MZ:258,NA:264,NC:687,NE:227,NF:672,NG:234,NI:505,NL:31,NO:47,NP:977,NR:674,NU:683,NZ:64,OM:968,PA:507,PE:51,PF:689,PG:675,PH:63,PK:92,PL:48,PM:508,PN:870,PR:1,PS:970,PT:351,PW:680,PY:595,QA:974,RE:262,RO:40,RS:381,RU:7,RW:250,SA:966,SB:677,SC:248,SD:249,SE:46,SG:65,SH:290,SI:386,SJ:47,SK:421,SL:232,SM:378,SN:221,SO:252,SR:597,SS:211,ST:239,SV:503,SX:1,SY:963,SZ:268,TC:1,TD:235,TF:262,TG:228,TH:66,TJ:992,TK:690,TL:670,TM:993,TN:216,TO:676,TR:90,TT:1,TV:688,TW:886,TZ:255,UA:380,UG:256,UM:246,US:1,UY:598,UZ:998,VA:379,VC:1,VE:58,VG:1,VI:1,VN:84,VU:678,WF:681,WS:685,YE:967,YT:262,ZA:27,ZM:260,ZW:263};
		return cc in c ? c[cc] : 886;
	}

function tp_init_apay(){
	try{
		let $ap = $("#apay");

		// 支援 PaymentRequest / Apple Pay
		if(TPDirect.paymentRequestApi.checkAvailability()){
			TPDirect.paymentRequestApi.setupApplePay({
				merchantIdentifier: "merchant.hearty.tappay" // Apple merchant id
				// countryCode: "TW" // default
			});

			TPDirect.paymentRequestApi.setupPaymentRequest({
				supportedNetworks: ["VISA", "MASTERCARD", "JCB"], 
				supportedMethods: ["apple_pay"], 
				displayItems: [{
					label: $("#item").text(), 
					amount: {
						currency: "TWD", 
						value: "1"
					}
				}], 
				total: {
					label: _h("tp-prd"), 
					amount: {
						currency: "TWD", 
						value: parseInt($("#amt").text())
					}
				}
				/* optional
				, 
				options: {
					requestPayerEmail: false,
					requestPayerName: false,
					requestPayerPhone: false,
					requestShipping: false,
				}
				*/
			}, function(r){
				if(window.ApplePaySession && // 裝置支援
					r.canMakePaymentWithActiveCard // 使用者有在 Apple Pay中綁卡
					){

					$ap.on("click", function(){
						TPDirect.paymentRequestApi.getPrime(function(r){
							tp_pay(8, r.prime||"");
						});
					}).show();
				}
				else{
					$ap.remove();
				}
			});
		}
	}
	catch(e){
		$ap.remove();
		console.error("Apay Error");
	}
}

function tp_init_gpay(){
	let $gp = $("#gpay");

	try{
		TPDirect.googlePay.setupGooglePay({
			googleMerchantId: "BCR2DN4TRGFNNFJ3", 
			tappayGoogleMerchantId: "hearty_TAISHIN", 
			allowedCardAuthMethods: ["PAN_ONLY", "CRYPTOGRAM_3DS"], 
			merchantName: "Hearty Creative Inc.", 
			allowPrepaidCards: true, 

			// emailRequired: true, // optional
			// optional: Shipping
			// shippingAddressRequired: true, 
			// billingAddressRequired: true, 
			// billingAddressFormat: "MIN", // FULL, MIN
			// allowedCountryCodes: ["TW"], 
			// phoneNumberRequired: true
		});

		TPDirect.googlePay.setupPaymentRequest({
			allowedNetworks: ["VISA", "MASTERCARD", "JCB"], 
			price: parseInt($("#amt").text()).toString(), // must be a string
			currency: "TWD", // optional
		}, function(err, r){
			if(r.canUseGooglePay){
				TPDirect.googlePay.setupGooglePayButton({
					el: "#gpay", 
					color: "white", 
					type: "short", // long, short
					getPrimeCallback: function(err, prime){
						tp_pay(9, prime||"");
					}
				})
			}
			else{
				$gp.remove();
			}
		});
	}
	catch(e){
		$gp.remove();
		console.error("Gpay Error");
	}
}

// Pay-by-Prime
function tp_pay(payvia, prime, card_country){ // eg. card_country = TW
	// payvia: 1 信用卡; 8 AP; 9 GP
	if(prime.length>0){
		let data = {
			payvia: payvia, 
			prime: prime
		};

		// cardholder_verify (僅 Direct Pay)
		if(payvia==1){
			data["card_country"] = card_country||"";

			let $phone_no = $("#phone_no");
			if($phone_no.length>0){
				let phone_cc = $("#phone_cc").val()||"", 
					phone_no = $phone_no.val()||"";

				if(!!phone_cc && phone_no.length>3){
					// 去掉前導 0
					// 台灣手機 09
					if(phone_cc==886) phone_no = phone_no.replace(/^0(?=9)/, "");

					// 加國碼
					data["phone"] = "+"+phone_cc+phone_no;
				}
				// 要求補填手機
				else{
					tp_kyc();
					tp_dpay_btn(true);
					return;
				}
			}
		}

		// ### debug
		console.log("* fn tp_pay: "+JSON.stringify(data));

		$.ajax({
			type: "POST", 
			url: "/shop/tp.prime?"+tp_params(true), 
			async: true, 
			crossDomain: true, 
			dataType: "json", 
			data: data, 
			timeout: 15000
		}).then(function(r){
			let v = r["Values"]||"";
			switch(r["Status"]||""){
				// 0 訂單寫入失敗
				case 0:
					tp_pay_err("0", "#"+(v["orderno"]||"*"));
				break;

				// 1 交易完成
				case 1:
					let orderno = v["orderno"]||"";

					// 新訂單通知
					// forms.gle/WpRKa7RDbs5auFf88
					// docs.google.com/forms/d/1FlZikf_rvjfznzynLookHlOZlUxnYJaPz7v6e-tDOqY/edit#responses
					fetch("//docs.google.com/forms/d/e/1FAIpQLSeooQCNhp2ubbIvshtucFLF5PVOE_ZRaHFAgBPvrVT_MDl_bg/formResponse", {
						method: "POST", 
						mode: "no-cors", 
						body: new URLSearchParams({
							"entry.553484449": $("[data-hid]").text()||"", // Hearty ID
							"entry.729548178": orderno, 
							"entry.147291994": [,"dp",,,,,,,"ap","gp"][payvia]||"", 
							"entry.20989936": "url_3ds" in v ? "Y" : "N", // 3Ds
							"entry.792614445": navigator.userAgent||"", 
							"entry.2000689905": new Date((new Date).getTime()+288e5).toISOString().split("T")[0]
						})
					});

					// 簡訊驗證 (信用卡 3DS)
					if("url_3ds" in v){
						top.location.href = v["url_3ds"];
					}
					// 交易完成 (信用卡非 3DS / AP / GP)
					else{
						tp_msg('<i class="fal fa-check-circle"></i> '+_h("tp-done-0")+'<br><i class="fal fa-file"></i> '+_h("tp-done-1", {$no: orderno||"*"}));
						top.location.href = location.origin+"/shop/tp.thankyou?o="+orderno;
					}
				break;

				// 2 交易失敗
				case 2:
					tp_pay_report(2, JSON.stringify(v||""));

					let $b = $("body"), 
						recurring = $b.attr("data-recurring")==1;

					alertify.set({labels: {ok: '<i class="fas fa-question-circle"></i> '+_h("tp-fail-3"), cancel: _h("tp-no")}, buttonReverse: true});
					alertify.confirm('<i class="fal fa-comment-alt-times"></i> '+_h("tp-fail-"+
						(recurring?1:0)
						)+' (❁´ㅁ`)ﾉ<br><i class="fal fa-file"></i> '+_h("tp-fail-2", {$no: v["orderno"]||"*"}), function(e){
						if(e) tp_support();
					});

					// 若購買儲值方式首次失敗時，則下次主動幫它關 3D
					if(!recurring) $b.attr("data-3ds", 0);

					tp_dpay_btn(true);
				break;

				// 4 KYC 手機驗證失敗
				case 4:
					tp_pay_report(4, JSON.stringify(v||""));

					tp_kyc( "+"+($("#phone_cc").val()||"")+($("#phone_no").val()||"") );

					tp_dpay_btn(true);
				break;

				// 3 訂單格式不符
				case 3:
					tp_pay_err(3, v["err"]||"");
				break;

				// D 其他錯誤
				default:
					tp_pay_err("D", JSON.stringify(r||""));
				break;
			}
			}).fail(function(e){
				// F 未知故障
				tp_pay_err("F", JSON.stringify(e||""));
			});
	}
}
	// 錯誤顯示
	function tp_pay_err(no, txt){
		no = no||"";
		txt = txt||"";
		tp_pay_report(no, txt);

		tp_msg('<i class="far fa-sad-tear"></i> ['+no+"] "+_h("tp-err")+"<br>"+txt);
		tp_dpay_btn(true);
	}
		// 錯誤回傳
		function tp_pay_report(no, txt){
			// forms.gle/AgcyYpiwkvhqj9WR9
			// docs.google.com/forms/d/1C6ex-5D2znrAEF4PSTBKv1oSp8MvuB5LZf_jAVFkuuU/edit#responses
			fetch("//docs.google.com/forms/d/e/1FAIpQLSe15z1D2VmTe7W_F4uRjth7xSRT8rNUxyKG9qrcVRVRXM9nMA/formResponse", {
				method: "POST", 
				mode: "no-cors", 
				body: new URLSearchParams({
					"entry.553484449": $("[data-hid]").text()||"", // Hearty ID
					"entry.729548178": no, 
					"entry.20989936": txt, 
					"entry.792614445": navigator.userAgent||"", 
					"entry.2000689905": new Date((new Date).getTime()+288e5).toISOString().split("T")[0]
				})
			});
		}

// ezPay 直連閘道 (支付寶&微信)
function np_init_ezpay(){
	$(".ezpay").on("click", function(){
		tp_loading(true);
		top.location.href = location.origin+"/shop/np.buy?ezpay=1&"+tp_params(true);
	}).show();
}

// 當地匯率
function TWD2local(currency){
	/*
	// ### debug
	return $.ajax({
		url: "//api.hearty.app/robots.txt", 
		type: "GET", 
		crossDomain: true, 
		async: true
	}).then(function(r){
		return 4.95;
	});
	*/

	return $.ajax({
		url: "//api.hearty.app/currency/TWD", 
		type: "GET", 
		crossDomain: true, 
		dataType: "json", 
		async: true, 
		timeout: 5000
	}).then(function(r){
		return parseFloat(r["conversion_rates"][currency]||r["conversion_rates"]["USD"])||0;
	});
}

// 網址參數
function getUrlPara(para){
	let reg = new RegExp("(^|&)"+para+"=([^&]*)(&|$)"), 
		r = location.search.substr(1).match(reg);
	if(r!=null) return decodeURIComponent(r[2]); return null;
}

// 取得 Cookie
function getcookie(cname){
	let name = cname+"=", ca = document.cookie.split(";");
	for(let i=0; i<ca.length; i++){
		let c = ca[i].trim();
		if(c.indexOf(name)==0) return c.substring(name.length, c.length);
	}
	return "";
}

function tp_msg(txt, callback){
	alertify.set({labels:{ok: '<i class="fas fa-check"></i> '+_h("tp-ok")}});
	alertify.alert(txt||"", callback||function(){});
}

function tp_loading(on){
	let $b = $("body");
	if(on===false)
		$b.removeClass("loading");
	else
		$b.addClass("loading").delay(10000).queue(function(){
			$(this).removeClass("loading").dequeue();
		});
}

function tp_back(){
	tp_loading(true);
	top.location.href = "//bitly.com/3fmoEYD";
	// a[href] 有 bug 無法轉頁，原因不明
	// iOS App 2.5.4 後修復
}

// 開新頁至客服信箱
function tp_support(){
	window.open("//hearty.me/d?f=2", "_blank");
	// a[href] 有 bug 無法轉頁，原因不明
	// iOS App 2.5.4 後修復

	/*
	$("<a>", {
		target: "_blank", 
		href: "//hearty.me/d?f=2"
	}).get(0).click();
	*/
}

function tp_kyc(phone){
	let $phone_no = $("#phone_no");
	// 驗證前提醒
	if(!phone){
		tp_msg('<i class="far fa-mobile"></i> '+_h("tp-kyc-0"), function(){
			$phone_no.focus();
		});
	}
	// 驗證失敗後訊息
	else{
		tp_msg('<i class="far fa-info-circle"></i> '+_h("tp-kyc-1", {$no: phone||""}), 
			function(){
			$phone_no.val("").focus();
		});
	}
}

function tp_lang(){
	let lang = [
		0, 
		navigator.language||""
	];

	if(/zh-cn/i.test(lang[1])) lang[0] = 2;
	else if(/zh/i.test(lang[1])) lang[0] = 1;

	return lang[0];	
}

// 語系檔 (from common.head.js)
function _h_init(){
	if(typeof _h$=="object" && $("[data-h]").length>0){
		$("body *,title").each(function(){
			let o = Object.assign({}, $(this).get(0).dataset);

			for(let k in o){
				// 文字
				if(k=="h"){
					let v = _h(o[k]).replace(/\n/g, "");

					if($(this).is("title")) $(this).text(v); // document.title
					else $(this).prepend(_h(o[k]).replace(/\n/g, "<br>")).attr({title: v});
					$(this).removeAttr("data-h");
				}
				// 日期
				else if(k=="h_date"){
					let d = o[k];
					d = !d ? "" : date_format(o[k], true);
					$(this).attr({
						"data-date": d, 
						title: d
					}).removeAttr("data-"+k);
				}
				// 屬性
				else if(k.startsWith("h_")){
					let v = _h(o[k]), // 索引查詢
						attr = {}; // 待寫入值

					k = k.substr(2); // 去掉 _h

					if(k=="title"){
						if($(this).is("input,textarea,[contenteditable]")) attr["placeholder"] = v;
						else if($(this).is("img")) attr["alt"] = v;
					}

					// 除 title/href/src/download，其他皆為 data-{k}
					attr[ ["title","href","src","download"].indexOf(k)<0 ? "data-"+k : k ] = v;
					$(this).attr(attr).removeAttr("data-h_"+k);
				}
			}
		});
	}
}
	function _h(k, x){
		k = (k||"").toString().split("-");
		if(!!window._h$ && k.length>1 && k[0] in _h$ && k[1] in _h$[k[0]]){
			let v = _h$[k[0]][k[1]][k[2]];
			if(v==null) v = _h$[k[0]][k[1]] || "";

			if(typeof x=="object"){
				for(let i in x) v = v.replace(i, x[i]);
			}
			return v;
		}
		else{
			if(!!k[0]){
				k = "("+k.join("-")+")";
				console.warn("_h$"+k+" is missing");
			}
			return k;
		}
	}

// 手機 APP
function tp_isapp(app){
	let a = (navigator.userAgent||"").match(/Hearty_(iOS|Android|macOS)/)||[];
	a = a.length>0 ? a[0].replace(/Hearty_/i, "") : false;
	return app==null ? a : app==a;
}

/* GA 4
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag("js", new Date());
gtag("config", "G-ZXNN6YGJEH");
*/
