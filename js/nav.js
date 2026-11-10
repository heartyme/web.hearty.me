"use strict";

menu_init();

function menu_init(){
	jQuery(function($){
		const $h = $(".hj-main"),
			$t = $(".editor_toolbelt"),
			is_editor = $(".catalog[data-mobile]").length>0,
			conf = {
				offCanvas: {pageSelector: ".hj-page"},
				transitionDuration: check_OS("Android") ? 0 : 300
			},
			mmenu = (selector, opts) => $(selector).mmenu(opts, conf);

		// 主導覽列
		mmenu("nav.menu", {
			navbar: {add: false, title: _h("m-nav-1")},
			onClick: {close: true},
			extensions: ["fx-menu-slide", "pagedim-black", "position-front"]
		});

		// 日記編輯器
		if(is_editor){
			// 日記目錄
			mmenu("nav.catalog[data-mobile]", {
				navbar: {add: false, title: _h("m-nav-2")},
				extensions: ["fx-menu-slide", "pagedim-black"]
			});

			// 貼紙簿
			mmenu("nav.stickerbook", {
				navbar: {add: false},
				extensions: ["fx-menu-slide", "pagedim-white", "position-right"]
			});
		}

		$("nav").each(function(){
			const api = $(this).data("mmenu");
			if(!api) return;

			api
				.bind("open:finish", function(){
					$h.addClass("blur");
					if(is_editor) $t.fadeTo(0, 0);
				})
				.bind("close:finish", function(){
					$h.removeClass("blur");
					if(is_editor){
						$t.fadeTo("slow", 1);

						// 關閉主選單後打開日記本（mmenu 回呼的 this 為 Mmenu 實例，需經 $menu 取得 DOM）
						if(this.$menu.hasClass("menu")) open_book(true);
					}
				});
		});

		// PWA
		menu_apps();
		if(typeof a2hs_init=="function") a2hs_init();

		if(typeof btn_alias!=="undefined")
			$("nav.menu li[data-btn='"+btn_alias+"']").attr("data-active", "").find("a").removeAttr("href");

		$(document).on("click", "nav.menu [data-href]", function(){
			hj_href(this.dataset.href);
		});

		if(!/zh/i.test(hj_lang()) || getcookie("hearty_children")=="1")
			$(".menu").find("[data-btn='home'],[data-btn='feed'],[data-btn='blog'],[data-btn='life']").remove();

		fb_deferred_load();
	});
}

// 登出
function signout(f){
	if(!f){
		alertify.set({labels: {ok: _h("m-no"), cancel: '<i class="fas fa-sign-out-alt"></i> '+_h("m-signout-0")}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-door-open"></i> '+_h("m-signout-1"), function(e){
			if(!e) signout(true);
		});
		return;
	}

	ga_evt_push("Sign Out", {
		event_category: "Auth",
		event_label: "Sign Out"
	});

	["hearty_u", "hearty_id", "hearty_em", "hearty_screenlock"].forEach(k => setcookie(k, "", -1));
	window.sessionStorage.clear();
	hj_href("signout");
}

function campaign__page(campaign){
	if($(".hj-campaign").length>0) campaign__load_page(campaign);
	else hj_href("c/"+campaign);
}

function nav_toggle($e, o){
	$e.data("mmenu")[o ? "open" : "close"]();
}

function menu_apps(){
	const os = check_OS();

	// App
	if(/iOS|Android/i.test(check_hjapp())) $("[data-os='iOS'],[data-os='Android']").remove();
	// Mobile web
	else if(is_touch_device()) $("[data-os='"+(os=="iOS"?"Android":"iOS")+"']").remove();
	// PC PWA & UWP
	else if(check_hjpwa()||check_hjapp("macOS")) $("[data-os='Windows'],[data-os='Macintosh']").remove();
	// PC Web
	else $("[data-os='"+(os=="Macintosh"?"Windows":"Macintosh")+"']").remove();
}

function fb_deferred_load(){
	setTimeout(function(){
		if(!window.FB?.XFBML) return;
		$("[data-fb-load]").each(function(){
			try{FB.XFBML.parse(this);}
			catch(e){}
		});
	}, 5000);
}

try{
window.fbAsyncInit=function(){FB.init({appId:106040032889770,autoLogAppEvents:!0,xfbml:!1,version:"v3.3"})},
function(e,t,n){var o,s=e.getElementsByTagName(t)[0];e.getElementById(n)||((o=e.createElement(t)).id=n,o.src="//connect.facebook.net/zh_TW/sdk/xfbml.customerchat.js",s.parentNode.insertBefore(o,s))}(document,"script","facebook-jssdk");
}
catch(e){}
