"use strict";

$.ajaxSetup({scriptCharset: "utf-8", cache: true});
$.wait = function(ms){
	var d = $.Deferred();
	setTimeout(function(){
		d.resolve();
	}, ms);
	return d;
};

$(function(){
	_h_init(); // 語系檔
	hj_firebase_init();
});

check_hostname();

if(typeof dataLayer!="undefined"){
	try{
		dataLayer.push({"event": "hearty_test"});
	}
	catch(e){}
}

// 通用更新
function hj_update(d){
	return $.ajax({
		url: "/update", 
		type: "POST", 
		dataType: "json", 
		data: d, 
		async: true
	});
}
	function update(d){
		let r = $.ajax({
			url: "/update", 
			type: "POST", 
			dataType: "json", 
			data: d, 
			async: false, 
			success: function(v){
				return $(v)["selector"];
			}
		});
		return r.status>=200 && r.status<300 || r.status==304 ? 
			JSON.parse(r.responseText) : false;
	}

function is_touch_device(){
	return ("ontouchstart" in window || ("maxTouchPoints" in navigator && navigator.maxTouchPoints>0)) && !matchMedia("(pointer:fine)").matches;
}

function check_OS(os){
	let u = navigator.userAgent || "", 
		d = /iP(ad|hone|od)|watchOS/i.test(u) ? ["iOS"] : 
			u.match(/Windows|Macintosh|Android|Linux/gi) || [];
	d = d.length>0 ? d.slice(-1)[0] : "";

	// iPadOS
	if(d=="Macintosh" && is_touch_device()) d = "iOS";

	return os==null ? d : os==d;
}
function check_browser(browser){
	let u = navigator.userAgent || "", 
		b = /^((?!chrome|android).)*safari|Hearty_(iOS|macOS)/i.test(u) ? ["Safari"] : 
			u.match(/(HuaWei|Ya|UC|QQ|BIDU|LB|Oppo|Miui|Vivo)browser|MetaSr|Maxthon|Edg(e|)|Opera(| Mini)|OPR|Firefox|Chrom(e|ium)|Trident|MSIE/gi) || [];
	b = b.length>0 ? b[b.length-1] : "";
	return browser==null ? b : browser==b;
}
function check_hjapp(app){
	let a = (navigator.userAgent || "").match(/Hearty_(iOS|Android|macOS)/) || [];
	a = a.length>0 ? a[0].replace(/Hearty_/i, "") : false;
	return app==null ? a : app==a;
}

// PWA, including: chromeless shortcuts & UWP on Microsoft Store
function check_hjpwa(){
	return matchMedia("(display-mode:standalone)").matches;
}

function hj_getScript(url, onsuccess, onerror, attrs){
	return $.ajax({
		type: "GET", 
		dataType: "script", 
		url: url, 
		success: onsuccess || {}, 
		error: onerror || {}, 
		cache: true, 
		scriptCharset: "utf-8", 
		attrs: attrs || {}
	});
}
	function hj_getScript_npm(path, onsuccess, onerror){
		path = path || "jquery@3.7.1/dist/jquery.min.js";
		onsuccess = onsuccess || {};
		onerror = onerror || {};

		return hj_getScript("//cdn.jsdelivr.net/npm/"+path, onsuccess, function(){
			return hj_getScript("//unpkg.com/"+path, onsuccess, onerror);
		});
	}
	function hj_getScript_gh(p, onsuccess, onerror){
		p = p || {};
			p["repo"] = "repo" in p ? p["repo"] : "heartyme/web.hearty.me";
			p["path"] = "path" in p ? p["path"] : "";
			p["commit"] = "commit" in p ? p["commit"] : 41214; // "main"

		onsuccess = onsuccess || {};
		onerror = onerror || {};

		return hj_getScript("//cdn.jsdelivr.net/gh/"+p["repo"]+"@"+p["commit"]+"/"+p["path"], onsuccess, function(){
			return hj_getScript("//fastly.jsdelivr.net/gh/"+p["repo"]+"/"+p["commit"]+"/"+p["path"], onsuccess, onerror);
		});
	}
	function hcaptcha_init(f){
		if("hcaptcha" in window){
			f();
		}
		else{
			hj_loading();
			hj_getScript("//js.hcaptcha.com/1/api.js").then(function(){
				hj_loading(false);
			}).then(f);
		}
	}

function hj_getFile(url, filename, callback){
	if("fetch" in window){
		alertify.success('<i class="fas fa-arrow-alt-to-bottom"></i> '+(filename || _h("h-downloading")));

		hj_loading();
		return fetch("//"+url, {
			method: "GET", 
			mode: "cors", 
			cache: "force-cache", 
			redirect: "error"
		}).then(function(r){
			if(!r.ok) throw new Error();
			return r.blob();
		}).then(function(b){
			let u = (window.URL||window.webkitURL).createObjectURL(b);
			$("<a>", {
				href: u, 
				download: decodeURIComponent(filename || url.split("/").slice(-1)[0] || "")
			}).get(0).click();
			(window.URL||window.webkitURL).revokeObjectURL(u);

			if(typeof callback=="function") callback();
		}).catch(function(){
			open_url("//"+url);
		}).finally(function(){
			hj_loading(false);
		});
	}
	else{
		open_url("//"+url);
	}
}

function hj_jsdelivr(){
	return "//cdn.jsdelivr.net/gh/heartyme/web.hearty.me@41214/";
}

// 語系檔
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

function check_hostname(){
	// 禁用外部 iframe
	if(top.location.hostname.split(".").splice(-2).join(".")!=self.location.hostname.split(".").splice(-2).join(".")){
		top.location.href = self.location.href;
	}
	else if(location.hostname!="hearty.me"){
		let u = location.href.replace(location.hostname, "hearty.me");
		$(function(){
			msg('<h3><i class="far fa-wrench"></i> Testing Purposes Only</h3><i class="fab fa-cloudflare"></i> "<u>'+location.hostname+'</u>" is used to demonstrate a known bug, please use the service on our primary domain: <u>hearty.me</u> to prevent issues.', "Back", function(){
				top.location.href = u;
			});
		});
		setTimeout(function(){top.location.href = u;}, 10000);
	}
}

// CSS 支援檢查
function cssFeatureSupported(prop, value){
	if("CSS" in window){
		return CSS.supports(prop, value);
	}
	else{
		let d = document.createElement("div");
		d.style[prop] = value;
	 	return d.style[prop]==value;
	}
}

// 網址參數
function getUrlPara(para){
	return new URLSearchParams(window.location.search).get(para);
}
	/*
	function getUrlPara(para){
		let reg = new RegExp("(^|&)"+para+"=([^&]*)(&|$)"), 
			r = location.search.substr(1).match(reg);
		if(r!=null) return decodeURIComponent(r[2]); return null;
	}
	*/

// 取得 Cookie
function getcookie(cname){
	let name = cname+"=", ca = document.cookie.split(";");
	for(let i=0; i<ca.length; i++){
		let c = ca[i].trim();
		if(c.indexOf(name)==0) return c.substring(name.length, c.length);
	}
	return "";
}

// 設定 Cookie
function setcookie(cname, val, days_added){
	if(typeof val=="undefined") val = "";

	let d = new Date();
	d.setDate(d.getDate()+(days_added||1));
	document.cookie = (cname||"")+"="+val+";expires="+d.toGMTString()+";domain=."+document.domain+";path=/;samesite=lax;secure";
}

// 預設訊息
function hj_alert(t){
	alert(t);
}

// 振動
function hj_vibrate(s){
	let v = "vibrate" in navigator;
	if(v) navigator.vibrate([s||80]);
	return v;
}

// 外開連結
function open_url(l){
	// 當 Android App 使用 onclick 將會開到前一張載入的圖片，因而改用 wvtab=1
	// if(!window.hj_test && check_hjapp("Android"))
	if(check_hjapp("Android"))
		location.href = l+(l.indexOf("?")>0 ? "&":"?")+"wvtab=1";
	else
		window.open(l, "_blank");
}

function account_status(){
	return hj_update({action: "account_status"});
}

function msg(txt, btn, callback){
	txt = (txt || "").toString();
	btn = btn || _h("h-ok");
	callback = callback || function(){};

	if($(".alertify-cover:visible").length>0){
		$.wait(1500).then(function(){
			msg(txt, btn, callback);
		});
	}
	else{
		alertify.set({labels:{ok: btn}});
		alertify.alert(txt || '<i class="far fa-info-circle"></i> '+_h("h-err"), callback);
	}
}

function alertify_input_custom(a, c){
	let $a = $("#alertify .alertify-text");
	if(!(a==null) && typeof a=="object"){
		if(a.type=="password") $a.wrap("<form></form>"); // Password field should be contained in a form: https://www.chromium.org/developers/design-documents/create-amazing-password-forms/
		if(!("autocomplete" in a)) a["autocomplete"] = "off";
		if(!("autocapitalize" in a)) a["autocapitalize"] = "off";
		a["required"] = "";
		$a.attr(a);
	}
	if(!(c==null) && typeof c=="object"){
		$a.css(c);
	}
	return $a;
}
	function alertify_input_shake(){
		return shake($("#alertify .alertify-text"));
	}

// Enter 鍵
function press_enter(e, action){
	if((e.keyCode ? e.keyCode : e.which)==13){
		if(action.indexOf("(")>0) eval(action);
		else eval(action+'();');
	}
}

// Google 表單
function gform_post(uri, data){
	if("fetch" in window && "URLSearchParams" in window){
		data = data || [];
		if(!data["emailAddress"]) data["emailAddress"] = getcookie("hearty_em")||"guest@hearty.me";

		return fetch("//docs.google.com/forms/d/e/"+uri+"/formResponse", {
			method: "POST", 
			mode: "no-cors", 
			body: new URLSearchParams(data)
		});
	}
}

// 短網址
function url_shortener(path, is_short, title, img, desc){
	path = (path || "").replace(location.origin+"/", ""); // 剔除域名

	let host = "https://hearty.me/", 
		utm = "utm_source=hj.rs&utm_medium=hj.rs&utm_campaign=hj.rs", 
		uri = path+(path.indexOf("?")<0?"?":"&")+utm, 
		url = encodeURIComponent(host+uri);

	uri = encodeURIComponent(uri);
	title = encodeURIComponent(title || document.title);
	img = encodeURIComponent(img || "https://i.hearty.app/i/illustrations/sheara.jpg?o=1");
	desc = encodeURIComponent(desc || "Hearty Journal 溫度日記："+host+path);

	return $.ajax({
		url: "//hj.rs/_/get", 
		type: "POST", 
		crossDomain: true, 
		async: true, 
		headers: {Accept: "application/json"}, 
		contentType: "application/json", 
		dataType: "json", 
		data: JSON.stringify({
			suffix: {option: is_short ? "SHORT" : "UNGUESSABLE"}, 
			longDynamicLink: "https://app.hj.rs/?link="+host+"wv?p%3D"+uri+"&apn=com.hearty.me&amv=60&afl="+url+"&ibi=com.hearty.me&isi=1423459636&ifl="+url+"&st="+title+"&sd="+desc+"&si="+img+"&at=1010lPJU&ct=hj.rs&mt=8&pt=119194312&ofl="+url+"&"+utm
		})
	}).then(function(j){
		if("shortLink" in j){
			let shortened = (j["shortLink"]||"").split("/").slice(-1).toString();

			// forms.gle/TnbqbGpguryiP6UR6
			gform_post("1FAIpQLSdSBwn2jYQoGxa4_IavoY_PTzhEN-j7drarxHa9lYQSDNKVdQ", {
				"entry.1786867398": "https://hj.rs/"+shortened, 
				"entry.596740612": host+path, 
				"entry.1965404500": check_browser()+", "+check_OS(), 
				"entry.178006682": today(8)
			});

			/*
			hj_update({
				action: "gform_post", 
				uri: "1FAIpQLSdSBwn2jYQoGxa4_IavoY_PTzhEN-j7drarxHa9lYQSDNKVdQ", 
				data: $.param({
					"entry.1179854838": "[hj_user_id]", 
					"entry.1215682547": "[hj_username]", 
					"emailAddress": "[hj_email]", 
					"entry.1786867398": "https://hj.rs/"+shortened, 
					"entry.596740612": host+path, 
					"entry.1965404500": check_browser()+", "+check_OS(), 
					"entry.178006682": new Date((new Date).getTime()+288e5).toISOString().split("T")[0]
				})
			});
			*/
			return shortened;
		}
		else{
			return false;
		}
	});

	/* ALT:
	if("fetch" in window){
		return fetch("//hj.rs/_/get", {
			method: "POST", 
			mode: "cors", 
			cache: "no-cache", 
			headers: {Accept: "application/json"}, 
			body: JSON.stringify({
				suffix: {option: is_short ? "SHORT" : "UNGUESSABLE"}, 
				longDynamicLink: "https://app.hj.rs/?link=https://hearty.me/wv?p%3D"+uri+"&apn=com.hearty.me&amv=59&afl="+url+"&ibi=com.hearty.me&isi=1423459636&ifl="+url+"&st="+title+"&sd="+desc+"&si="+img+"&at=1010lPJU&ct=hj.rs&mt=8&pt=119194312&ofl="+url+"&"+utm
			})
		}).then((r) => {
			return r.json();
		}).then((j) => {
			return ("shortLink" in j) ? (j["shortLink"]||"").replace("app.hj.rs","hj.rs") : false;
		}).catch((e) => {
			console.warn("😵 Error: "+JSON.stringify(e));
		});
	}
	*/
}

// QRcode
function get_qrcode($qr, url, fn){
	$qr = $qr || $(".qrcode");

	if("QRCode" in window){
		let icon = "//i.hearty.app/b/images/qrcode.icon.png?o=1";

		new QRCode($qr.html("").get(0), {
			text: url || location.href.replace("//hearty.me", "//hearty.app"), 
			width: 180, 
			height: 180, 
			dotScale: 0.8, 
			colorDark : "#555",
			colorLight : "#fff",
			correctLevel : QRCode.CorrectLevel.H, // L, M, Q, H

			logo: icon, 
			backgroundImage: icon, 
			backgroundImageAlpha: 0.1,

			PO: "#a78d8d", 
			PI: "#bdaaaa", 

			// alignment color
			AO: "#bdaaaa", 
			AI: "#a78d8d", 

			crossOrigin: "anonymous", 
			onRenderingEnd: function(options, datauri){
				$qr.attr({
					href: datauri, 
					download: fn || _h("h-qr"), 
					title: _h("h-qr")
				}).slideDown().css({cursor: "s-resize"});
			}
		});
	}
	else{
		hj_getScript_gh({
			repo: "ushelp/EasyQRCodeJS", 
			path: "dist/easy.qrcode.min.js", 
			commit: "4.6.1"
		}, function(){
			get_qrcode($qr, url, fn);
		});
	}
}

// 現在時戳
function timestamping(){
	return Date.now()/1e3|0;
}

function today(tz_diff){
	// YYYY-MM-DD
	// GMT+8: today(8);
	// GMT: today(0);
	// localtime: today();

	tz_diff = parseInt(tz_diff);
	if(isNaN(tz_diff))
		return new Date().toLocaleDateString("sv");
	else
		return new Date((new Date).getTime()+tz_diff*3600000).toISOString().split("T")[0]; // GMT+8
}

// 當地日期
function date_format(d, inclue_year){
	if(!d){
		d = new Date();
	}
	// 日期字串：yyyy-mm-dd
	else if(isNaN(d)){
		d = new Date(d);
	}
	// 數字時戳
	else{
		d = new Date(parseInt(d)*1000);
	}

	let opt = {month: "short", day: "numeric"};
	if(inclue_year) opt["year"] = "numeric";

	return d.toLocaleDateString(hj_lang(), opt);
}

// 動態式呼叫 JS 函數
function dynamic_function(fn){
	this[fn].apply(null, Array.prototype.slice.call(arguments, 1));
}

// 特殊字元消毒
function htmlspecialchars(str){
	return !!str ? str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;') : "";
}
function htmlDecode(i){
	return $("<i>").html(i || "").text();
	/* Alt: 
		let e = document.createElement("i");
		e.innerHTML = i || " ";
		return e.childNodes[0].nodeValue;
	*/
}

// 抖動
function shake($e){
	let l = 20;
	for(let i=0; i<8; i++)
		$e.animate({
			"margin-left": "+="+(l=-l)+"px",
			"margin-right": "-="+l+"px"
		}, 50);

	return $e;
}

function nth(n){
	// stackoverflow.com/a/39466341
	return [,"st","nd","rd"][n/10%10^1&&n%10]||"th";
}

// 跳脫 Line 內建瀏覽器
function leave_InAppBrowser(){
	let o = getUrlPara("openExternalBrowser");
	if((navigator.userAgent || "").indexOf("Line/")>0 && !o){
		let u = location.href;
		location.href = u+(u.indexOf("?")>0 ? "&":"?")+"openExternalBrowser=1";
	}
	else if(o){
		try{
			let u = new URL(location);
			u.searchParams.delete("openExternalBrowser");

			if(typeof history.replaceState=="function")
				history.replaceState(
					{}, 
					document.title, 
					u.pathname+u.search
				);
		}
		catch(e){}
	}
}

function numberWithCommas(x){
	return (x||"").toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")||"0";
	// return Number(x).toLocaleString();
}

// 首字大寫
function capitalizeFirstLetter(str){
	return str==null ? "" : str.charAt(0).toUpperCase()+str.slice(1);
}

function ga_evt_push(evt, val){
	if(!evt) return;

	// GA
	if(typeof gtag!="undefined"){
		try{
			gtag("event", evt, val);
		}
		catch(e){}
	}
	/* GA 4
	if(typeof dataLayer!="undefined"){
		try{
			window.dataLayer.push({"event": evt});
		}
		catch(e){}
	}
	*/

	// Mixpanel
	if(typeof mixpanel!="undefined"){
		try{
			if(!val) mixpanel.track(evt);
			else mixpanel.track(evt, val);
		}
		catch(e){}
	}

	fa_evt_push(evt, val);
}
	// Firebase Analytics
	function fa_evt_push(evt, val){
		// cdn.jsdelivr.net/npm/firebase@8.10.1/firebase-analytics.js
		try{
			// Android
			if(window.hj_AnalyticsWebInterface) 
				window.hj_AnalyticsWebInterface.logEvent(evt, JSON.stringify(val));

			// iOS
			else if(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.hj_AnalyticsWebInterface) 
				window.webkit.messageHandlers.hj_AnalyticsWebInterface.postMessage({
					command: "logEvent", name: evt, parameters: val
				});

			// Web
			else if(typeof firebase!="undefined" && "analytics" in firebase) 
				firebase.analytics().logEvent(evt, val);
		}
		catch(e){}
	}

function fb_evt_push(evt, val){
	if(!evt) return;

	// fb.com/business/help/402791146561655
	let is_custom = ["AddPaymentInfo","AddToCart","AddToWishlist","CompleteRegistration","Contact","CustomizeProduct","Donate","FindLocation","InitiateCheckout","Lead","Purchase","Schedule","Search","StartTrial","SubmitApplication","Subscribe","ViewContent"].indexOf(evt)<0;

	if(typeof fbq!="undefined"){
		try{
			fbq("track"+(is_custom ? "Custom" : ""), evt, val);
		}
		catch(e){}
	}

	// 只傳送標準事件
	if(!is_custom){
		// LINE Tag
		if(evt!="Purchase") ln_evt_push(evt);

		// Dcard Pixel
		if(typeof dadk!="undefined"){
			try{
				window.dadk("track", evt);
			}
			catch(e){}
		}
	}
}
// LINE Tag
function ln_evt_push(evt){
	if(typeof _lt!="undefined"){
		try{
			_lt("send", "cv", {
				type: evt
			},["91b6ece5-a435-4ac9-9119-d8973be6322e"]);

			if(evt=="CompleteRegistration") ln_evt_push("Conversion");
		}
		catch(e){}
	}
}
	function ga_event_push(evt, val){
		ga_evt_push(evt, val);
		console.warn("fn ga_event_push is renamed to ga_evt_push");
	}
	function fb_event_push(custom, evt, val){
		fb_evt_push(evt, val);
		console.warn("fn fb_event_push is renamed to fb_evt_push");
	}
	// merged to ga_event_push
	function hj_mixpanel(e, p){
		if(!e) return;
		if(typeof mixpanel!="undefined"){
			if(!p) mixpanel.track(e);
			else mixpanel.track(e, p);
		}
		console.warn("fn hj_mixpanel is deprecated (merged to ga_evt_push)");
	}

function scroll2focused($e){
	$e = $e || $("body");

	$e.find("input").filter("[type='text'],[type='email'],[type='number'],[type='date'],[type='tel'],[type='url']").add($e.find("textarea")).focus(function(){
		/*
		if("scrollIntoViewIfNeeded" in document.activeElement)
			document.activeElement.scrollIntoViewIfNeeded();
		*/
		$("html,body").animate({
			scrollTop: $(this).offset().top-($(window).innerHeight()/4)+"px"
		}, "fast");
	});
}

// 原生複製
function hj_copy($e, t){
	if($e.length>0){
		select_input_text($e);
		
		let c = document.execCommand("Copy", false, null);
		if(c) alertify.success('<i class="far fa-copy"></i> '+(t || _h("h-copy")));
		$e.blur();
		return c;
	}
	else{
		return false;
	}
}
	function hj_copy_text(t){
		t = t || "";
		let $e = $("[data-clipboard]");
		if(!$e.length){
			$e = $("<input>", {
				type: "text", 
				value: t, 
				"data-clipboard": ""
			}).appendTo("body");
		}
		else{
			$e.val(t);
		}
		hj_copy($e.show());
		$e.hide();
	}
	function select_input_text($e){
		if($e.length>0){
			if($e.is("input") && check_OS("iOS")){ // iOS Polyfill
				$e.get(0).focus();
				$e.get(0).setSelectionRange(0,9999);
			}
			else{
				$e.select();
			}
		}
	}

// iOS 頁面捲動錯位修正 (鍵盤彈回後)
function ios_body_position_fix(){
	window.scroll(0,0);
}

function hj_lang(){
	return ($("script[data-lang]").attr("data-lang") || navigator.language || "zh-TW").toLowerCase();
}
	function hj_lang_zhcn(){
		return /zh-CN/i.test(hj_lang());
	}

function hj_ip(alt){
	// Cloudflare
	return $.ajax({
		type: "GET", 
		url: (alt ? "//api.hearty.app" : "")+"/cdn-cgi/trace", 
		async: true, 
		crossDomain: true, 
		dataType: "text"
	}).then(function(d){
		try{
			d = (d||"").replace(/[\r\n]+/g, '","').replace(/\=+/g, '":"');
			d = JSON.parse('{"'+d.slice(0, d.lastIndexOf('","'))+'"}');
			return d;
		}
		catch(e){
			return hj_ip_alt();
		}
	}).fail(function(){
		return hj_ip_alt();
	});
}
	function hj_ip_alt(alt){
		// stackoverflow.com/a/67453686
		return $.ajax({
			type: "GET", 
			url: "//"+(alt ? "myexternalip.com/json" : "ip.heartymail.com"), 
			async: true, 
			crossDomain: true, 
			dataType: "json"
		}).then(function(d){
			return ((d["ip"]||"").split(",")[0]).trim();
		}).then(function(ip){
			return $.ajax({
				type: "GET", 
				url: "//api.hearty.app/ip/"+ip, 
				crossDomain: true, 
				async: true, 
				dataType: "json"
			}).then(function(d){
				return {
					ip: ip, 
					loc: d.countryCode || ""
				};
			});
		});
	}

function hj_localize_cn(){
	let sc = /zh-(CN|SG|MY)/i.test(hj_lang());
	if(sc){
		hj_getScript_gh({
			path: "js/diary.zhongwen.min.js", 
			// commit: "41214"
		}, function(){
			if(typeof zh_translatePage=="function") zh_translatePage();
			ga_evt_push("zhSC");
		});
	}
	return sc;
}

function hj_rate(){
	if(check_OS("Android")){
		alertify.set({labels: {ok: "😕　"+_h("h-satisfy-2"), cancel: "😘　"+_h("h-satisfy-1")}, buttonReverse: true});
		alertify.confirm("💕 "+_h("h-satisfy-0"), function(e){
			if(e) open_url("//bitly.com/3H9iHLl");
			else hj_rating();
		});
		setcookie("hearty_rated", 1, 30);
	}
	else{
		hj_rating();
	}
}
	function hj_rating(param){
		let t = _h("h-rate-0")+'<br><i class="fal fa-star"></i> <i class="fal fa-star"></i> <i class="fal fa-star"></i> <i class="fal fa-star"></i> <i class="fal fa-star"></i>';
		/* Google 商家連結：
			bitly.com/2YRuw7z
			g.co/kgs/mpL8GH#lkt=LocalPoiReviews
			g.page/heartyme/review
		*/

		// 第 1步
		if(param==null){
			let r = {
					Google: ['<i class="fab fa-google"></i> Google', "//hearty.me/wv?o=bitly.com/2YRuw7z"], 
					iOS: ['<i class="fab fa-app-store"></i> App Store', "//hearty.me/wv?o=apps.apple.com/app/id1423459636?action=write-review"], 
					Android: ['<i class="fab fa-google-play"></i> Android', "market://details?id=com.hearty.me&showAllReviews=true"]
				}, 
				a = ((check_hjapp()||"").match(/iOS|Android/)||[])[0];

			if(!is_touch_device()){ // 電腦網頁
				open_url("//bit.ly/3WCa2e9");
				msg('<i class="fal fa-flower"></i> '+_h("h-rate-2"), _h("h-rate-3")+' <i class="fas fa-kiss-wink-heart"></i>');
			}
			else if(!a){ // 手機網頁
				open_url("//bitly.com/2YRuw7z");
			}
			else{ // App
				alertify.set({labels: {ok: r["Google"][0], cancel: r[a][0]}, buttonReverse: true});
				alertify.confirm(t+"<br><br>"+_h("h-rate-1"), function(e){
					if(e){
						location.assign(r["Google"][1]);
						hj_rating(r[a]);
					}
					else{
						location.assign(r[a][1]);
						hj_rating(r["Google"]);
					}
				});

				// 呼叫 iOS 原生給評視窗
				location.assign("//hearty.me/wv?r=rating");
			}
			setcookie("hearty_rated", 1, 30);
		}
		// 第 2步
		else{
			msg(t, param[0], function(){
				location.assign(param[1]);
			});
		}
	}

function get_app(os, cp){
	os = os || check_OS();
	cp = cp || "topbar";

	let cn = hj_lang_zhcn(), 
		dl = {
			Android: {
				apk: "//cdn.jsdelivr.net/gh/chennien/d.hearty.app@main/android/Hearty%20Journal.apk", 
				play: "//go.hearty.me/hj_android_"+cp, 
				market: "market://details?id=com.hearty.me&showAllReviews=true"
			}, 
			iOS: "//apps.apple.com/"+(cn?"cn/":(/zh/i.test(hj_lang())?"tw/":""))+"app/id1423459636?pt=119194312&at=1010lPJU&mt=8&ct="+cp, 
			clip: "//cdn.jsdelivr.net/gh/chennien/d.hearty.app@0/ios/Hearty%20Journal.mobileconfig", 
			UWP: "//bitly.com/3ynmYFL"
		}, 
		is_Android = check_OS("Android"), 
		fname = /zh/i.test(hj_lang()) ? "溫度日記" : "Hearty Journal";

	switch(os){
		case "Android":
			if(cn){
				alertify.set({labels: {ok: '<i class="fas fa-arrow-to-bottom"></i> 以 APK 安裝', cancel: '<i class="fab fa-google-play"></i> Google Play'}, buttonReverse: true});
				alertify.confirm('<i class="fab fa-android"></i> 安卓版 App', function(e){
					open_url(dl["Android"][e ? "apk" : "play"]);
				});
			}
			else if(!is_Android){
				open_url(dl["Android"]["play"]);
				get_app_events(os, cp); return;
			}
				open_url(dl["Android"]["market"]);
				get_app_events(os, cp);
		break;

		case "iOS":
			open_url(dl["iOS"]);
			get_app_events(os, cp);
		break;

		case "Windows":
			let ua = navigator.userAgent || "", 
				browser = check_browser(), 
				ver = "default", 
				cpu = /(Win|WOW|x)64|ARM/i.test(ua)||!check_OS("Windows") ? "" : "/x86";

			if(browser=="Chrome") ver = "chrome";
			else if(ua.indexOf("Windows NT 1")>0||browser=="Edg") ver = "edge";

			hj_getFile("d.hearty.app/win/"+ver+(
					/zh/i.test(navigator.language||"") ? "" : "/2022" // Sectigo Codesigned
				)+cpu+"/Hearty%20Journal.exe", fname+".exe", function(){
				msg('<img src="//i.hearty.app/AhGZgWy.png">');
			});
			/* TW  Codesigned
			hj_getFile("d.hearty.app/win/"+ver+cpu+"/Hearty%20Journal.exe", fname+".exe", function(){
				msg('<img src="//i.hearty.app/AhGZgWy.png">');
			});
			*/

			get_app_events(os+" ("+browser+")", cp);
		break;

		case "Macintosh":
			hj_getFile("cdn.jsdelivr.net/gh/chennien/d.hearty.app@1/mac/Hearty%20Journal.dmg", fname+".dmg");
			get_app_events("macOS", cp);
		break;

		case "UWP":
			open_url(dl["UWP"]);
		break;

		default:
			alertify.set({labels: {ok: '<i class="fab fa-android"></i> Android', cancel: '<i class="fab fa-apple"></i> iOS'}, buttonReverse: true});
			alertify.confirm('<i class="fal fa-mobile"></i> '+_h("i-title-0")+" | App", function(e){
				if(e){
					if(cn){
						alertify.set({labels: {ok: '<i class="fas fa-arrow-to-bottom"></i> 以 APK 安装', cancel: '<i class="fab fa-google-play"></i> Google Play'}, buttonReverse: true});
						alertify.confirm('<i class="fab fa-android"></i> 安卓应用程序', function(e){
							if(e){
								if(is_Android){
									open_url(dl["Android"]["apk"]);
								}
								else{
									msg('<i class="fal fa-qrcode"></i> 扫描二维码，以下载 APK：<br><a target="_blank" href="'+dl["Android"]["apk"]+'"><img src="//i.hearty.app/bSpa73m.png" title="下载 APK"></a>', "扫描了");
								}
							}
							else{
								open_url(dl["Android"]["play"]);
							}
						});
					}
					else{
						open_url(dl["Android"]["play"]);
					}
				}
				else{
					open_url(dl["iOS"]);
				}
				get_app_events(e?"Android":"iOS", cp);
			});
		break;
	}
}
	function get_app_events(os, cp){
		os = os || "";
		ga_evt_push("Get App", {
			event_category: "Apps", 
			event_label: os
		});
	}

// FCM
function hj_firebase_init(){
	if(!!window.firebase){
		firebase.initializeApp({
			apiKey: "AIzaSyAfAW9Zrxe1p-7VGwvCFRVrogSfxLvfptU",
			authDomain: "hearty-me.firebaseapp.com",
			databaseURL: "https://hearty-me.firebaseio.com",
			projectId: "hearty-me",
			storageBucket: "hearty-me.appspot.com",
			messagingSenderId: "61745568427",
			appId: "1:61745568427:web:d7cc2cd1fdd72814b335ee",
			measurementId: "G-TY63VJYXKY"
		});

		if(!check_hjapp() && firebase.messaging.isSupported()){
			let m = firebase.messaging();
			m.usePublicVapidKey("BJGwjWY6MviBp3gKYq8yjJ7LQT-TUBfWphAMmq3biKDqINUv1s6l_qkvyEqF27ox3sxOoJCO_B7VDFS2qtYqozk");
			m.onMessage((payload) => {
				let d = payload["data"];
				new Notification(d["title"], {
					body: d["body"], 
					icon: d["badge"]
				});
			});

			if(!!window.Notification && Notification.permission=="granted") hj_fcm_init();
		}

		// Firebase Analytics for Web
		if("analytics" in firebase){
			firebase.analytics.isSupported().then((isSupported) => {
				if(isSupported) firebase.analytics();
			});
		}
	}
}

function hj_fcm_init(onfinish){
	onfinish = onfinish || function(){};

	if(/iOS|Android/i.test(check_hjapp())){
		location.assign("//hearty.me/wv?r=pushnotification"+(!window.hj_username ? "" : "&username="+hj_username));
		onfinish();
	}
	// && Notification.permission=="granted"
	else if(!!window.Notification && !!window.firebase && firebase.messaging.isSupported()){
		Notification.requestPermission().then((permission) => {
			switch(permission){
				case "granted":
					let m = firebase.messaging();
					m.getToken().then((currentToken) => {
						if(currentToken){
							hj_fcm_register(currentToken, onfinish);
						}
						else{
							onfinish();
							// console.warn("No Instance ID token available. Request permission to generate one");
						}
					}).catch((e) => {
						onfinish();
						// console.warn("Error occurred while retrieving token. ", e);
					});

					m.onTokenRefresh(() => {
						m.getToken().then((refreshedToken) => {
							hj_fcm_register(refreshedToken, onfinish);
						}).catch((e) => {
							onfinish();
							// console.warn("Unable to retrieve refreshed token ", e);
						});
					});
				break;

				case "denied":
					let bucket = "hearty_notification_denied"; 
					if(!getcookie(bucket)){
						alertify.set({labels: {ok: _h("h-notify-3"), cancel: '<i class="fas fa-toggle-on"></i> '+_h("h-notify-2")}, buttonReverse: true});
						alertify.confirm('<i class="far fa-bell-slash"></i> '+_h("h-notify-0")+"<br>"+_h("h-notify-1")+' <i class="far fa-sad-tear"></i>', function(e){
							if(!e){
								switch(check_browser()){
									case "Safari":
										open_url("//support.apple.com/guide/safari/sfri40734/mac#ibrw95cba9bb");
									break;

									case "Firefox":
										open_url("//mzl.la/20jwSoU");
									break;

									default:
										open_url("//support.google.com/chrome/answer/3220216");
									break;
								}
							}
							setcookie(bucket, 1, 1);
							onfinish();
						});

						ga_evt_push("Push Notification Deny");
					}
					else{
						onfinish();
					}
				break;

				default:
					onfinish();
				break;
			}
		});
	}
	else{
		onfinish();
	}
}
	function hj_fcm_register(fcmtoken, onfinish){
		console.log("FCMtoken: "+fcmtoken);
		return hj_update({
			action: "fcm_register", 
			fcmtoken: fcmtoken, 
			on_mobile: +is_touch_device()
		}).then(onfinish).fail(onfinish);
	}

function hj_loading(on){
	let $b = $("body");
	if(on===false)
		$b.removeClass("loading");
	else
		$b.addClass("loading").delay(8000).queue(function(){
			$(this).removeClass("loading").dequeue();
		});
}

function hj_href(url){
	window.stop();
	hj_loading();
	url = url || "d";
	url = (url.indexOf("//")<0 ? location.origin+"/" : "")+url;
	top.location.href = url;
}
	function hj_go_href(uri){
		hj_href("//go.hearty.me/"+uri);
	}

function post_font(font_id){
	font_id = font_id || getcookie("hearty_post_font") || "";

	let fonts = [
		"openhuninn", // 0
		"taipeisans", // 1
		"openhuninn", // 2 (空號)
		"jinxuan", // 3
		"cream", // 4
		"wenkai", // 5
		"yozai", // 6
		"naikai", // 7
		"jasonwriting2", // 8
		"jasonwriting1", // 9
		"jasonwriting4", // 10
		"jasonwriting5", // 11
		"jasonwriting6", // 12
		"kurewa", // 13
		"nanifont", // 14
		"pop-gothic", // 15
		"starlovepencil", // 16
		"genyo", // 17
		"huiwen", // 18
		"ipencrane", // 19
		"lisu", // 20
		"yankai", // 21
		"weibei", // 22

		// 以下停用
		"jasonwriting3", // 23
		"caramel", // 24
		"bakudai", // 25
		"wind", // 26
		"fist", // 27
		"lihsianti", // 28
		"oyeh", // 29
		"liao", // 30
		"drechi" // 31
	];

	if(!font_id) return fonts;
	else font_id = parseInt(font_id);

	let font = fonts[font_id];
	if(!font){
		return false;
	}
	else{
		$("body").attr("data-font", font);
		setcookie("hearty_post_font", font_id, 90);
		return _h("a-fonts-"+font_id);
	}
}
