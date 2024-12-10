"use strict";

var btn_alias = "award";

if(/Edge|Trident|MSIE/i.test(check_browser())) 
	msg('<i class="fal fa-exclamation-circle"></i> IE 太舊囉，請改用其他瀏覽器<br>建議使用：<i class="fab fa-chrome"></i> Google Chrome');

$(function(){
	post_font();
	new SlideNav({changeHash: true});

	$(".fa-home-alt").on("click", function(){
		nav_toggle($(".menu"), true);
	});
	$(".award_nav select").on("input", function(){
		let fn = $(this).val() || "";
		hj_href("award/"+(!fn?"":fn+".php")+"?utm_source=web&utm_medium=award_nav&utm_campaign=award"+new Date().getFullYear()%100);
	});

	$(".apply_btn[data-publish]").on("click", function(){
		award_apply(publish_post);
	});
	$(".apply_btn[data-posts]").on("click", function(){
		open_url("//go.hearty.me/uyqjs");
	});


	$(".cert_request").on("click", cert_request);
	$(".mask").on("click", function(){
		$(this).fadeOut();
	});

	$(".nav_btn.fa-share-alt").on("click", hj_share_page);
	let $u = $(".nav_btn.fa-chevron-up");
	$(document).scroll(function(){
		if($(this).scrollTop()>200) $u.stop().fadeIn("fast");
		else $u.stop().fadeOut("fast");
	});
	$u.on("click", function(){
		$(document).scrollTop(0);
	}).hide();

	$("footer [data-rate]").on("click", hj_rating);

	// 申請參賽證明
	// go.hearty.me/hjawardcert 
	let cert = getUrlPara("cert");
	if(!!cert) cert_request(cert);

	hj_localize_cn();
	/*
	if(typeof history.replaceState=="function")
	history.replaceState(
		{}, 
		document.title, 
		"/award/"
	);
	*/
});
leave_InAppBrowser();

function award_apply(onfinish){
	onfinish = onfinish || publish_post;

	// 詢問開啟推播
	try{
		// Android App 上會閃退
		if(check_hjapp("Android")){
			onfinish();
		}
		else{
			$(".mask").show();
			hj_fcm_init(onfinish);
		}
	}
	catch(e){
		onfinish();
	}
}
	function publish_post(){
		$(".mask").hide();

		if(parseInt(today(8).replace(/-/g,""))>20250131)
			msg('<i class="fal fa-door-closed"></i> 本屆活動已截稿，歡迎下一屆再來參加 ヽ(✿´･ヮ･)ﾉ♡');
		else
			hj_href("//supr.link/Th3tP"); // award/post.php

		ga_evt_push("generate_lead"); fb_evt_push(!1, "Lead");
	}

/*
https://go.hearty.me/hjawardcert
https://hearty.me/award/?cert=5&utm_source=gform&utm_medium=award24&utm_campaign=award_cert&utm_term=award_cert
*/
function cert_request(evt_no){
	evt_no = parseInt(evt_no) || 5;

	alertify.set({labels: {ok: '<i class="fas fa-chevron-circle-right"></i> 下一步', cancel: "取消"}, buttonReverse: false});
	alertify.prompt('<i class="fal fa-file-certificate"></i> 申請參賽證明｜填寫真實姓名', function(e, name){
		if(e){
			name = htmlspecialchars(name || "");
			alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> 送出申請', cancel: "取消"}, buttonReverse: false});
			alertify.prompt('<i class="fal fa-info-circle"></i> 本次投稿的主題：<br><small>(送出後請稍待，製作約需 45秒)</small>', function(e, subject){
				if(e){
					subject = htmlspecialchars(subject || "");
					msg('<i class="fal fa-diploma"></i> 即將下載證書檔。。。', '<i class="fas fa-star"></i> 給 5顆星後，並查看下載', function(){
						open_url("//"+(
							is_touch_device() ? "bitly.com/2YRuw7z" : "bit.ly/3WCa2e9"
						));

						alertify.set({labels: {ok: "我已認證", cancel: '<i class="fas fa-arrow-circle-right"></i> 前往認證'}, buttonReverse: true});
						alertify.confirm('<i class="fal fa-user"></i> 提醒︰記得認證 Email 及手機，確保具備參賽資格', function(e){
							hj_href(
								(e ? "d" : "account")+"?utm_source=web&utm_medium=award_cert&utm_campaign=award"+new Date().getFullYear()%100
							);
						});
					});
					cert_generate(evt_no || 5, name, subject);

					// forms.gle/ETUZb1D6kccB62c29
					gform_post("1FAIpQLSdxyaMux3bC_QDoCGSOdGBfCD2bdffQRwlqOKmRRunvzs0DiQ", {
						"entry.783231433": getcookie("hearty_u"), 
						"entry.1564811012": getcookie("hearty_id"), 
						"emailAddress": getcookie("hearty_em"), 
						"entry.384841463": name, 
						"entry.136103873": subject, 
						"entry.1994102474": today(8)
					});

					ga_evt_push("Award Cert");
				}
			});
			alertify_input_custom({
				placeholder: "投稿文章標題", 
				minlength: 1, 
				maxlength: 20
			});
		}
	});
	alertify_input_custom({
		placeholder: "我的姓名", 
		minlength: 2, 
		maxlength: 16
	});

	if(!("jsPDF" in window)){
		hj_getScript_gh({
			repo: "parallax/jsPDF", 
			path: "dist/jspdf.min.js", 
			commit: "3c195a50ea88e54419875cf442acf1fe8a1c5386"
		});
	}
}

function cert_generate(evt_no, name, subject){
	name = name || "楊珈宜";
	subject = subject || "溫度日記";
	alertify.success('<i class="fal fa-arrow-alt-to-bottom"></i> 開始下載');

	try{
		let evt = [{
				alias: "happiness", // 0
				name: "小確幸"
			}, {
				alias: "dearmyself", // 1
				name: "致親愛的我自己"
			}, {
				alias: "mylesson", // 2
				name: "後來，時光告訴我"
			}, {
				alias: "treasure", // 3
				name: "寶箱"
			}, {
				alias: "decisions", // 4
				name: "對的決定"
			}, {
				alias: "feared", // 5
				name: "沒有想像的那麼糟"
			}][evt_no], 
			d = new jsPDF({
				orientation: "p", 
				unit: "mm", 
				format: "a4", 
				putOnlyUsedFonts: true
			}), 
			w = d.internal.pageSize.getWidth(), 
			h = d.internal.pageSize.getHeight(), 
			title = new Date().getFullYear()+" 溫度日記《"+evt["name"]+"》線上徵文活動";

		d.setProperties({
			title: title+"："+name, 
			subject: title+"："+name, 
			author: "溫度日記", 
			keywords: "溫度日記, 日記, 徵文活動", 
			creator: "蜜思股份有限公司"
		});

		// 背景
		d.addImage("https://i.hearty.app/SJyu20Y.jpg", "JPEG", 0, 0, w, h);
		d.addImage("https://hearty.me/award/img/cert_hr.png", "PNG", 10, 10, 190, 3.25);

		d.addFont("https://cdn.jsdelivr.net/gh/lxgw/LxgwWenKaiTC@v1.501/fonts/TTF/LXGWWenKaiTC-Regular.ttf", "wenkai", "normal");
		/* old: 
		d.addFont("https://cdn.jsdelivr.net/gh/lxgw/LxgwWenKai@d7d3617f8a15832fba7963549928f5855ab97932/TTF/LXGWWenKai-Regular.ttf", "wenkai", "normal");
		*/
		// d.addFont("https://cdn.jsdelivr.net/gh/relabcc/ntb-invoice@692266bc195ebeb79b71c50c047634fb362abc5e/src/web-font/minified/jf-jinxuan-fresh2.2-regular.ttf", "jinxuan", "normal");

		d.setFont("wenkai", "normal");
		d.setFontSize(22);
		d.setTextColor("#444");
		d.text(title, 100, 30, {align: "center", charSpace: 1});
		
		d.setFontSize(28);
		d.text("參賽證明書", 100, 50, {align: "center", charSpace: 2});

		d.setFontSize(18);
		d.text("茲證明　"+name+"　同學，", 10, 90, {align: "justify", charSpace: 0});
		d.text("於 "+new Date().toLocaleDateString("zh-TW", {
			year:'numeric', month:'long', day:'numeric'
		})+"參加本站舉辦之 《"+evt["name"]+"》徵文活動", 10, 100, {align: "justify", charSpace: 0});

		d.text("• 投稿主題：「"+subject+"」", 10, 120, {align: "justify", charSpace: 0});
		d.textWithLink("• 活動網頁：hearty.me/award", 10, 130, {align: "justify", charSpace: 0, url: "https://hearty.me/award"});

		d.addImage("https://hearty.me/award/img/"+evt["alias"]+"/cert_banner.png", "PNG", 10, 150, 174, 74);
		d.addImage("https://hearty.me/award/img/cert_stamp.png", "PNG", w-90, h-60, 55, 55);

		d.setFontSize(12);
		d.textWithLink("溫度日記，手繪風插畫日記本 APP", 100, h-20, {align: "center", charSpace: 0, url: "https://hearty.me"});

		d.addImage("https://hearty.me/award/img/cert_hr.png", "PNG", 10, h-15, 190, 3.25);

		d.save("溫度日記_"+name+".pdf");
	}
	catch(e){
		msg('<i class="fal fa-info-circle"></i> 證書下載不成功，請稍後再試試看', '<i class="fas fa-mug"></i> 好的', function(){
			location.reload(true);
		});
	}
}

function hj_intro(){
	open_url("//"+(is_touch_device()?"get":"try")+".hearty.me/?utm_source=web&utm_medium=footer&utm_campaign=award"+new Date().getFullYear()%100);
}

function hj_share_page(){
	let url = "https://go.hearty.me/hjaward", 
		qrcode = "data:image/png;base64,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";

	if(/iOS|Android/i.test(check_hjapp())){
		location.assign(
			"//hearty.me/wv?s="+encodeURIComponent(url.replace(/(^\w+:|^)\/\//, ""))
		);
	}
	else if(is_touch_device() && "share" in navigator){
		navigator.share({
			title: document.title, 
			url: url
		}).catch(function(e){});
	}
	else{
		alertify.set({labels: {ok: '下載 <i class="fas fa-qrcode"></i>', cancel: '<i class="fas fa-copy"></i> 複製連結'}, buttonReverse: true});
		alertify.prompt('<i class="fal fa-link"></i> 分享連結/QRcode：<br><br><a href="'+qrcode+'" download="溫度日記徵文活動 QRcode"><img src="'+qrcode+'"></a>', function(e){
			if(e) $("#alertify img").get(0).click();
			else hj_copy($("#alertify .alertify-text"));
		}, url);

		alertify_input_custom({
			type: "url", 
			inputmode: "none", 
			placeholder: url, 
			onclick: "hj_copy($(this))"
		}, {
			cursor: "copy"
		});
	}
	hj_copy_text(url);
}

function hj_email(v){
	if(!v){
		hcaptcha_init(function(){
			msg($("<div>", {id: "contact"}).prop("outerHTML"), '<i class="fas fa-reply"></i> '+_h("i-back"));
			hcaptcha.render("contact", {
				sitekey: "5ee3e1cd-7bc2-4623-bb21-df1295a52d98", 
				size: "compact", 
				callback: "hj_email"
			});
		});
	}
	else{
		$("#alertify-ok").click();

		let m = "bxejz9a7@nien.co";
		alertify.set({labels: {ok: '<i class="fas fa-copy"></i> 複製', cancel: "否"}, buttonReverse: false});
		alertify.prompt('<i class="fal fa-envelope"></i> 連絡 Email：<br><small>(如為辦法中敘明之資訊，將不再特別回覆)</small>', function(e){
			if(e){
				hj_copy($("#alertify .alertify-text"));
				msg('<i class="fal fa-copy"></i> 已複製：'+m);
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
	function hcaptcha_init(f){
		if("hcaptcha" in window) f();
		else hj_getScript("//js.hcaptcha.com/1/api.js").then(f);
	}

// justfont
// CSS class: .jf-jinxuanlatte-medium
var _jf=_jf||[];_jf.push(["p","64099"]),_jf.push(["initAction",!0]),_jf.push(["_setFont","jf-jinxuanlatte-medium","css",".jf-jinxuanlatte-medium"]),_jf.push(["_setFont","jf-jinxuanlatte-medium","alias","jf-jinxuanlatte"]),_jf.push(["_setFont","jf-jinxuanlatte-medium","weight",500]),function(e,t,n,a,i,o,r,c,u,f){var l=e._jf;if(l.constructor!==Object){var s,d=!0,j=function(e){var t,n=!0;for(t in l)l[t][0]==e&&(n&&(n=n&&!1!==l[t][1].call(l)),l[t]=null,delete l[t])},m=/\S+/g,p=/[\t\r\n\f]/g,v=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,h="".trim,g=h&&!h.call("\ufeff ")?function(e){return null==e?"":h.call(e)}:function(e){return null==e?"":(e+"").replace(v,"")},_=function(e){var t,a,i;if("string"==typeof e&&e&&(e=(e||"").match(m)||[],t=c[n]?(" "+c[n]+" ").replace(p," "):" ")){for(i=0;a=e[i++];)0>t.indexOf(" "+a+" ")&&(t+=a+" ");c[n]=g(t)}},x=function(e){var t,a,i;if(0===arguments.length||"string"==typeof e&&e){var o=(e||"").match(m)||[];if(t=c[n]?(" "+c[n]+" ").replace(p," "):""){for(i=0;a=o[i++];)for(;0<=t.indexOf(" "+a+" ");)t=t.replace(" "+a+" "," ");c[n]=e?g(t):""}}};for(var y in l.addScript=s=function(e,n,a,i,o,r){o=o||function(){},r=r||function(){};var c,u=t.createElement("script"),f=t.getElementsByTagName("script")[0],l=!1,s=function(){u.src="",u.parentNode.removeChild(u),u=u.onerror=u.onload=u.onreadystatechange=null};i&&(c=setTimeout(function(){s(),r()},i)),u.async=a,u.onload=u.onreadystatechange=function(e,t){l||u.readyState&&!/loaded|complete/.test(u.readyState)||(l=!0,i&&clearTimeout(c),s(),t||o())},u.onerror=function(e,t,n){return i&&clearTimeout(c),s(),r(),!0},u.src=e,f.parentNode.insertBefore(u,f)},l)"initAction"==l[y][0]&&(d=l[y][1]);l.push(["_eventPreload",function(){1==d&&_(a),s("//d3gc6cgx8oosp4.cloudfront.net/js/stable/v/5.0.7/id/171277252582",null,!1,3e3,null,function(){j("_eventInactived")})}]),l.push(["_eventReload",function(){x(r),x(o),_(i)}]),l.push(["_eventActived",function(){x(a),x(i),_(o)}]),l.push(["_eventInactived",function(){x(a),x(i),_(r)}]),j("_eventPreload")}}(this,this.document,"className","jf-loading","jf-reloading","jf-active","jf-inactive",this.document.getElementsByTagName("html")[0]);
