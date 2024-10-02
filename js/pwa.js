"use strict";

/*
if("serviceWorker" in navigator){
	window.addEventListener("load", function(){
		try{
			navigator.serviceWorker.register("/sw.js", {scope: "."});
		}
		catch(e){}
	}, false);
}
*/

var a2hsPrompt;

function a2hs_active(callback){
	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault();
		window.a2hsPrompt = e;
		callback = callback || function(){}; callback();
	}, false);
}

function a2hs_init(){
	if(/(Windows|Macintosh)/i.test(check_OS())){
		a2hs_active(function(){
			$("[data-os='Macintosh']").attr({
				href: "javascript:void(0)", 
				onclick: "a2hs()"
			}).removeAttr("download");

			// 由於 Windows 上的 PWA 不會自動 (1)加到桌面 (2)釘選至工具列
			// 因此安裝 PWA 時，同時提供 exe 桌面版
			$("[data-os='Windows']").on("click", a2hs);
		});
	}
}

/* for Menu
function a2hs_menu(){
	var $a2 = $(".a2hs");
	a2hs_active(function(){
		$a2.show();
	});

	$a2.on("click", a2hs);

	if(/(Chrom(e|ium)|Edg)/.test(check_browser())){
		var $btn_app = $(".hj_chrome_app"), 
			v = Number(check_ChromeVersion()||0), 
			os = check_OS();

		// 不支援版本
		if(os=="Windows" && v<70){
			$a2.hide();
			$btn_app.filter("[data-win]").show();
		}
		else if(os=="Macintosh" && v<73){
			$a2.hide();
			$btn_app.filter("[data-mac]").show();
		}
		// Fallback: Lagacy Chrome App
		else{
			$a2.delay(3000).queue(function(){
				if($(this).is(":hidden")) $btn_app.filter("[data-"+(os=="Macintosh"?"mac":"win")+"]").show();
				$(this).dequeue();
			});
		}
	}
}
*/

function a2hs(){
	window.a2hsPrompt.prompt();
	window.a2hsPrompt.userChoice.then(function(c){
		if(c.outcome=="accepted"){
			// forms.gle/ZczTx6VcsNKbx5yh8
			hj_update({
				action: "gform_post", 
				uri: "1FAIpQLScP9-lJvoR85jpd3MPZ_fw5SW2eqjD3rLVFq-LRbrWYwuiMXg", 
				data: $.param({
					"entry.986370885": "[hj_user_id]", 
					"entry.381916775": "[hj_username]", 
					"entry.77022907": "[hj_email]", 
					"emailAddress": "[hj_email]", 
					"entry.152912059": check_OS(), 
					"entry.128593849": check_browser()+" "+check_Chrome_Ver()
				})
			});
			var evt = "PWA Installed";
			ga_evt_push(evt, {event_category: evt});
		}
		window.a2hsPrompt = null;
	});
	$("[data-os='Windows'],[data-os='Macintosh']").hide();
}
	function check_Chrome_Ver(){
		var r = (navigator.userAgent||"").match(/Chrom(e|ium)\/([0-9]+)\./);
		return r ? parseInt(r[2], 10) : "";
	}

// App Store 上架隱藏
function appstore_review_hiding(){
	// macOS 2.1.1 版
	if(/Hearty_macOS\/2\.1\.1/i.test(navigator.userAgent||"")){
		$(function(){
			$(".home_footer .non-iOSapp,.mh-head .fa-gift,.popup.upgrade,.popup.purchase,.menu [data-btn='upgrade'],.menu .menu_apps,.menu .tabs_bottom,.notifications li[data-notification_id='6'],.nav_toggle_account").remove();
		});
	}
}
