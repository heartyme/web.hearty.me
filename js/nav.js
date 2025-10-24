"use strict";

menu_init();

function menu_init(){
	(function($){
		$(document).ready(function(){
			let nav = {}, 
				$h = $(".hj-main"), 
				$t = $(".editor_toolbelt"), 
				dur = check_OS("Android") ? 0 : 300;

			// 主導覽列
			nav.menu = $("nav.menu").mmenu({
				navbar: {add: false, title: _h("m-nav-1")}, 
				onClick: {close: true}, 
				extensions: ["fx-menu-slide", "pagedim-black", "position-front"]
			}, {
				offCanvas: {pageSelector: ".hj-page"}, 
				transitionDuration: dur
			});

			// 日記編輯器
			if($(".catalog[data-mobile]").length>0){
				// 日記目錄
				nav.catalog = $("nav.catalog[data-mobile]").mmenu({
					navbar: {add: false, title: _h("m-nav-2")}, 
					extensions: ["fx-menu-slide", "pagedim-black"]
				}, {
					offCanvas: {pageSelector: ".hj-page"}, 
					transitionDuration: dur
				});

				// 貼紙簿
				nav.stickerbook = $("nav.stickerbook").mmenu({
					navbar: {add: false}, 
					extensions: ["fx-menu-slide", "pagedim-white", "position-right"]
				}, {
					offCanvas: {pageSelector: ".hj-page"}, 
					transitionDuration: dur
				});

				$("nav").each(function(){
					if(!!$(this).data("mmenu")){
						$(this).data("mmenu")
							.bind("open:finish", function(){
								$h.addClass("blur");
								$t.fadeTo(0, 0);
							})
							.bind("close:finish", function(){
								$h.removeClass("blur");
								$t.fadeTo("slow", 1);

								if($(this).hasClass("menu")) open_book(true);
							});
					}
				});
			}
			// 其他頁面
			else{
				$("nav").each(function(){
					if(!!$(this).data("mmenu")){
						$(this).data("mmenu")
							.bind("open:finish", function(){
								$h.addClass("blur");
							})
							.bind("close:finish", function(){
								$h.removeClass("blur");
							});
					}
				});
			}

			// PWA
			menu_apps();
			if(typeof a2hs_init=="function") a2hs_init();

			if(typeof btn_alias!=="undefined"){
				let $l = $("nav.menu li[data-btn='"+btn_alias+"']");
				$l.attr("data-active", "").find("a").removeAttr("href");
			}

			$(document).on("click", "nav.menu [data-href]", function(){
				hj_href(this.dataset.href);
			});

			if(!/zh/i.test(hj_lang()) || getcookie("hearty_children")=="1") 
				$(".menu [data-btn='home'],.menu [data-btn='feed'],.menu [data-btn='blog'],.menu [data-btn='life']").remove();

			fb_deferred_load();
		});
	})(jQuery);
}

// 登出
function signout(f){
	if(!f){
		alertify.set({labels: {ok: _h("m-no"), cancel: '<i class="fas fa-sign-out-alt"></i> '+_h("m-signout-0")}, buttonReverse: !1});
		alertify.confirm('<i class="fal fa-door-open"></i> '+_h("m-signout-1"), function(e){
			if(!e) signout(true);
		});
	}
	else{
		ga_evt_push(
			"Sign Out", {
				event_category: "Auth", 
				event_label: "Sign Out"
			}
		);

		setcookie("hearty_u", "", -1);
		setcookie("hearty_id", "", -1);
		setcookie("hearty_em", "", -1);
		setcookie("hearty_screenlock", "", -1);
		window.sessionStorage.clear();
		hj_href("signout");
	}
}

function campaign__page(campaign){
	if($(".hj-campaign").length>0) campaign__load_page(campaign);
	else hj_href("c/"+campaign);
}

function nav_toggle($e, o){
	if(o) $e.data("mmenu").open();
	else $e.data("mmenu").close();
}

function menu_apps(){
	let os = check_OS(), 
		touch_device = is_touch_device();

	// App
	if(/iOS|Android/i.test(check_hjapp())) $("[data-os='iOS'],[data-os='Android']").remove();
	// Mobile web
	else if(touch_device) $("[data-os='"+(os=="iOS"?"Android":"iOS")+"']").remove();

	// PC PWA & UWP
	else if(check_hjpwa()||check_hjapp("macOS")) $("[data-os='Windows'],[data-os='Macintosh']").remove();
	// PC Web
	else $("[data-os='"+(os=="Macintosh"?"Windows":"Macintosh")+"']").remove();
}

function fb_deferred_load(){
	setTimeout(function(){
		if(!!window.FB && "XFBML" in FB){
			let $f = $("[data-fb-load]");
			if($f.length>0){
				$f.each(function(){
					try{FB.XFBML.parse($(this).get(0));}
					catch(e){}
				});
			}
		}
	}, 5000);
}

try{
window.fbAsyncInit=function(){FB.init({appId:106040032889770,autoLogAppEvents:!0,xfbml:!1,version:"v3.3"})},
function(e,t,n){var o,s=e.getElementsByTagName(t)[0];e.getElementById(n)||((o=e.createElement(t)).id=n,o.src="//connect.facebook.net/zh_TW/sdk/xfbml.customerchat.js",s.parentNode.insertBefore(o,s))}(document,"script","facebook-jssdk");
}
catch(e){}
