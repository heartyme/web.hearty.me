"use strict";

var hj_editor_loaded = true;
var timer; // 自動儲存重試 timeout

(function($){
	$(document).ready(function(){
		$d1 = $.when(
			$d0, // book init
			hj_getScript("//cdn.jsdelivr.net/combine/gh/godswearhats/jquery-ui-rotatable@1.1.1/jquery.ui.rotatable.min.js,npm/jquery-ui-touch-punch@0.2.3/jquery.ui.touch-punch.min.js,npm/interactjs@1.10.27/dist/interact.min.js"+(!getUrlPara("retry") ? "" : "?"))
		).then(function(){
			editor_include_once();
			editor_enable();
		});

		hj_editor_history_init();
		hj_rmenu_init($("[data-hj_rmenu]"));

		$(".popup-underlayer .popup,.popup.feedback,.popup.diary_screenshot a,.prologue .start,.asset .detach,.popup.notifications ul,.image-zoom .img_btns").on("click", function(e){
			e.stopPropagation();
		});

		// YTbox
		hj_getScript_gh({
			path: "js/ytbox.min.js"
			// commit: "main"
		});

		// 網路及電量
		network_watch(); battery_watch();

		// 繁簡轉換
		if(typeof zh_translatePage=="undefined"){
			hj_getScript_gh({
				path: "js/diary.zhongwen.min.js", 
				// commit: "main"
			}, function(){
				hj_localize_cn();
			});
		}
		else{
			hj_localize_cn();
		}

		URL_handling();

		try{
			hj_ip().then(function(d){
				var $u = $("[data-uptime]");
				$u.text($u.text()+"，"+(d["colo"]||""));
			});
		}
		catch(e){}

		// Post Init
		ga_evt_push("Post Init", {
			event_category: "Posts"
		});

		/* 維修預告
		scheduled_maintenance(true, [
			1656795600, // 2022/7/3 @ 5:00am
			1656799200 // 2022/7/3 @ 6:00am
		]);
		*/
	});
})(jQuery);


// 愛諾園測試用 ### debug
if(!!getcookie("hearty_loveuno")) hj_href("//demo.loveuno.com/?utm_source=hearty_journal&utm_medium=hearty_journal&utm_campaign=hearty_journal&utm_id=hearty_journal");

// unhandledrejection
window.addEventListener("unhandledrejection", function(e){
	hj_update_failed({
		fn: "unhandledrejection", 
		err: e.reason || ""
	});
});


// 網址相關
function URL_handling(){
	// 首次註冊
	if(!!getUrlPara("first")) hj_firstrun(); // whats_your_name();

	// Preview Mode
	else if(!!getUrlPara("preview")) $(".mh-head,.btn_feedback").hide();

	// Purchased
	else if(!!getUrlPara("purchased") || !!getUrlPara("iap")) hj_after_purchase();

	// Add Images
	else if(!!getUrlPara("img")) post_create().then(function(){post_picture(true);});

	/* 子 WebView 開連結
	var l = getUrlPara("link");
	if(!!l) location.href = "//"+l+(l.indexOf("?")>0 ? "&":"?")+"wvtab=1";
	*/

	// 子 WebView 開連結
	var l = getUrlPara("link");
	if(!!l){
		location.href = "//"+l+(
			l.indexOf("wv?o=")>0 ? 
				"" : (l.indexOf("?")>0 ? "&":"?")+"wvtab=1"
			);
	}

	// Pricing
	switch(Number(getUrlPara("plans"))){
		case 1:
			hj_upgrade_toggle(true);
		break;

		case 2:
			pricing(true);
		break;

		case 3: // 結帳頁面中點返回
			pricing(true);
			ga_evt_push("remove_from_cart");
			fb_evt_push("RemoveFromCart");
		break;
	}

	// Penpal
	var p = getUrlPara("penpal_add");
	if(!!p){
		post_penpal_add(p);
		popup_toggle(true, "share");
	}

	// 問問題
	var f = getUrlPara("f");
	if(!!f){
		hj_feedback_toggle(true);
		if(parseInt(f)>1) hj_feedback_form(true);
	}

	// 推播而來：bitly.com/3A4YVgZ
	if(getUrlPara("utm_source")=="push"){
		// 展開手機上的日記目錄
		if($(".btn_catalog").is(":visible"))
			nav_toggle($(".catalog[data-mobile]"), true);
	}

	// 領取禮物貼圖
	get_gift_stickers_init();

	if(!check_hjapp()){
		try{
			var u = new URL(location.href);

			["purchased", "iap", "preview", "plans", "f"].forEach(function(k){
				if(!!getUrlPara(k)) u.searchParams.delete(k);
			});

			if(typeof history.replaceState=="function"){
				history.replaceState(
					{}, 
					document.title, 
					u.pathname+u.search
				);
			}
		}
		catch(e){}
	}
}

function hj_firstrun(){
	if($(".tutorial").length>0){
		popup_toggle(true, "tutorial");
		hj_tutorial("init");
	}
}
	function hj_tutorial(action){
		var $s = $(".tutorial_slider");
		if(!$s.length) return false;

		switch(action){
			case "init":
				$s = $s.not(".slick-initialized");
				$s.find("img").filter("[data-"+($("body").width()>1024 ? "mobile" : "desktop")+"]").remove();

				// github.com/kenwheeler/slick/
				$s.slick({
					infinite: false, 
					arrows: !is_touch_device(), 
					dots: true, 
					draggable: true, // PC
					swipe: true, 
					touchMove: true, 
					adaptiveHeight: true, 
					speed: 200, 
					centerPadding: "0px", 
					dotsClass: "dots", 
					prevArrow: '<div class="tutorial_arrow fal fa-chevron-left"></div>', 
					nextArrow: '<div class="tutorial_arrow fal fa-chevron-right" onclick="hj_tutorial(\'forward\')"></div>'
				}).on("edge", function(){
					hj_tutorial("finish");
				}).on("wheel", function(e){ // 滾輪
					e.preventDefault();
					$(this).slick("slick"+(
						e.originalEvent.deltaY<0 ? 
						"Next" : "Prev"
					));
				});
				$s.find("img").on("click", function(){
					hj_tutorial("next");
				});

				$(".popup-underlayer").attr({onclick: "hj_tutorial('finish')"});
			break;

			case "next":
				hj_tutorial("forward");
				$s.slick("slickNext");
			break;

			case "forward": // 檢查是否跳頁
				if(($s.slick("slickCurrentSlide")+1)==$s.find("img").length) hj_tutorial("finish");
			break;

			case "finish":
				whats_your_name();
				popup_toggle(false, "tutorial");
				$s.slick("unslick").add(".tutorial").remove();
			break;
		}
	}

function whats_your_name(name){
	name = name || "";
	alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> '+_h("e-ok-0"), cancel: _h("e-no-0")}, buttonReverse: false});
	alertify.prompt('<i class="fal fa-smile-wink"></i> '+_h("e-name-1"), function(e, name){
		if(e){
			name = (name || "").trim();
			if(name.length>0){
				hj_update({
					action: "profile_update", 
					field: "nickname", 
					data: name
				});
				$(".hj_user .name").attr("data-text", name);
				alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> '+_h("e-name-4"), cancel: _h("e-no-0")}, buttonReverse: false});
				alertify.confirm('<i class="far fa-flower"></i> '+_h("e-name-2", {$name: name})+"<br>"+_h("e-name-3"), function(e){
					if(e) hj_fcm_init();
					free_trial_activate();
				});
			}
			else{
				whats_your_name();
				alertify_input_shake();
			}
		}
		else{
			free_trial_activate();
		}
	}, (name || "").toString() );

	alertify_input_custom({
		placeholder: _h("e-name-0"), 
		autocomplete: "on", 
		maxlength: 20
	}, {
		"letter-spacing": "4px"
	});
}

function get_gift_stickers_init(){
	if(getUrlPara("utm_campaign")=="User_Reactive"){
		if(!!window.hj_login){
			get_gift_stickers();
		}
		else{
			popup_toggle(true, "notice_gift");
			get_gift_stickers_stats("gift_notice");
		}
	}
	else if(!!getUrlPara("gift")){
		get_gift_stickers();
	}
}
	function get_gift_stickers(){
		if(!!window.hj_login){
			msg('<i class="far fa-gift-card"></i> '+_h("e-get_stickers-0")+' <i class="far fa-grin-wink"></i>', _h("e-get_stickers-1"), function(){
				nav_toggle($(".stickerbook"), true);
				get_gift_stickers_stats("toggle_stickerbook");
			});
		}
		else{
			get_gift_stickers_stats("signin_redirect");
			var a = getcookie("hearty_account") || getUrlPara("a") || "";
			a = !a ? "" : "&account="+a;
			hj_href("?r=/"+(hj_writer || "")+"？gift=1"+a+"#signin");
		}
	}

	function get_gift_stickers_stats(action){
		gform_post("1FAIpQLSd2vEj_DmNKt2_6K_X99NJZh4JtEzQ7eu49mXwpmnOelaZmFw", {
			"entry.355700800": getUrlPara("utm_medium") || "", 
			"entry.1270264487": action || "", 
			"entry.783049182": getcookie("hearty_id"), 
			"entry.866865386": getcookie("hearty_account") || getUrlPara("a") || "[hj_username]", 
			"entry.1497216280": getcookie("hearty_em"), 
			"entry.124585191": check_browser()+", "+check_OS(), 
			"entry.1259076046": today(8)
		});
	}


// 網路監測
function network_watch(){
	window.addEventListener("online", function(){
		network_status(["offline"], false);
	}, {passive: true});
	window.addEventListener("offline", function(){
		network_status(["offline"], true);
	}, {passive: true});
	if("connection" in navigator){
		navigator.connection.addEventListener("change", network_watch_speed);
		network_watch_speed();
	}
}
	function network_watch_speed(){
		network_status(["slow"], 
			/2g/.test(navigator.connection.effectiveType) // "2g" or "slow-2g"
		);
	}


// 電池監測
function battery_watch(){
	if("battery" in navigator){
		battery_watch_handle(navigator.battery);
	}
	else if("getBattery" in navigator){
		try{
			navigator.getBattery().then(battery_watch_handle);
		}
		catch(e){}
	}
}
	function battery_watch_handle(b){
		battery_watch_level(b);

		b.onlevelchange = function(){
			battery_watch_level(b);
		};
	}
	function battery_watch_level(b){
		var l = parseFloat((b.level*100).toFixed(2));
		if(l<20){
			$(".warning-underlayer[data-issue='battery'] > div").attr("data-battery", l);
			network_status(["battery"], true);
		}
		return l;
	}


// 閒置計時
function hj_idle(){
	var $t = $(".editor_toolbelt"), 
		$sl = $(".screenlock"), 
		toolbar_enabled = !is_touch_device() && current_post()["editable"];

	$(document).on("mousemove keypress", hj_motion);
	$("#editor_editable").on("keydown", hj_motion);
	hj_motion();

	setInterval(function(){
		var t = Number(hj__cache({bucket: "hearty_idle"}));
		t++; hj__cache({set: true, bucket: "hearty_idle", data: t});

		switch(true){
			case (t==4 && autosave_the_change()): // 4s
			break;

			case (t==8 && toolbar_enabled && $t.is(":visible")): // 8s
				$t.slideUp("slow");
			break;

			/* 閒置 5分鐘後，自動鎖屏
			case (t==300 && screenlock("status") && $sl.is(":hidden")): // 300s
				screenlock(true);
			break;
			*/

			/*
			case (t==90): // 90s
				catalog_query(null, {page: 1});
				notifications_query(1);
			break;
			*/
		}
	}, 1000);

	function hj_motion(){
		hj__cache({set: true, bucket: "hearty_idle", data: 0});
		if(toolbar_enabled) $t.slideDown("normal");
	}
}

// 覆寫回上一頁
function hj_editor_history_init(){
	if(typeof history.pushState=="function"){
		history.pushState(null, document.title, location.href);
		window.addEventListener("popstate", function(){
			var v = hj_editor_history("load");

			// 有已儲存的返回動作
			if(v!=null){
				var $e = $("#editor_editable");
				switch(true){
					// Number
					case /^\d+$/.test(v):
						post_query(v, true);

						/* 在手機上，則拖出目錄
						if($(".btn_catalog").is(":visible"))
							nav_toggle($(".catalog"), true);
						*/
					break;

					// indexOf checks Strings Only
					case v.indexOf("editable_blur")>0:
						$e.blur();
						return;
					break;

					case v.indexOf("popup_toggle")>0:
						v = v.split("]", 2).slice(-1)[0];
						if(v.length>0) popup_toggle(false, v); // 避免空值引發錯誤
						return;
					break;

					case v.indexOf("editable_focus")>0:
						$e.get(0).focus({preventScroll: false});
					break;
				}
			}
			// 沒有已儲存的返回動作
			else{
				// 第一次返回關全部 nav; 第二次返回則闔書
				if(!$("nav:visible").length) open_book(false);

				history.pushState(null, document.title, location.href);
			}

			// Close All Menus
			$("nav").each(function(){
				if(!($(this).data("mmenu")==null)) $(this).data("mmenu").close();
			});
		}, false);
	}
}

// 讀寫自訂的歷史紀錄
function hj_editor_history(a, val){
	if(typeof history.pushState=="function"){
		var bucket = "hearty_editor_history", 
			hj_history = JSON.parse(hj__cache({bucket: bucket})) || [];

		switch(a){
			case "load":
				val = hj_history.pop();
			break;

			case "add":
				history.pushState(null, document.title, location.href);
				hj_history.push(val);
			break;

			case "detach":
				hj_history = hj_history.filter(v=>v!==val);
			break;
		}

		hj__cache({set: true, bucket: bucket, data: JSON.stringify(hj_history)});
		return val;
	}
}

// 啟用編輯器
function editor_enable(on){
	on = on || current_post()["editable"] || false;

	var $e = $(".bk-page #editor_editable"), 
		loaded = $e.data("editor_loaded") || false, 
		$btn = $(".frame").find(".fa-video-plus,.fa-camera-alt").add(".hj_rmenu li[data-editing]");
	if(on){
		if(!loaded){
			editable__initialize();
			hj_idle(); // 閒置計時
			screenlock("initialize", pincode || "");

			// 相片上傳
			hj_getScript_gh({
				path: "js/jquery.uploadfile.min.js", 
				// commit: "main"
			}, image_uploader_init);

			$e.data({editor_loaded: true});
			$(".editor_toolbelt .kit.save").on("mouseover", save_btn);
		}
		sticker__list();
		editor_focus_zoomin();
		$btn.add($(".image-zoom:not([data-gallery_id='0']) .img_btns")).slideDown();
	}
	else{
		sticker__list(false);
		$btn.add($(".image-zoom .img_btns")).slideUp();
	}
	$e.prop("contenteditable", on);
	toolbelt_toggle(on);

	if(!window.hj_username){
		toast_signin();
	}
	else if(hj_username!=hj_writer){
		toast_signin(_h("e-welcome-1"));
	}
	else if((document.referrer||"https://hearty.me").indexOf("hearty.me")<0){
		toast_signin(_h("e-welcome-0", {$name: hj_username}));
	}
}
	function toast_signin(t){
		$(".toast_signin_reminder").attr({
			title: t || _h("e-welcome-2")
		}).fadeIn("fast").delay(5000).queue(function(){
			$(this).remove().dequeue();
		});
	}

// VIP 功能
function vip_init(){
	var isVIP = hj_membership()[0];
	if(isVIP){
		var $r = $(".popup.feedback input[name='ver']");
		$r.filter("[data-ver='vip']").prop({
			checked: true, 
			disabled: false
		});
		$r.filter("[data-ver='free']").prop({
			checked: false, 
			disabled: true
		});
		$(".mm-panel [data-vip='0']").remove();
	}
	return isVIP;
}

function vip_fn(f){
	var c = current_post();
	if(c["vip"]){
		switch(f){
			case "picture":
				if(c["editable"]) post_picture();
			break;

			case "video":
				if(c["editable"]) hj_video("update");
			break;

			case "catalog_search":
				catalog_search();
			break;

			case "post_attr":
				if(c["editable"]) popup_toggle(true, "post_attr");
			break;

			case "screenshot":
				hj_screenshot();
			break;
		}
	}
	else{
		hj_upgrade_toggle(true);
	}
	return c["vip"];
}

// 桌面右鍵選單
function hj_rmenu_init($l){
	var $r = $(".hj_rmenu");
	if(!is_touch_device() && $r.length>0){
		$l.get(0).addEventListener("contextmenu", function(e){
			hj_rmenu_toggle(e, true, $l);
		}, {passive: false});
		$r.get(0).addEventListener("mouseleave", function(e){
			hj_rmenu_toggle(e, false, $l);
		}, {passive: true});
	}
}

function hj_rmenu_toggle(e, o, $l){
	var $r = $(".hj_rmenu");
	if(o){
		e.preventDefault();
		$r.css({
			top: Math.min(e.clientY, $l.height()-$r.height()-30)+"px", 
			left: Math.min(e.clientX, $l.width()-$r.width()-30)+"px"
		}).show();
	}
	else{
		$r.fadeOut("slow");
	}
}

function datepicker_init(){
	$("<link>", {
		rel: "stylesheet", 
		href: hj_jsdelivr()+"css/jquery.ui.datepicker.custom.min.css"
	}).appendTo("head");

	if(/zh/i.test(hj_lang())){
		hj_getScript_gh({
			path: "js/safari.datepicker.tw.min.js", 
			// commit: "main"
		}, datepicker_load);
	}
	else{
		datepicker_load();
	}
}
	function datepicker_load(){
		var $d = $(".post_attr #post_created"), 
			yr = new Date().getFullYear();

		return $d.attr({
			type: "text", 
		}).datepicker({
			changeYear: true, 
			changeMonth: true, 
			yearRange: (yr-20)+":"+yr, 
			yearSuffix: _h("e-year"), 
			dateFormat: "yy-mm-dd", 
			showAnim: "slideDown", 
			minDate: $d.attr("min") || "", 
			maxDate: $d.attr("max") || ""
		}).on("click", function(){
			$(this).datepicker("show");
		});
	}


function editor_include_once(){
	// 已編輯
	var $e = $("#editor_editable"), 
		post_modified = new MutationObserver(function(m){
			m.forEach(saved);
		}).observe(
			$e.get(0), 
			{characterData: true, subtree: true}
		);

	$e.get(0).addEventListener("paste", saved, {passive: true});

	autosaver_30s();

	// 切分頁
	document.addEventListener("visibilitychange", function(){
		if(document.hidden) autosave_the_change();
	}, {passive: true});

	// iOS unbeforeunload Fix
	if(check_OS("iOS")){
		if(current_post()["editable"]) window.addEventListener("pagehide", post_revise, false);
	}

	// Datepicker for iOS & Safari on macOS
	// caniuse.com/input-datetime
	// min & max NOT support natively
	if(check_OS("iOS")||check_browser("Safari")) datepicker_init();

	vip_init();
	catalog_init();

	// 選單
	var $m = $(".mh-head .left");
	$m.find(".fa-home-alt").on("click", function(){
		nav_toggle($(".menu"), true); open_book(false);
	});
	$m.find(".btn_catalog").on("click", function(){
		open_book(true); nav_toggle($(".catalog"), true);
	});

	// 點擊綁定
	// 1. 用戶圖片
	$(document).on("click", ".bk-page figure", function(){
		var gallery_id = parseInt($(this).attr("data-gallery_id")) || 0;
		if(gallery_id>0){
			$(".image-zoom").attr({
				"data-gallery_id": gallery_id
			}).find("img").attr({
				src: "//hearty.me/i/"+gallery_id+"?r="+($(this).data("rotated")||0), 
				"data-r": ""
			}).show();
			post_picture_filter(
				$(this).data("cssgram") || 0, 
				$(this).add(".image-zoom div")
			);
			$(".bk-page .pictures.slick-initialized").slick("slickPause");
		}
	});

	// 2. 預設插圖
	$(".bk-page .pictures").on("click", function(){
		popup_toggle(true, "image-zoom");
		$(".image-zoom img").fadeIn();
	});

	// 3. 放大圖片
	$(".image-zoom").on("click", function(){
		$(this).fadeOut();
		bk_blur(false);
	}).find("img").on("click", function(e){
		var $s = $(".bk-page .pictures.slick-initialized");
		if($s.length>0){
			$s.slick("slickNext").find(".slick-active").click();
			$(this).fadeTo("fast", 0.2, function(){
				$(this).fadeTo("normal", 1);
			});
			e.stopPropagation();
		}
	});

	var $btn = $(".image-zoom .img_btns");
	$btn.find("[data-rotate]").on("click", post_picture_rotate);
	$btn.find("[data-cssgram]").on("click", post_picture_cssgram);
	$btn.find("[data-remove]").on("click", post_picture_remove);
	$btn.find("[data-download]").on("click", function(){
		post_picture_download($(this).find("a"));
	});

	// 螢幕鎖
	$(".screenlock input").on("focus", function(){
		$(this).val("");
	}).on("keyup", function(){
		screenlock("next", [$(this), this.value]);
	});

	// 平板 App 中，不顯示全螢幕功能
	if(check_hjapp()) $(".kit.fa-expand-wide").remove();

	// 已給評者，不出現給評提醒 (1個月內)
	if(!!getcookie("hearty_rated"))
		$(".notifications li[data-notification_id='6']").remove();

	// 英文版停用投稿功能
	if(!/zh/i.test(hj_lang())) 
		$(".privacy_selector [data-publish]").remove();

	// 保持螢幕長亮
	if(check_OS("Android") && "wakeLock" in navigator){
		try{
			navigator.wakeLock.request("screen");
		}
		catch(e){}
	}
}

// 手機上，與游標同步下捲
function editor_editable_scroll_to_bottom(e, el){
	if(is_touch_device() && e.keyCode==13){
		var $pg = $(".bk-page"), 
			range = window.getSelection().getRangeAt(0), 
			r = document.createRange(), 
			editable_height = Number($pg.find("#editor_editable").height());

		r.selectNodeContents(el); r.setStart(range.endContainer, range.endOffset);
		if(r.cloneContents().textContent.toString().length<2){
			if(check_OS("iOS")) $("body").scrollTop(editable_height-(
				window.screen.availHeight>=812 ? 333 : 258 // iOS Keybaord Size
			)); // ALT: $("body").scrollTop($("body").scrollTop()+20);
			else $pg.scrollTop(editable_height); // Android
		}
	}
}

// 字體
function hj_fontresize(n, $e){
	$e = $e || $(".bk-page").find("#subject,#editor_editable");
	$e.css("font-size", parseInt($e.css("font-size")||16)+n);
}

function toolbelt_toggle(on){
	var $b = $(".btn_stickerbook"), 
		$t = $(".editor_toolbelt");
	if(on){
		$b.show(); $t.removeClass("off");
	}
	else{
		$b.hide(); $t.addClass("off");
	}
}

// 點擊後，反灰一秒
function toolbelt_btn_clicked($btn){
	if(!($btn==null)){
		$btn.fadeTo("fast", 0.3, function(){
			$(this).delay(1000).fadeTo("normal", 1);
		});
	}
}

function sticker__draggable_handle(bundle_id, asset_id){
	var $a = $(".bundle .asset[data-asset_id='"+asset_id+"']"), 
		$i = $a.children(".sticker_img"), 
		editor_width = $("#editor").width(), 
		editor_scrolled = $(".bk-page").scrollTop() || 0, 
		editor_topmargin = $("#editor").get(0).offsetTop, 
		top = $a.position().top + editor_scrolled - editor_topmargin, // + 已滾動區域 - #editor 與 .bk-page 的高度差
		left = $a.get(0).offsetLeft, // $a.position().left
		right = editor_width-(left+$i.width())-30;

	// 已旋轉項之右邊界修正
	if(right>0 && $i.length>0){
		right = Math.max(
			0, 
			Math.ceil(right+$i.width()-$i.get(0).getBoundingClientRect().width)
		);
	}

	var pos = {
		top: top, 
		left: left, // alt: $a.offset().left
		right: right, 
		align_right: left+$a.width()/2 > Math.floor(editor_width/2) ? 1 : 0
	};

	return {
		pos: pos, 
		overflow: {top: top>0, left: left>0, right: right>0}
	};
}

function sticker__editor_hotkeys(on, bundle_id, asset_id){
	$(document).off("keydown");

	if(on){
		$(document).on("keydown", function(e){
			e.preventDefault();

			var $a = $(".bundle .asset[data-asset_id='"+asset_id+"']"), 
				before = {
					top: parseInt($a.css("top")) || 0, 
					left: parseInt($a.css("left")) || 0
				}, 
				current = Object.assign({}, before); // $.extend(true, {}, before)

			switch(e.keyCode){
				case 13: // Enter
				case 27: // Escape
				case 32: // Space
					sticker__paste({bundle_id: bundle_id, asset_id: asset_id}, true);
					return;
				break;

				case 37: // Left
					current.left -= 15;
				break;

				case 38: // Up
					current.top -= 15;
				break;

				case 39: // Right
					current.left += 15;
				break;

				case 40: // Down
					current.top += 15;
				break;

				case 8: // Backspace
				case 46: // Delete
					sticker__remove({bundle_id: bundle_id, asset_id: asset_id}); return;
				break;
			}

			var c = sticker__draggable_handle(bundle_id, asset_id);

			// 超出左邊
			if(!c["overflow"]["left"]) current["left"] = 5;
			// 超出右邊
			else if(!c["overflow"]["right"]) current["left"] = before["left"]-15;
			// 超出上邊
			else if(!c["overflow"]["top"]) current["top"] = before["top"]+15;
			// 範圍內
			else sticker__update(bundle_id, asset_id, "position", c["pos"]);

			$a.animate(current, 25);

			// 保持在視窗內
			var view = parseInt($a.get(0).offsetTop-$(".bk-page").height()*2/5);
			if(view<$(".bk-page").height()+100)
				$(".bk-page").animate({scrollTop: view}, 60);
		});
	}
}

// 維修公告
function scheduled_maintenance(init, t){
	var ts = timestamping();
	if(init){
		t = t || [];
		if(t.length==2 && ts>t[0] && ts<t[1])
			network_status(["maintenance"], true);
	}
	else{
		t = new Date(( 
				t || // 指定時戳
				Math.ceil(ts/3600)*3600 // 下一個整點
			)*1e3).toLocaleString(hj_lang(), {
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Taipei"
		});

		msg("🚧 "+_h("e-maintenance-0")+t+"<br>"+_h("e-maintenance-1"));
		network_status(["maintenance"], false);

		t = t.split(" ")[0];
		ga_evt_push("Maintenance Notice", {
			event_category: "Maintenance", 
			event_label: t
		});
	}

	/* e.g. 
	// 時間到，顯示維修預告鈕
		scheduled_maintenance(true, [
			1571162400, // 10/15/2019 @ 6:00pm (GMT)
			1571767800 // 10/22/2019 @ 6:10pm (GMT)
		]);

	// 按鈕後，顯示維修時間
		scheduled_maintenance(false, 1571766900); // 10/22/2019 @ 5:55pm (GMT)
	*/
}

// 網路連線
function network_status(issues, status){
	var $w = $(".warning-underlayer[data-issue]");
	if(issues.length>0){
		issues.forEach(function(issue){
			if(status){
				$w.filter("[data-issue='"+issue+"']").fadeTo("fast", 1).attr("data-clickable", 1).delay(8000).queue(function(){
					$(this).attr("data-clickable", 0).fadeTo("normal", 0).dequeue();
				});
			}
			else{
				$w.filter("[data-issue='"+issue+"']").finish().fadeTo("fast", 0).attr("data-clickable", 0);
			}
		});
	}

	if(status) beep(); // 警示聲
}

// 翻面
function flip_book(){
	$(".bk-flip").click();
}

function book__initialize(open){
	var Books = (function(){
		var $books = $(".bk-list .bk-book"), 
			booksCount = $books.length;

		function init(){
			$books.each(function(){
				var $book = $(this), 
					$other = $books.not($book), 
					$parent = $book.parent(), 
					$read = $(".bk-read"), 
					$flip = $(".bk-flip");

				$read.on("click", function(){
					var $this = $(this);

					$other.data({opened: false}).removeClass("bk-viewinside").parent().css("z-index", 0).find(".bk-read").removeClass("bk-active");
					if(!$other.hasClass("bk-filp"))
						$other.addClass("bk-default");

					if($book.data("opened")){
						$this.removeClass("bk-active");
						$book.data({opened: false, flip: false }).removeClass("bk-viewinside").addClass("bk-default");
					}
					else{
						$this.addClass("bk-active");
						$book.data({opened: true, flip: false}).removeClass("bk-filp bk-default").addClass("bk-viewinside");
						$parent.css("z-index", booksCount);
					}
				});

				$flip.on("click", function(){				
					$read.removeClass("bk-active");

					if($book.data("flip"))
						$book.data({opened: false, flip: false}).removeClass("bk-filp").addClass("bk-default");
					else
						$book.data({opened: false, flip: true}).removeClass("bk-viewinside bk-default").addClass("bk-filp");
				} );

			});
		}
			return {init: init};
	})();
	Books.init();

	$(".mask_loading").delay(600).queue(function(){
		$(this).finish().fadeOut("fast", function(){
			// 載入自動開書
			if(!$(".bk-viewinside").length){
				$(".bk-list .bk-book").addClass("bk-rotate").delay(1200).queue(function(){
					if(open) open_book(true);
					$(this).removeClass("bk-rotate").dequeue();
					window.$d0.resolve();
				});
			}
		});
	});

	// 按封面：開書
	$(".bk-list .bk-cover,.bk-left").on("click", function(){
		open_book(true); $(".bk-page,.bk-cover-back .catalog").scrollTop(0);
	});
	// 按封底：翻面
	$(".bk-list .bk-back").on("click", flip_book);

	// 按桌布：開書或翻面
	$(".bk-underlayer").on("click", function(){
		if($(".bk-page .sticker_editing").length>0) sticker__paste();
		else if($(".bk-viewinside").length>0) open_book(false);
		else flip_book();
	});

	// stickerbook 至頂鈕
	$(".stickerbook .stickerlist .stickerdir").scroll(function(){
		if($(this).scrollTop()>200) $(".stickerbook .fa-chevron-square-up").fadeIn();
		else $(".stickerbook .fa-chevron-square-up").fadeOut();

		// 主選單
		if($(".item[data-sticker='0']:visible").length>0)
			$(this).data({scrolled: $(this).scrollTop()});
	});

	$(".bk-list .bk-page,.bk-cover-back .catalog").delay(800).queue(function(){
		$(this).scrollTop(0).dequeue();
	});

	// M$ Edge Dirty Fix (Div Scroll Overflow Issue)
	if(check_browser("Edge")) $(".bk-cover-back .catalog").scrollTop($(".bk-cover-back .catalog").get(0).scrollHeight);
}

// 啟動：編輯區
function editable__initialize(){
	// Prevent Page Scroll while Moving Stickers: stackoverflow.com/a/27286193 
	if(is_touch_device()){
		$(".bk-page").get(0).addEventListener("touchmove", function(e){
			if(e.cancelable) return true;
		}, {passive: true});
	}
	if(!cssFeatureSupported("-webkit-user-modify", "read-write-plaintext-only")){
		$("#editor_editable").on("keydown", function(e){
			if(e.keyCode==13){
				document.execCommand("insertHTML", false, "<br> "); return !1;
			}
		});
	}

	/* Chrome Only
	var d = document.createElement("div");
	try{d.contenteditable="plaintext-only";}
	catch(e){}
	if(d.contenteditable=="plaintext-only")
		$("#editor_editable[contenteditable=true]").attr("contenteditable", "plaintext-only");
	*/
}

// 生理期
function period__initialize(){
	var $pd = $(".periods");
	if(!$pd.data("loaded")){
		hj_getScript_gh({
			path: "js/periods.min.js", 
			// commit: "main"
		}, function(){
			$pd.slideDown("slow").data({loaded: true});
		});
	}
}

// Set Caret: stackoverflow.com/a/4238971
function createCaretPlacer(atStart){
	var el = $(".bk-page #editor_editable").get(0);
	el.focus({preventScroll: false});
	if(!(window.getSelection==null) && !(document.createRange==null)){
		var range = document.createRange();
			range.selectNodeContents(el);
			range.collapse(atStart);
		var sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
	}
	else if(!(document.body.createTextRange==null)){
		var textRange = document.body.createTextRange();
		textRange.moveToElementText(el);
		textRange.collapse(atStart);
		textRange.select();
	}
}

// 目錄 onclick 掛載
function catalog_init(){
	$(document).on("click", ".catalog .diaries li", function(){
		if(!(this.dataset.active==null))
			nav_toggle($(".catalog"), false);
		else if(!post_query(this.dataset.post_id))
			$(this).remove();
	});
}

// 文章搜尋
function catalog_search_toggle(o){
	switch(o){
		case true:
			vip_fn("catalog_search");
		break;

		case false:
			catalog_toggle();
			catalog_search_toggle("toggle");
		break;

		case "toggle":
			var $c = $(".catalog"), 
				$b = $c.find(".btn_search");
			$c.find(".diaries").slideUp(50, function(){
				$(this).html($("<div>", {class: "catalog_loading"})).slideDown("slow");
			});

			// 圖示切換
			$c.find(".btn_bookmarks").attr("data-queried", 0);
			$b.attr("data-queried", +!parseInt($b.attr("data-queried")));

			// 手機上拖出目錄
			if($("body").width()<1025) nav_toggle($(".catalog"), true);
		break;
	}
}

function catalog_search(keyword){
	keyword = keyword || "";
	alertify.set({labels: {ok: "🔍 "+_h("e-search-2"), cancel: _h("e-no-0")}, buttonReverse: false});
	alertify.prompt('<i class="fad fa-search"></i> '+_h("e-search-0"), function(e, keyword){
		if(e){
			keyword = (keyword || "").trim();
			if(keyword.length>0){
				catalog_query(keyword, {page: 1});
				catalog_search_toggle("toggle");

				// 展開手機上的日記目錄
				if($(".btn_catalog").is(":visible"))
					nav_toggle($(".catalog"), true);
			}
			else{
				catalog_toggle();
			}
			fb_evt_push("Search");
		}
		else{
			catalog_toggle();
		}
	}, keyword);

	alertify_input_custom({
		type: "search", 
		inputmode: "search", 
		placeholder: _h("e-search-1"), 
		autocomplete: "on", 
		maxlength: 30
	}, {
		"letter-spacing": "2px"
	});
}

// 書籤目錄
function bookmark_query(pg, $btn){
	// 反切
	if($btn.attr("data-queried")==1){
		catalog_toggle();
		$btn.attr("data-queried", 0);
		return;
	}

	hj_update({
		action: "bookmark_query", 
		page: pg || 0 // 0=all
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				var catalog = r["Values"]["catalog"].map(function(p, n){
					p["title"] = p["title"] || _h("e-bookmark-3");
					p["title_decoded"] = htmlDecode(p["title"]);
					return {
						post_id: p["post_id"], 
						title: p["title_decoded"], 
						privacy: p["privacy"], 
						editable: p["editable"], 
						outbound_count: p["outbound_count"], 
						page: Math.ceil((n+1)/10)
					};
				});
				catalog_listing(catalog);
				catalog_toggle("bookmarks");

				// 分頁
				var post_num = r["Values"]["catalog"].length;
				$(".catalog .pagination").attr("data-stats", 
					_h("e-bookmark-"+(post_num>1?1:0), {$no: post_num})
				);
				catalog_pagination(post_num);
			break;

			default:
				update_failed();
			break;
		}
	});
}

// 取得目錄
function catalog_query(keyword, pg){
	if(window.$d2.state()=="resolved") // Prevent Double Clicking
		window.$d2 = $.Deferred();

	keyword = keyword || "";
	var bucket = "hearty_diaries_"+hj_writer+"__"+bucket_suffix(), 
		catalog = []; // 不使用快取 (catalog = catalog_cached() || {} 使用快取)
	var post;

	if(!catalog.length){
		hj_update({
			action: "catalog_query", 
			writer: hj_writer, 
			page: 0, // 0=all
			keyword: keyword
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					catalog = r["Values"]["catalog"].map(function(p, n){
						p["title"] = p["title"] || _h("e-catalog-2");
						p["title_decoded"] = htmlDecode(p["title"]);
						return {
							post_id: p["post_id"], 
							title: p["title_decoded"], 
							privacy: p["privacy"], 
							editable: p["editable"], 
							outbound_count: p["outbound_count"], 
							page: Math.ceil((n+1)/10)
						};
					});

					hj__cache({set: true, bucket: bucket, data: JSON.stringify(catalog)});
					window.$d2.resolve();

					// 分頁
					var post_num = r["Values"]["catalog"].length;
					$(".catalog .pagination").attr("data-stats", 
						_h("e-catalog-"+(post_num>1?1:0), {$no: post_num})
					);
					catalog_pagination(
						!keyword ? 
						post_num : // 列表 (分頁)
						0 // 搜尋 (不分頁)
					);
				break;

				default:
					update_failed();
					window.$d2.reject();
				break;
			}
		}).fail(function(j){
			hj_update_failed({fn: "catalog_query", flag: 1, err: j});
			window.$d2.reject();
		});
	}
	else{
		window.$d2.resolve();
	}

	$.when(window.$d2).done(function(){
		catalog_listing(catalog, pg);

		// 類別 filter
		if(keyword.length>0) catalog_toggle("search");

		// toTop
		var $u = [
			$(".bk-cover-back .fa-chevron-square-up"), 
			$(".catalog[data-mobile] .fa-chevron-square-up")
		];
		if($(".catalog[data-desktop]").get(0).scrollHeight>$(".bk-cover-back>div").height()){
			$(".catalog[data-desktop]").scroll(function(){
				if($(this).scrollTop()>10) $u[0].fadeIn();
				else $u[0].fadeOut();
			});
		}
		$(".catalog[data-mobile]>div>div").scroll(function(){
			if($(this).scrollTop()>10) $u[1].fadeIn();
			else $u[1].fadeOut();
		});

		window.$d2 = $.Deferred();
	})
	.fail(function(j){
		hj_update_failed({fn: "catalog_query", flag: 2, err: j});
		window.$d2 = $.Deferred();
	});
}
	function catalog_listing(catalog, pg){
		$(".catalog .diaries").html(
			catalog.map(function(p){
				return 	$("<li>", {
					title: "📝 "+p["title"], 
					"data-post_id": p["post_id"], 
					"data-pg": p["page"], 
					"data-privacy": p["privacy"], 
					"data-editable": p["editable"], 
					"data-outbound_count": p["outbound_count"], 
					text: p["title"]
				});
			})
		);
		if(!(pg==null)) catalog_page(pg);
	}
	function catalog_pagination(post_num){ // 0 不分頁
		var page_num = Math.ceil((post_num || 0)/10), 
			$pages = [];

		for(let i=1; i<=page_num; i++){
			$pages.push(
				$("<option>", {
					value: i, 
					text: i
				})
			);
		}
		$(".pagination select").html($pages).prop("disabled", $pages.length<2);
	}

// 目錄查詢
function catalog_lookup(post_id){
	var catalog = catalog_cached(), 
		post_index = [];
	if(!catalog){
		catalog_query(null, {page: 1});
		return false;
	}
	else if(catalog.length>0){
		catalog.forEach(function(p, i){
			post_index[p["post_id"]] = i;
		});

		// 某一篇
		if(post_id>0) return post_id in post_index ? catalog[post_index[post_id]] : null;
		// 第一篇
		else if(post_id===0) return catalog[0];
		// 最後一篇
		else if(post_id===-1) return catalog[catalog.length-1];
	}
	return null;
}

// 目錄換頁
function catalog_page(v){ // {page, post_id, btn}
	if(v==null) return false;

	var page = Number(v["page"]) || 1, 
		post_id = v["post_id"] || 0, 
		$c = $(".catalog"), 
		$d = $c.find(".diaries"), 
		$pg = $c.find(".pagination");

	$d.children("li[data-active]").removeAttr("data-active");
	if(post_id>0){
		var post = catalog_lookup(post_id);
		// 查無文章
		if(post==null){
			catalog_page({page: 1});
			return false;
		}
		// 無暫存
		else if(!post){
			return false;
		}
		// 有文章
		else{
			page = post["page"];
			$d.children("li[data-post_id='"+post_id+"']").attr("data-active", "");
		}
	}
	else if(!(v["btn"]==null)){
		v["btn"].filter(".fal").toggleClass("fal fas").delay(450).queue(function(){
			$(this).toggleClass("fas fal").dequeue();
		});
	}

	// Prev
	$d.attr("data-pg", page);
	$pg.find("select").val(page);

	var $l = $pg.children(".fa-caret-circle-left"), 
		$r = $pg.children(".fa-caret-circle-right");
	if(page>1)
		$l.attr({
			onclick: "$(this).removeAttr('onclick');catalog_page({page:"+(page-1)+",btn:$(this)})"
		}).removeClass("disabled");
	else
		$l.addClass("disabled");

	// Next
	if($d.children("li[data-pg='"+(page+1)+"']").length>0)
		$r.attr({
			onclick: "$(this).removeAttr('onclick');catalog_page({page:"+(page+1)+",btn:$(this)})"
		}).removeClass("disabled");
	else
		$r.addClass("disabled");

	// ### debug REMOVE
	// $d.children("li").not("[data-pg="+page+"]").hide();
	// $d.children("li[data-pg="+page+"]").fadeIn("slow");
}

// 取得目錄 (已暫存)
function catalog_cached(){
	var bucket = "hearty_diaries_"+hj_writer+"__"+bucket_suffix(), 
		r = hj__cache({bucket: bucket});
	return r==null ? null : JSON.parse(r) || {}; // 無暫存(null) / 資料({})
}

// 目錄切換
function catalog_toggle(t){
	var $c = $(".catalog"), 
		$d = $c.find(".diaries"), 
		$pg = $c.find(".pagination"), 
		$b = $c.find(".tabs .btn_diary"), 
		$btn = {
			search: $c.find(".btn_search"), 
			bookmarks: $c.find(".btn_bookmarks"), 
			arr: $pg.find(".fa-caret-circle-left,.fa-caret-circle-right")
		}, 
		n = 0; // 計數用途

	switch(t){
		case "my":
			catalog_page({page: 1});

			n = $d.find("[data-editable='1']").length/2;
			switch(n){
				case 0:
					n = _h("e-catalog-3");
				break;

				case 1:
					n = _h("e-catalog-0");
				break;

				default:
					n = _h("e-catalog-1", {$no: n});
				break;
			}
			$pg.attr("data-stats", n);
			$d.attr("data-pg", t);
		break;

		case "shared":
			n = $d.find("[data-editable='0']").length/2;
			switch(n){
				case 0:
					n = _h("e-catalog-4");
				break;

				case 1:
					n = _h("e-catalog-0");
				break;

				default:
					n = _h("e-catalog-1", {$no: n});
				break;
			}
			$pg.attr("data-stats", n);
			$d.attr("data-pg", t);
		break;

		case "search":
			n = $d.find("[data-editable='1']").length/2;
			switch(n){
				case 0:
					n = _h("e-search-3");
				break;

				case 1:
					n = _h("e-catalog-0");
				break;

				default:
					n = _h("e-catalog-1", {$no: n});
				break;
			}
			$pg.attr("data-stats", n);
			$d.attr("data-pg", t);
		break;

		case "bookmarks":
			$d.attr("data-pg", 1); // Page 1
		break;

		case "all":
		default:
			catalog_query(null, {page: 1});
			$d.attr("data-pg", 1); // Page 1
		break;
	}

	// 圖示轉換
	$b.removeAttr("data-active");

	switch(t){
		case "search":
			$btn["bookmarks"].attr("data-queried", 0);
		break;

		case "bookmarks":
			$btn["bookmarks"].attr("data-queried", 1);
			$btn["search"].attr("data-queried", 0);
		break;

		case "my":
			$b.filter("[data-primary]").attr("data-active", "");
		break;

		case "shared":
			$b.filter("[data-shared]").attr("data-active", "");
		break;
	}

	switch(t){
		// 不分頁
		case "my":
		case "shared":
		case "search":
			catalog_pagination(0); // 無頁碼
			$btn["arr"].addClass("disabled"); // 前後頁鈕
		break;

		// 分頁
		default:
			$btn["arr"].removeClass("disabled");
		break;
	}
}

// 啟動：全頁貼紙
function stickers__initialize(){
	stickers__detach();

	var post_id = Number(current_post()["post_id"]);
	if(post_id>0){
		hj_update({
			action: "sticker_query", 
			post_id: post_id
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					var bundles = r["Values"];
					sticker__save_local(bundles);

					bundles.forEach(function(bundle){
						sticker__createDOM(bundle["id"], bundle);
					});
				break;

				case 2:
					signin_required();
				break;

				default:
					hj_update_failed({fn: "stickers__initialize", flag: 0});
				break;
			}
		}).fail(function(j){
			hj_update_failed({fn: "stickers__initialize", flag: 1, err: j});
		});
	}
}

// 初始化：設置單張貼紙屬性
function sticker__initialize(bundle_id, asset_id, sticker){
	var $a = $(".bundle .asset[data-asset_id='"+asset_id+"']"), 
		$i = $a.children(".sticker_img"), 
		blank = sticker__new_blank("asset", bundle_id, sticker);

	if("angle" in sticker)
		$i.css({transform: "rotate("+sticker["angle"]["deg"]+"deg)"});
	else
		sticker["angle"] = blank["angle"];

	if("size" in sticker)
		$i.css({
			width: sticker["size"]["width"], 
			height: sticker["size"]["height"]
		});
		// $i.width(sticker["size"]["width"]).height(sticker["size"]["height"]);
	else
		sticker["size"] = blank["size"];

	if("position" in sticker)
		$a.css({
			"top": sticker["position"]["top"], 
			"left": sticker["position"]["left"]
		});
	else
		sticker["position"] = blank["position"];

	if(current_post()["editable"]) sticker__editor_initialize(bundle_id, asset_id, sticker);
	else sticker__paste({bundle_id: bundle_id, asset_id: asset_id});
}

// 初始化：設置貼紙編輯功能
function sticker__editor_initialize(bundle_id, asset_id, sticker){
	var touch_device = is_touch_device(), 
		$a = $(".bundle .asset[data-asset_id='"+asset_id+"']"), 
		$i = $a.children(".sticker_img");

	// # Draggable
	$a.draggable({
		start: function(e, ui){
			if(touch_device) $i.addClass("dragging");
			else $i.addClass("grabbing");
			if($i.hasClass("dragthis")) $i.removeClass("dragthis");
		}, 
		stop: function(e, ui){
			/* plugin default
				ui.position.top;
				ui.position.left;
				ui.position.right = editor_width-(ui.position.left+$(this).width());
				ui.position.align_right = (ui.position.left+$(this).width()/2) > Math.floor($("#editor").width()/2) ? 1 : 0;
			*/

			e.stopPropagation();
			var c = sticker__draggable_handle(bundle_id, asset_id);
			sticker__update(bundle_id, asset_id, "position", c["pos"]);

			if(touch_device) $i.removeClass("dragging");
			else $i.removeClass("grabbing");
		}, 
		snap: true, 
		containment: "#editor", 
		scroll: false, 
		cursor: "move", 
		grid: [5, 5], 
		cancel: ".ui-rotatable-handle"
	});

	// jQueryUI Rotatable
	var angle = sticker["angle"]["deg"], 
		angle_rad = angle/57.296, 
		params = {
		angle: angle_rad, // format: rad
		rotationCenterOffset: {top: 0, left: 0}, 
		// 觸發：handle 旋轉
		start: function(e){
			$i.data("rotate-mode", 1);
		}, 
		// 觸發：handle + 滾輪旋轉
		rotate: function(e, ui){
			// 滑鼠滾輪
			if($i.data("rotate-mode")===0){
				e.stopPropagation(); // 防止頁面滾動
				/* ALT: 
				if(e.cancelable){ // segmentfault.com/a/1190000007621605
					if(!e.defaultPrevented) e.preventDefault();
				}
				*/

				angle_rad = ui.angle.current; angle = ui.angle.degrees;
				sticker__update(bundle_id, asset_id, "angle", {deg: angle, rad: angle_rad});
				sticker__rotation_margin_fixes(bundle_id, asset_id);
			}
		}, 
		// 觸發：handle 旋轉
		stop: function(e, ui){
			angle_rad = ui.angle.current; angle = ui.angle.degrees;
			sticker__update(bundle_id, asset_id, "angle", {deg: angle, rad: angle_rad});
			$i.data("rotate-mode", 0);
			sticker__rotation_margin_fixes(bundle_id, asset_id);
		}, 
		rotationCenterOffset: {top: 0, left: 0}, 
		wheelRotate: true
	};
	$i.rotatable(params).data("rotate-mode", 0);

	// Assign Handles
	$i.find(".ui-rotatable-handle").remove();
  	var se = $("<div>", {class: "ui-rotatable-handle", title: _h("e-sticker-1")});
		if(!touch_device){
			var ne = se.clone(),
				nw = se.clone(),
				sw = se.clone();
			ne.addClass("ui-rotatable-handle-ne");
			nw.addClass("ui-rotatable-handle-nw");
			sw.addClass("ui-rotatable-handle-sw");
			$i.append(ne, nw, sw);
		}
		// 手機版，handle-se 旋轉與縮放共用
		se.addClass("ui-rotatable-handle-se segrip");
		$i.append(se);

	// Event Binding
	$i.find("div[class*='ui-rotatable-handle-']").bind("mousedown", function(e){
		$i.rotatable("instance").startRotate(e);
	});
	// # OFF: $i.rotatable("disable");

	// # Resizable
	if(!touch_device){
		var aspect_ratio = $i.width()/$i.height(), 
			handles = touch_device ? {
				// ### 將右下旋轉掛載縮放 (手機)
				// se: ".segrip"
			} : {
				n: ".ngrip", e: ".egrip", s: ".sgrip"
			};
		$i.resizable({
			resize: function(e, ui){
				$a.css({"min-width": ui.size.width});
			}, 
			stop: function(e, ui){
				sticker__update(bundle_id, asset_id, "size", {
					width: ui.size.width, 
					height: Math.round(ui.size.height)
				});

				// Position Reset
				$(this).height(ui.size.width/aspect_ratio).css({top: 0, left: 0});
			}, 
			containment: "#editor", 
			aspectRatio: true, 
			grid: 5, 
			minWidth: 80, 
			minHeight: 80, 
			maxWidth: $("#editor_editable").width()*0.85, 
			maxHeight: 640, 
			handles: handles
		});
		// # OFF: $i.resizable("disable");
	}

	// Mobile Editing
	if(touch_device){
		$(".ui-resizable-n,.ui-resizable-e,.ui-resizable-s").remove();

		// # Rotatable
		$i.get(0).addEventListener("touchmove", function(e){
			if("touches" in e){
				var dist = {x: 0, y: 0, sum: 0}, 
					sum = hj__cache({bucket: "hearty_sticker_finger_gap"}) || null, 
					gap = 0, 
					width = $i.width(), 
					height = $i.height(), 
					width_ceil = {max: $("#editor_editable").width()*0.85, min: 80}, 
					zoom_ratio = 1;

				if(!$i.data("aspect_ratio")){
					var aspect_ratio = width/height; $i.data({aspect_ratio: aspect_ratio});
				}
				else{
					var aspect_ratio = $i.data("aspect_ratio");
				}

				if(e.touches.length>1){
					dist["x"] = Math.abs(e.touches[1].pageX-e.touches[0].pageX);
					dist["y"] = Math.abs(e.touches[1].pageY-e.touches[0].pageY);
					dist["sum"] = Math.floor(Math.sqrt(Math.floor(
						dist["x"]**2+dist["y"]**2
					)));

					// 減去舊資料
					if(sum!==null) gap = dist["sum"]-sum;
					gap = isNaN(gap) ? 0 : gap;
					hj__cache({set: true, bucket: "hearty_sticker_finger_gap", data: dist["sum"]});

					// 計算新的寬高
					zoom_ratio = gap/width*0.4;
					width += width*zoom_ratio;
					height = width/aspect_ratio;

					if(width<width_ceil["min"]){
						height *= width_ceil["min"]/width;
						width = width_ceil["min"];
					}
					else if(width>width_ceil["max"]){
						height *= width_ceil["max"]/width;
						width = width_ceil["max"];
					}

					width = Math.round(width*1000)/1000;
					height = Math.round(height*1000)/1000;

					var icon_size = Math.floor(Math.min(width, height)*0.45);
					$i.width(width).height(height).css({
						"font-size": icon_size>100 ? 100 : icon_size
					});

					// 回存
					sticker__update(bundle_id, asset_id, "size", {"width": width, "height": height});

					// 圖示
					if(Math.abs(gap)>0 && $i.hasClass("rotating")) $i.removeClass("rotating");
					$i.addClass("resizing");
					if($i.hasClass("dragthis")) $i.removeClass("dragthis");
				}
			}

		}, {passive: true});

		$i.get(0).addEventListener("touchend", function(e){
			hj__cache({set: true, bucket: "hearty_sticker_finger_gap"});

			$i.removeClass("resizing");
		}, {passive: true});

		// interact.js (Long Press)
		interact(".asset[data-asset_id='"+asset_id+"']").on("hold", function(e){
			if(!$(".asset[data-asset_id='"+asset_id+"'] .sticker_editing").length){
				sticker__cut({bundle_id: bundle_id, asset_id: asset_id});
				hj_vibrate(30);
			}
		});

		var angle = parseFloat(sticker["angle"]["deg"]), angle_rad = angle/57.296;
		interact(".asset[data-asset_id='"+asset_id+"'] .sticker_img").gesturable({
			onmove: function(e){
				angle += e.da; // format: deg

				$i.css({
					"transform": "rotate("+angle+"deg)"
				});

				if(angle>360) angle -= 360;
				else if(angle<0) angle += 360;
				angle_rad = angle/57.296;

				sticker__update(bundle_id, asset_id, "angle", {deg: angle, rad: angle_rad});
				sticker__rotation_margin_fixes(bundle_id, asset_id);

				if(Math.abs(e.da)>0.5) $i.removeClass("resizing").addClass("rotating");
				hj_log("* 更新貼紙角度 "+asset_id+"："+parseFloat(angle).toFixed(2)+' °');
			}
		}).on({
			gestureend: function(e){
				$i.removeClass("rotating");
			}
		});
		// # OFF: interact(".bundle .asset_"+asset_id+" .sticker_img").gesturable({enabled: false});

		/* Click-Twice Issue Solved ( www.sitepoint.com/community/t/what-is-best-mouse-event-for-click-on-mobile-devices/263472/4 )
			$a.mouseover(function(){
				$(this).click();
			});
		*/

		$i.css({
			"transform": "rotate("+angle+"deg)"
		});
	}
	sticker__paste({bundle_id: bundle_id, asset_id: asset_id});
	hj_log("🏮 初始化貼紙："+bundle_id+"（"+asset_id+"）");
}

// 貼紙清除
function stickers__detach(){
	sticker__save_local([]);
	$("#editor .bundle").remove();
}

// 新增貼紙
function sticker__oncreate(sticker, locked){
	var post_id = current_post()["post_id"];
	if(Number(locked)>0){
		nav_toggle($(".stickerbook"), false);
		hj_upgrade_toggle(true);
	}
	else{
		sticker__create(sticker);

		ga_evt_push("Sticker Create", {
			event_category: "Posts", 
			event_label: "Sticker Create"
		});
	}
}

function sticker__create(item, bundle_id){
	if(!current_post()["editable"]) return false;
	var r = sticker__lookup("page"), 
		page = "page" in r[1] ? r[1]["page"] : {}, 
		bundles = "bundles" in r[1] ? r[1]["bundles"] : [], 
		new_bundle = bundle_id==null, 
		asset_id = sticker__uniqID(), 
		asset_max = {width: 160, height: 160}, 
		asset_ratio = Math.min(asset_max.width/item.width, asset_max.height/item.height);
	var bundle;

	item["width"] = Math.ceil(item.width*asset_ratio);
	item["height"] = Math.ceil(item.height*asset_ratio);
	item["align_right"] = 1; // 預設靠右

	// 需建立新 bundle
	if(new_bundle){
		bundle_id = sticker__uniqID();
		bundle = sticker__new_blank("bundle", bundle_id, item);

		// 1. 設置新貼紙的絕對位置，於所有貼紙之後，以不影響現有排版的預覽
		var sum_arr = bundles.map(function(v, i){
			return bundles[i]["position"]["sum"]
		}); sum_arr.push(0); // sum_arr: 至少給個 0，避免 Math.max 輸出無限

		var last_sum_in_bundles = Math.max.apply(null, sum_arr);

		// 更新其 top
		bundle["position"]["top"] = last_sum_in_bundles; page[bundle_id] = bundle;

		// 2. 定焦在貼紙可貼，並將新貼紙貼於捲動窗格中央
		var editor_scrolled = $(".bk-page").scrollTop() || 0, 
			editor_readable = {
				width: $("#editor").width() || 0, 
				height: $(".bk-page").height() || 0
			}, 
			editor_topmargin = $("#editor").get(0).offsetTop;

		// 視窗定焦
		if(editor_scrolled<editor_topmargin){
			editor_scrolled = editor_topmargin;
			$(".bk-page").animate({scrollTop: editor_scrolled}, 100);
		}

		// 貼紙位置
		var pos = {
			// 自絕對位置向上移動像素 (負值)
			move: {
				top: editor_scrolled
				// 在手機上需加上標題列+圖片之高 (電鬧上則否)
				 + (is_touch_device() ? editor_topmargin : 0)

				 - editor_readable["height"]*0.4
				 - last_sum_in_bundles
			}, 
			// 絕對位置
			def: {
				top: editor_scrolled
				 - editor_topmargin
				 + editor_readable["height"]*0.5
				 - item["height"]
				 + 50, 
				left: !item["align_right"] ? 
					editor_readable["width"]*0.1||0 : // 靠左
					editor_readable["width"]-item["width"]||0, // 靠右
			}
		}, 
		default_position = {
			top: Math.ceil(pos["move"]["top"]), 
			left: Math.round(pos["move"]["left"])
		};
	}
	// 加入既存 bundle
	else{
		var default_position = null;
		bundle = page[bundle_id];
	}

	// 寫入 asset
	page[bundle_id]["assets"][asset_id] = bundle["assets"][asset_id] = sticker__new_blank("asset", bundle_id, item);

	// 回存
	bundles = Object.keys(page).map(function(k){return page[k]});
	sticker__save_local(bundles);

	// 建立 DOM
	sticker__createDOM(bundle_id, bundle, default_position);

	// 排版對位：將預設位置覆寫暫存 & 回傳資料庫
	if(new_bundle){
		bundle["position"] = bundle["assets"][asset_id]["position"] = {
			top: Math.floor(pos["def"]["top"]), 
			left: Math.round(pos["def"]["left"]), 
			right: 0, 
			align_right: 1
		};
		page[bundle_id]["assets"][asset_id] = bundle["assets"][asset_id];

		// position 暫存
		sticker__update(bundle_id, asset_id, "position", 
			bundle["assets"][asset_id]["position"]
		);

		// DB
		var asset = bundle["assets"][asset_id];
		hj_update({
			action: "sticker_create", 
			post_id: current_post()["post_id"], 
			data: {
				bundle_id: bundle_id, 
				asset_id: asset_id, 
				bundle_top: bundle["position"]["top"], 
				bundle_left: bundle["position"]["left"],  
				bundle_right: bundle["position"]["right"], 
				bundle_align_right: bundle["position"]["align_right"], 
				item_num: asset["item_num"], 
				asset_width: asset["size"]["width"], 
				asset_height: asset["size"]["height"]
			}
		}).then(function(r){
			switch(r["Status"]){
				case 0:
					update_failed(); return;
				break;

				case 2:
					signin_required(); return;
				break;

				case 3:
					msg(_h("e-sticker-4"), '<i class="fas fa-star"></i> '+_h("e-sticker-5"), function(){  
						hj_upgrade_toggle(true);
					});
					return;
				break;
			}
		});
	}

	// 剪下貼紙
	sticker__cut({bundle_id: bundle_id, asset_id: asset_id});

	// 開書
	open_book(true);
	// hj_vibrate(30);

	hj_log("➕ 新增貼紙："+bundle_id+"（"+asset_id+"）");
}

// 新增貼紙 DOM
function sticker__createDOM(bundle_id, bundle, default_pos){
	var $a, $b, $i, asset, item;

	// bundles
	$b = $("<div>", {
			class: "bundle", 
			"data-bundle_id": bundle_id, 
			html: $("<div>", {class: "bundle_innerbox"}), 
			onContextMenu: "return false;"
		})
		.data("bundle-id", bundle_id)
		.insertBefore("#editor_editable");

	// assets
	for(let asset_id in bundle["assets"]){
		asset = bundle["assets"][asset_id];

		$a = $(".hj-sample .asset").clone().attr({
				title: asset["item_name"], 
				"data-editing": true, 
				"data-bundle_id": bundle_id, 
				"data-asset_id": asset_id
			})
			.data("asset-id", asset_id)
			.fadeTo("slow", 0.35);
		$b.children(".bundle_innerbox").append($a);

		$i = $(".asset[data-asset_id='"+asset_id+"'] .sticker_img");
		$i.width(asset["size"]["width"]).height(asset["size"]["height"]).addClass("dragthis").css({
			"background-image": "url('//i.hearty.app/b/images/stickers/"+asset["set_alias"]+"/"+asset["item_num"]+".png')"
		});
		if(is_touch_device()){
			$i.children(".detach").get(0).addEventListener("touchmove", function(e){
				e.stopPropagation();
			}, {passive: true});
		}

		// 原有：直接顯示
		if(default_pos==null)
			$a.fadeTo("slow", 1);
		// 新增：設起始位置
		else
			setTimeout(function(){ // Known Deferred Issue
				$a.animate(default_pos, 150).fadeTo("slow", 1);
			}, 0);

		sticker__initialize(bundle_id, asset_id, bundle["assets"][asset_id]);
	}
}

// 貼紙已旋轉，需以三角函數計算出 bundle 的外框空間
function sticker__rotation_margin_fixes(bundle_id, asset_id){
	var $a = $(".bundle .asset[data-asset_id='"+asset_id+"']"), 
		$i = $a.children(".sticker_img");

	if($i.length<1) return;
	var bundle_width = Math.floor($i.get(0).getBoundingClientRect().width*0.9), 
		bundle_height = Math.floor($i.get(0).getBoundingClientRect().height*0.9);

	hj_log("貼紙尺寸："+bundle_width+" x "+bundle_height);
	if(!bundle_width || !bundle_height) return false;

	// .asset 容器尺寸
	sticker__update(bundle_id, asset_id, "size", {
		width: bundle_width, 
		height: bundle_height
	}, true);

	$a.css({
		"min-width": bundle_width, 
		"max-height": bundle_height
	});

	/* Sol B (三角函數)
	angle_rad = Math.abs(angle_rad);
	var r = ((angle_rad > Math.PI*0.5 && angle_rad < Math.PI*1) || (angle_rad > Math.PI*1.5 && angle_rad < Math.PI*2)) ? Math.PI - angle_rad : angle_rad, 
		w = Math.abs( Math.sin(r)*$i.height()+Math.cos(r)*$i.width() ), 
		h = Math.abs( Math.sin(r)*$i.width()+Math.cos(r)*$i.height() );
	$a.width(w).height(h);
	*/
}

// 空白格式
function sticker__new_blank(scope, bundle_id, item){
	var blank = {};
		blank.position = {
			"top": isNaN(item["top"]) ? 0 : item["top"], 
			"left": isNaN(item["left"]) ? 0 : item["left"], 
			"right": isNaN(item["right"]) ? 0 : item["right"], 
			"topmargin": 0, 
			"align_right": isNaN(item["align_right"]) ? 0 : item["align_right"]
		};
		blank.size = {"width": item["width"], "height": item["height"]};

	if(scope=="asset"){
		blank.item_num = isNaN(item["num"]) ? 0 : item["num"];
		blank.item_name = item["name"];
		blank.set_num = isNaN(item["set_num"]) ? 0 : item["set_num"];
		blank.set_alias = item["set_alias"];
		blank.angle = {"deg": 0, "rad": 0}
	}
	else if(scope=="bundle"){
		blank.id = bundle_id || sticker__uniqID();
		blank.assets = {};
		blank.position.sum = 0;
	}
	return blank;
}

// 排版：調整 bundle 項次位置
function sticker__exec(mode, bundle, bundles){
	var adjusted = false;

	if(bundles==null){
		var r = sticker__lookup("page");
		if(r[0]) var page = r[1]["page"], bundles = r[1]["bundles"];
		else return false;
	}
	switch(mode){
	    case "add": // 調整項 i & i++
	    	var len = bundles.length;

	    	// 唯一項
		    if(!len){
		    	bundles.push(bundle);
		    }
		    else{
				for(let i=0; i<len; i++){
					// 調整 i++ 項
					if(adjusted){
						// 若原空間不足，為騰出空間，則將 i++ 項(含)以後，全數下移
						if(bundles[i]["position"]["sum"]>bundles[i]["position"]["top"]){
							var push = bundles[i]["position"]["sum"]-bundles[i]["position"]["top"];
							for(let k=i; k<len; k++)
								bundles[k]["position"]["top"] += push;
						}

					}
					else{
						// 置於 i項之前，或作為最末項
						if(bundles[i]["position"]["top"]>bundle["position"]["top"] || i+1===len){
							bundles[i]["position"]["topmargin"] = i>0 ? 
								bundles[i]["position"]["top"]-bundles[i-1]["position"]["sum"] : // 排中
								bundles[i]["position"]["top"]; // 排頭

							bundles[i]["position"]["sum"] = 
								bundles[i]["position"]["top"]+bundles[i]["size"]["height"];

							// 插入
							bundles.splice(i, 0, bundle);
							adjusted = true;
						}
					}

				}
		    }

			// 回存	
			sticker__save_local(bundles);

			// DOM 排版
			sticker__createDOM(bundle["id"], bundle);

			return sticker__place(sticker__calc(sticker__order(bundles)));
		break;

	    case "remove":
		    for(let i=0; i<bundles.length; i++){
				// 調整 i 項
				if(bundles[i]["id"]==bundle["id"]){
					bundles.splice(i, 1); // 剔除陣列元素
					adjusted = true;
				}
				// 調整同側 i+1 項 (若存在)
				else if(!!adjusted && 
						bundles[i]["position"]["align_right"]==bundles[i-1]["position"]["align_right"]
					){
						bundles[i]["position"]["topmargin"] += 
						(bundles[i-1]["position"]["topmargin"]+bundles[i-1]["size"]["height"]);

					adjusted = false;
				}
		    }

			// 回存
			sticker__save_local(bundles);	

			// DOM 排版
			$(".bundle[data-bundle_id='"+bundle["id"]+"']").fadeOut(200, function(){$(this).remove()});

			return sticker__place(bundles);
		break;
	}	
}

// 排版：依各 bundle 絕對高度排序
function sticker__order(bundles){
	if(bundles==null){
		var r = sticker__lookup("page");
		if(r[0]) var page = r[1]["page"], bundles = r[1]["bundles"];
		else return false;
	}

	// 排序陣列
	if(bundles.length>1)
		bundles.sort(function(x, y){
			return x["position"]["top"] - y["position"]["top"];
		});

	// 排序 DOM
	bundles.forEach(function(bundle){
		$(".bundle[data-bundle_id='"+bundle["id"]+"']").detach().insertBefore("#editor_editable"); // .prependTo("#editor");
	});
	return bundles;
}

// 排版：計算 bundle 各項數值
function sticker__calc(bundles, mode, bundle_assigned){
	if(bundles==null){
		var r = sticker__lookup("page");
		if(r[0]) 
			var page = r[1]["page"], bundles = r[1]["bundles"];
		else 
			return false;
	}

	// 調整貼紙位置
	switch(mode){
	    case "add":
	    	bundles = sticker__exec("add", bundle_assigned, bundles);
		break;

	    case "remove":
	    	bundles = sticker__exec("remove", bundle_assigned, bundles);
		break;
	}

	var sides = ["left", "right"], 
		last = {
			alignment: "", 
			top: 0, 
			sum: {left: 0, right: 0}
		};

	bundles.forEach(function(bundle, i){
		// 分邊
		var alignment = bundle["position"]["align_right"], 
			alignment_opposite = alignment;
		alignment = sides[alignment];
		alignment_opposite = sides[alignment_opposite^=1];

		// top 值需大於 0
		bundle["position"]["top"] = Math.max(bundle["position"]["top"], 0);

		// 計算上邊界
		// 非首項且與前組為對邊者
		if(i>0 && alignment!==last["alignment"]){
			// 減去對邊前組的 topmargin
			bundle["position"]["topmargin"] = bundle["position"]["top"] - last["top"];
		}
		else{
			// top 值需大於同邊的前一組 sum
			bundle["position"]["top"] = Math.max(bundle["position"]["top"], last["sum"][alignment]+1);

			// 減去前組的 sum
			bundle["position"]["topmargin"] = bundle["position"]["top"] - last["sum"][alignment];
		}
		// topmargin 值需大於 0
		bundle["position"]["topmargin"] = Math.max(bundle["position"]["topmargin"], 0);

		// 計算 sum：絕對高度 + 自有高度
		last["sum"][alignment] = bundle["position"]["sum"] = bundle["position"]["top"]+bundle["size"]["height"];

			// 若與前者同邊，則覆寫對邊 sum (為對應 complement)
			if(i>0 && alignment==last["alignment"])
				for(let a in last["sum"]) last["sum"][a] = bundle["position"]["sum"]; // ALT: last["sum"][alignment_opposite] = last["sum"][alignment];

		// asset 數值自 bundle 繼承
		for(let asset_id in bundle["assets"]){
			bundle["assets"][asset_id]["position"]["top"] = bundle["position"]["top"];
			bundle["assets"][asset_id]["position"]["topmargin"] = bundle["position"]["topmargin"];
			bundle["assets"][asset_id]["position"]["align_right"] = bundle["position"]["align_right"];
		}

		// 回存準備
		bundles[i] = bundle;

		// 寫入暫存
		last["alignment"] = alignment;
		last["top"] = bundle["position"]["top"];

		if(i===0) sticker__top_edge(bundle);

		hj_log("📄 調整貼紙位置 "+bundle["id"]+"："+JSON.stringify(bundle["position"]));
	});

	sticker__save_local(bundles); // 回存
	return bundles;
}

// 上緣置中貼紙(top<50px)，走滿版
function sticker__top_edge(bundle){
	return false;

	if(bundle==null){
		var r = sticker__lookup("page");
		if(r[0] && r[1]["bundles"].length>0){
			bundle = r[1]["bundles"][0];
		}
		else{
			$("#editor_editable").css({"padding-top": "1em"});
			return false;
		}
	}

	var editor_width = $("#editor").width();
	if(bundle["position"]["top"]<50 && (bundle["position"]["left"]>editor_width/4 && bundle["position"]["left"]<editor_width*3/5)){
		var $a = $(".bundle:first .asset");
		if($a.length>0)
			$("#editor_editable").css({
				"padding-top": Math.ceil($a.get(0).getBoundingClientRect().height)+"px"
				// ALT: (bundle["position"]["top"]+bundle["size"]["height"]+10)+"px"
			});
	}
	else{
		$("#editor_editable").css({"padding-top": "1em"});
	}
	return true;
}

// 排版：更新 Dom 上邊界
function sticker__place(bundles){
	if(bundles==null){
		var r = sticker__lookup("page");
		if(r[0]) 
			var page = r[1]["page"], bundles = r[1]["bundles"];
		else 
			return false;
	}

	var $s = $(".hj-styles");
	bundles.forEach(function(bundle){
		if(!$s.children("style[data-bundle_id='"+bundle["id"]+"']").length){
			$s.append($("<style>", {"data-bundle_id": bundle["id"]}));
		}
		else{
			var s = !bundle["position"]["align_right"] ? 
				'.bundle.bundle_left[data-bundle_id="'+bundle["id"]+'"]::before{height:'+bundle["position"]["topmargin"]+'px}' : // 靠左
				'.bundle.bundle_right[data-bundle_id="'+bundle["id"]+'"]::before{height:'+bundle["position"]["topmargin"]+'px}'; // 靠右
			$s.children("style[data-bundle_id='"+bundle["id"]+"']").text(s);
		}
	});

	// 將 float 元素成對配對
	$("#editor .complement").remove();
	$("#editor .bundle").each(function(i){
		var c1 = $(this).attr("class").split(" "), 
			c2 = $("#editor .bundle").length>i+1 ? $(this).nextAll("#editor .bundle").eq(0).attr("class").split(" ") : [];

		if(c1.indexOf("bundle_left")>=0 && c2.indexOf("bundle_left")>=0)
			$(this).after($("<div>", {class: "complement complement_right"}));
		else if(c1.indexOf("bundle_right")>=0 && c2.indexOf("bundle_right")>=0)
			$(this).after($("<div>", {class: "complement complement_left"}));
	});
	return bundles;
}

// 查詢：讀取 + 剖析資料
function sticker__lookup(scope, bundle_id, asset_id){
	var raw = hj__cache({bucket: "hearty_sticker_cache__"+current_post()["post_id"]}), 
		r = [r!==null, JSON.parse(raw) || []], 
		callback = [false, {}];

	if(r[0]){
		var page = {}, bundles = r[1];
		var bundle;

		// 陣列轉物件
		bundles.forEach(function(bundle){
			page[bundle["id"]] = bundle;
		});

		callback[1]["page"] = bundles.length>0 ? page : {};
		callback[1]["bundles"] = bundles.length>0 ? bundles : [];

		// 回傳 page
		if(scope=="page"){
			callback[0] = true;
			callback[1]["status"] = 4;
		}
		// 查有 bundle
		else if(bundle_id in page){
			bundle = callback[1]["bundle"] = page[bundle_id];

			// 查有 asset
			if(scope=="asset" && asset_id in bundle["assets"]){
				callback[0] = true;
				callback[1]["status"] = 3;
				callback[1]["asset"] = bundle["assets"][asset_id];
			}
			// 查無 asset
			else{
				callback[0] = scope=="bundle";
				callback[1]["status"] = 2;
			}
		}
		// 查無 bundle
		else{
			callback[0] = false;
			callback[1]["status"] = 1;
		}
	}
	else{
		callback[0] = false;
		callback[1]["status"] = 0;
	}
		return callback;
	/*
		callback[1]["status"]
		0. 無陣列
		1. 無 bundle
		2. 有 bundle、無 asset
		3. 都有
		4. 有 page
	*/
}

// 更新資料
function sticker__update(bundle_id, asset_id, label, data, bundle_only){
	var r = sticker__lookup("asset", bundle_id, asset_id);
	var page, bundles;

	// 資料處理
	if(label=="angle"){
		data["deg"] = Math.abs(data["deg"])>=360 ? Math.abs(data["deg"]).toFixed(0)-360 : data["deg"].toFixed(0);
		data["rad"] = Math.abs(data["rad"])>=Math.PI*2 ? (Math.abs(data["rad"])-Math.PI*2).toFixed(5) : data["rad"].toFixed(5);
	}
	else{
		for(let k in data) data[k] = Math.max(Math.floor(data[k]), 0); // 正整數
	}

	if(r[0] && label in r[1]["asset"]){
		page = r[1]["page"];

		// 更新 asset
		if(!bundle_only) page[bundle_id]["assets"][asset_id][label] = data;

		// 更新 bundle
		if(["position", "size"].indexOf(label)>=0) page[bundle_id][label] = data;
	}
	else{
		return false;
	}

	bundles = Object.keys(page).map(function(k){return page[k]});
	sticker__save_local(bundles);
	hj_log("💾 暫存貼紙 "+bundle_id+"（"+asset_id+"）的 "+label+" 為："+JSON.stringify(data));
}

// 剪下貼紙
function sticker__cut(d){
	if(!current_post()["editable"] || $(".bk-page .sticker_editing").length>0)
		return false;

	var bundle_id = d["bundle_id"], 
		asset_id = d["asset_id"], 
		$b = $(".bundle[data-bundle_id='"+bundle_id+"']"), 
		$a = $b.find(".asset[data-asset_id='"+asset_id+"']"), 
		$i = $a.children(".sticker_img"), 
		$e = $(".editor_toolbelt"), 
		r = sticker__lookup("asset", bundle_id, asset_id), 
		touch_device = is_touch_device();
	var pos;

	if(r[0] && "position" in r[1]["asset"]){
		pos = r[1]["asset"]["position"];
		$b.children(".bundle_innerbox").css({
			top: pos["top"], left: pos["left"]
		});

		// 左右
		var px = !pos.align_right ? 
			pos["left"] : // L
			-1*(pos["right"]+Math.floor($i.get(0).getBoundingClientRect().width*1.05)); // R
		$a.animate({left: px}, 0);
	}
	else{
		$b.remove();
		return false;
	}

	// 編輯器
	$a.draggable("enable");
	$i.rotatable("enable").children(".ui-resizable-handle,.ui-rotatable-handle").fadeIn();
	if(touch_device){
		interact(".asset[data-asset_id='"+asset_id+"'] .sticker_img").gesturable({enabled: true});
	}
	else{
		$i.resizable("enable");
		sticker__editor_hotkeys(true, bundle_id, asset_id);
	}

	// CSS 切換
	$("#editor_editable")
		.addClass("readonly")
		.prop({contenteditable: false})
		.disableSelection();

	$b.children(".bundle_innerbox").width(0).css({
		"margin-left": "-1px", 
		"margin-right": "-1px"
	});

	$i.addClass("sticker_editing").removeClass("sticker_static");
	$("#editor .bundle .sticker_static").fadeTo("fast", 0.5);

	// 剪下鈕
	$a.attr("data-editing", true);

	// 工具列鈕
	$(".editor_toolbelt #paste,#editor").attr({onclick: "sticker__paste("+JSON.stringify({bundle_id: bundle_id, asset_id: asset_id})+",true);saved(false)"});
	$i.children(".detach").fadeIn();
	$e.find(".kits").hide(); $e.find(".sticker span").fadeIn();

	// 貼紙簿
	$(".mh-head .btn_stickerbook,.stickerbook .stickerlist").hide();
	nav_toggle($(".stickerbook"), false);

	// 隱藏日記上方
	if(touch_device){
		$(".bk-page").find("header,.frame").hide();

		$(".bk-page").css({"border-top": "none"}).get(0).scroll({
			top: Math.floor(pos["top"]-$(".bk-page").height()*1/4), 
			behavior: "instant"
		});
		/* LEGACY
		$(".bk-page").removeClass("scroll-smoothly").scrollTop(
			Math.floor(pos["top"]-$(".bk-page").height()*1/4)
		).css({"border-top": "none"});
		*/
	}

	/* iOS Fix (iOS Safari Menu Bar Covered)
	if(check_OS("iOS"))
		setTimeout(function(){
			switch($e.css("bottom")){
				case "0px": $e.css("bottom", "-1px"); break;
				case "-1px": $e.css("bottom", "0px"); break;
			}
		}, 1000);
	*/

	hj_log("✂️ 剪下貼紙："+bundle_id+"（"+asset_id+"）");
	return true;
}

// 黏上貼紙
function sticker__paste(d, scrollintoview){
	var $i = $(".bk-page .sticker_editing");
	if(!$i.length) return false;

	var bundle_id = !(d==null) && "bundle_id" in d ? d["bundle_id"] : $i.attr("data-bundle-id"), 
		asset_id = !(d==null) && "asset_id" in d ? d["asset_id"] : $i.attr("data-asset-id"), 
		$b = $(".bundle[data-bundle_id='"+bundle_id+"']"), 
		$a = $b.find(".asset[data-asset_id='"+asset_id+"']"), 
		$i = $a.children(".sticker_img"), 
		$s = $(".hj-styles"), 
		bundles = sticker__calc(sticker__order()), // 排序 + 重算
		r = sticker__lookup("asset", bundle_id, asset_id), 
		touch_device = is_touch_device();
	var pos;

	if(r[0] && "position" in r[1]["asset"]){
		pos = r[1]["asset"]["position"];

		// 對齊靠左
		if(!pos.align_right){
			$b.addClass("bundle_left").removeClass("bundle_right");
			$b.children(".bundle_innerbox").addClass("alignment_left").removeClass("alignment_right");

			// 上下
			if(!$s.children("style[data-bundle_id='"+bundle_id+"']").length)
				$s.append($("<style>", {"data-bundle_id": bundle_id}));
			$s.children("style[data-bundle_id='"+bundle_id+"']").text(".bundle[data-bundle_id='"+bundle_id+"'].bundle_left::before{height:"+pos["topmargin"]+"px}");

			// 左右
			$b.children(".bundle_innerbox").css({
				"margin-left": pos.left+"px", 
				"margin-right": 0
			});
		}
		// 對齊靠右
		else{
			$b.addClass("bundle_right").removeClass("bundle_left");
			$b.children(".bundle_innerbox").addClass("alignment_right").removeClass("alignment_left");

			// 上下
			if(!$s.children("style[data-bundle_id='"+bundle_id+"']").length)
				$s.append($("<style>", {"data-bundle_id": bundle_id}));
			$s.children("style[data-bundle_id='"+bundle_id+"']").text(".bundle[data-bundle_id='"+bundle_id+"'].bundle_right::before{height:"+pos["topmargin"]+"px}");
			// 左右
			$b.children(".bundle_innerbox").css({
				"margin-left": 0, 
				"margin-right": pos.right+"px"
			});
		}
		if(cssFeatureSupported("width", "min-content")) $b.children(".bundle_innerbox").width("min-content").height("min-content");
		else if(cssFeatureSupported("width", "min-intrinsic")) $b.children(".bundle_innerbox").width("min-intrinsic").height("min-intrinsic");
		else $b.children(".bundle_innerbox").width("auto").height("auto");
	}

	// DOM 排版
	sticker__place(bundles);
	$("#editor .bundle .sticker_static").fadeTo("fast", 1);

	// 工具列鈕
	$i.children(".detach").fadeOut();
	$(".editor_toolbelt .sticker a").hide(); $(".editor_toolbelt .kits").fadeIn();

	// 顯示日記上方
	if(touch_device){
		$(".bk-page").find("header,.frame").show();
		var editor_topmargin = $("#editor").get(0).offsetTop, 
			editor_scrolled = $(".bk-page").scrollTop() || 0, 
			$p = $(".bk-page");

		if(scrollintoview) $p.scrollTop(editor_scrolled+editor_topmargin);
		$p.css({"border-top": "1em solid transparent"});
	}

/*
	// 顯示日記上方
	if(touch_device){
		$(".bk-page").find("header, .frame").show();
		$(".bk-page").css("border-top", "1em solid transparent");
	}

	// 聚焦於貼圖
	if(scrollintoview){
		var editor_topmargin = $("#editor").get(0).offsetTop, 
			editor_scrolled = $(".bk-page").scrollTop() || 0;

		if("scrollIntoViewIfNeeded" in $i.get(0)) $i.get(0).scrollIntoViewIfNeeded();
		else if("scrollIntoView" in $i.get(0)) $i.get(0).scrollIntoView();
		else $(".bk-page").scrollTop(editor_scrolled+editor_topmargin);
	}
*/
	sticker__rotation_margin_fixes(bundle_id, asset_id);

	// 編輯器
	$a.attr("data-editing", false).css({top: 0, left: 0});
	$i.children(".ui-resizable-handle,.ui-rotatable-handle").hide();
	if(current_post()["editable"]){
		$a.draggable("disable");
		$i.rotatable("disable");
		if(touch_device){
			interact(".bundle .asset[data-asset_id='"+asset_id+"'] .sticker_img").gesturable({enabled: false});
		}
		else{
			$i.resizable("disable");
			sticker__editor_hotkeys(false, bundle_id, asset_id);
		}

		$("#editor_editable").prop({contenteditable: true});

		// 貼紙簿
		$(".mh-head .btn_stickerbook,.stickerbook .stickerlist").show();
	}

	$("#editor").removeAttr("onclick");

	$("#editor_editable")
		.removeClass("readonly")
		.enableSelection();

	$i.addClass("sticker_static").removeClass("sticker_editing");

	hj_log("📋 黏貼貼紙："+bundle_id+"（"+asset_id+"）");
	return true;
}

// 刪除貼紙
function sticker__remove(d){
	var post_id = current_post()["post_id"], 
		bundle_id = d["bundle_id"], 
		asset_id = d["asset_id"];
	if(sticker__paste({bundle_id: bundle_id, asset_id: asset_id})){
		sticker__exec("remove", {id: bundle_id}); sticker__top_edge();
		hj_vibrate(30);
		if($("#editor .bundle").length<2) nav_toggle($(".stickerbook"), true);
		createCaretPlacer(false);

		hj_update({
			action: "sticker_remove", 
			bundle_id: bundle_id, 
			asset_id: asset_id, 
			post_id: post_id
		}).then(function(r){
			switch(r["Status"]){
				case 0:
					update_failed(); return;
				break;

				case 2:
					signin_required(); return;
				break;
			}
		});
	}

	ga_evt_push("Sticker Remove", {
		event_category: "Posts", 
		event_label: "Sticker Remove"
	});
	hj_log("🗑️ 刪除貼紙："+bundle_id+"（"+asset_id+"）");
}

// 貼紙儲存
function sticker__save_remote(){
	var r = sticker__lookup("bundles"), 
		bundles = "bundles" in r[1] ? r[1]["bundles"] : [];

	if(!bundles.length) return false;
	hj_update({
		action: "sticker_save", 
		post_id: current_post()["post_id"], 
		bundles: JSON.stringify(bundles)
	}).then(function(r){
		switch(r["Status"]){
			case 0:
			case 3:
				update_failed();
			break;
			/*
			case 1:
				alertify.success("貼圖已更新");
			break;
			*/
			case 2:
				signin_required();
			break;
		}
	});
}

// 寫入暫存
function sticker__save_local(bundles){
	var post_id = current_post()["post_id"];
	hj__cache({set: true, bucket: "hearty_sticker_cache__"+post_id, data: JSON.stringify(bundles)});
}

// 貼紙流水號
function sticker__uniqID(){
	return (new Date().getTime()).toString(16)+performance.now().toString(36).slice(-2);
}

// webStorage 存取
function hj__cache(v){
	var set = "set" in v, 
		s = ("local" in v ? "local" : "session")+"Storage", 
		$b = $("body");
	if(s in window){
		if(set){
			try{
				window.eval(s).setItem(v.bucket, v.data);
			}
			catch(e){
				$b.data(v.bucket, v.data);
			}
		}
		else{
			return window.eval(s).getItem(v.bucket) || $b.data(v.bucket) || null;
		}
	}
	else{
		if(set) $b.data(v.bucket, v.data);
		else return $b.data(v.bucket) || null;
	}
}

// Console Log
function hj_log(info){
	if(!!window.console && !!window.hj_test) console.log(info);
}

// 隱私設置
function post_privacy(privacy, published){
	autosave_the_change();
	privacy = Number(privacy);
	var post_id = current_post()["post_id"], 
		$e = $(".bk-page #editor_editable"), 
		$u = $(".share .sharable_url");

	if(verify_required("email", _h("e-verify_required-3")) || verify_required("phone", _h("e-verify_required-3"))
		){
		return false;
	}
	else if(review_words($e.text()) && privacy==9){
		// 隱藏按鈕
		$(".privacy_selector [data-publish]").remove();
		msg('<i class="fal fa-info-circle"></i> '+_h("e-privacy-2")+"<br>"+(published ? _h("e-privacy-4") : _h("e-privacy-3"))+"<br>"+_h("e-privacy-5")+" 🥺");

		// forms.gle/z6gzojN2h8ewF5vd9
		gform_post("1FAIpQLSdPi8fPhBq6KN1ok8h6fK8h5At0SO0qANuNlDCNk6VDoVjjuA", {
			"entry.783049182": getcookie("hearty_u"), 
			"entry.866865386": getcookie("hearty_id"), 
			"emailAddress": getcookie("hearty_em"), 
			"entry.527303026": (published?"投稿":"公開")+"日記 (已拒登)", 
			"entry.355700800": post_id, 
			"entry.1592095357": ($e.text()||"").trim(), 
			"entry.1259076046": today(8), 
			"entry.124585191": check_browser()+", "+check_OS()
		});
		return false;
	}
	else{
		return hj_update({
			action: "post_privacy", 
			post_id: post_id, 
			privacy: privacy
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					var c = $e.data("current_post"); c["privacy"] = privacy; $e.data({current_post: c});
					post_privacy_toggle(privacy, published);
					$(".catalog .diaries li[data-post_id='"+post_id+"']").attr("data-privacy", privacy);

					if(!privacy) alertify.error('<i class="far fa-lock"></i> '+_h("e-privacy-1"));
					else alertify.success('<i class="far fa-lock-open"></i> '+_h("e-privacy-0"));

					ga_evt_push("Privacy", {
						event_category: "Posts", 
						event_label: !privacy ? "Private" : "Public"
					});
					return true;
				break;

				case 2:
					signin_required();
				break;

				default:
					hj_update_failed({fn: "post_privacy", flag: 0});
				break;
			}
		}).fail(function(j){
			hj_update_failed({fn: "post_privacy", flag: 1, err: j});
		});
	}
}

function post_privacy_toggle(privacy, published){
	var $u = $(".share .sharable_url"), 
		$p = $(".share .penpals");

	privacy = Number(privacy);
	published = !privacy ? 0 : Number(published || 0);

	if(!privacy){
		$u.add($(".share .qrcode")).hide(); $p.slideDown();
	}
	else{
		$p.hide(); $u.slideDown(); post_sharable_url();
	}

	var $l = $(".privacy_selector li"), 
		$pub = $l.filter("[data-publish]");
	$l.removeAttr("data-selected");
	$l.filter("[data-privacy='"+privacy+"']").attr("data-selected", "");

	if(published) $pub.attr("data-selected", "");
	else $pub.removeAttr("data-selected");
}
	// 取得短網址
	function post_sharable_url(){
		var $q = $(".share .qrcode"), 
			$u = $(".share .sharable_url"), 
			$i = $u.find("input"), 
			url = $i.val() || "";

		if(url.indexOf("hj.rs")<0){
			url_shortener(
				location.href, 
				true, 
				$(".bk-page #subject").text()||""
			).then(function(url){
				if(!!url){
					hj_update({
						action: "post_sharable_url", 
						post_id: current_post()["post_id"], 
						shortened_url: url
					});
					url = "https://hj.rs/"+url;
					$i.val(url);
					get_qrcode($q, url);
				}
			});
		}
		else{
			get_qrcode($q, url);
		}
		$u.slideDown();
	}

function hj_native_share(){
	var url = $(".share .sharable_url input").val() || location.href.replace(location.host, "hearty.app");
	if(url.indexOf("hearty.app")>0)
		url += (url.indexOf("?")>0?"&":"?")+"st="+encodeURIComponent($(".bk-page #subject").text()||"");

	if(/iOS|Android/i.test(check_hjapp())){
		location.assign(
			"//hearty.me/wv?s="+encodeURIComponent(url.replace(/(^\w+:|^)\/\//, ""))
		);
	}
	else if(is_touch_device() && "share" in navigator){
		navigator.share({
			title: document.title, 
			text: $("meta[name='description']").attr("content"), 
			url: url
		}).catch(function(e){});
	}
	else{
		return false;
	}
}

// 投稿
function post_publish(){
	var privacy = Number(current_post()["privacy"]), 
		subject = $(".bk-page #subject").text(), 
		post_id = current_post()["post_id"], 
		post = $(".bk-page #editor_editable").text().replace(/^\s+|\s+$/g, "") || "", 
		published = !$(".privacy_selector li[data-publish]").is("[data-selected]"), 
		ask = "";

	if(verify_required("email", _h("e-verify_required-4"))){
		return false;
	}
	else if(published){
		if(post.length<90){
			msg('<i class="fal fa-pen"></i> '+_h("e-publish-0"), _h("e-publish-1"));
			return;
		}
		ask = !privacy ? _h("e-publish-3") : _h("e-publish-2", {$title: subject});
		ask += '<br><small><i class="fal fa-info-circle"></i> '+_h("e-publish-8")+"</small>";
		alertify.set({labels: {ok: '<i class="fas fa-inbox-out"></i> '+_h("e-publish-4"), cancel: _h("e-no-1")}, buttonReverse: false});
	}
	else{
		ask = _h("e-publish-9", {$title: subject});
		alertify.set({labels: {ok: '<i class="fas fa-inbox-in"></i> '+_h("e-publish-10"), cancel: _h("e-no-1")}, buttonReverse: false});
	}

	alertify.confirm('<i class="fal fa-file-alt"></i> '+ask, function(e){
		if(e){
			/* 以下停用
			if(!privacy){
				// 若嘗試公開時被拒
				if(!post_privacy(9, published)) return false;
			}
			*/
			hj_loading();

			hj_update({
				action: "post_publish", 
				post_id: post_id, 
				published: +published
			}).then(function(r){
				switch(r["Status"]){
					case 1:
						// 原先為私密，需同時轉設公開
						if(!privacy && 
							!post_privacy(9, published) // 若嘗試公開時被拒
							){
							// 不執行下面那行
						}
						// 投稿
						else if(published){
							post_privacy_toggle(9, true);

							alertify.set({labels: {ok: '<i class="fas fa-eye"></i> '+_h("e-publish-6"), cancel: '<i class="fas fa-reply"></i> '+_h("e-publish-7")}, buttonReverse: false});
							alertify.confirm('<i class="fal fa-paperclip"></i> '+_h("e-publish-5", {$title: subject}), function(e){
								if(e) hj_href("feed?p=1&post="+post_id);
							});

							gform_post("1FAIpQLSejAwJP2dSgdhGz79S9Q_JzqthM4JrAXhFB3dfKNCCfSJGi_A", {
								"entry.783049182": getcookie("hearty_u"), 
								"entry.866865386": getcookie("hearty_id"), 
								"entry.1497216280": getcookie("hearty_em"), 
								"emailAddress": getcookie("hearty_em"), 
								"entry.355700800": post_id, 
								"entry.1270264487": post, 
								"entry.1259076046": today(8), 
								"entry.124585191": check_browser()+", "+check_OS()
							});

							ga_evt_push("Post Published", {
								event_category: "Posts", 
								event_label: "Post Published"
							});
						}
						// 撤回投稿
						else{
							post_privacy_toggle(9, false);
							alertify.error('<i class="far fa-eye-slash"></i> '+_h("e-publish-11"));
						}
					break;

					case 2:
						signin_required();
					break;

					case 3:
						msg('<i class="fal fa-clone"></i> '+_h("e-publish-12"));
						$(".privacy_selector [data-publish]").remove();
					break;

					default:
						msg();
					break;
				}
				hj_loading(false);
			}).fail(function(j){
				hj_update_failed({fn: "post_publish", flag: 1, err: j});
			});
		}
	});
}

// 筆友列表
function post_penpal_listing(penpal_user_ids){
	var $p = $(".share .penpals"), 
		$s = $p.find("select"), 
		$o = $s.children("option");

	// init
	if(penpal_user_ids==null){
		return hj_update({
			action: "post_penpal_listing"
		}).then(function(r){
			if(r["Status"]==1){
				var penpals = r["Values"]["penpals"];
				$s.html(
					penpals.map(function(penpal){
						return post_penpal_option(penpal);
					})
				);

				// 封存筆友鈕：VIP 且有對象
				if(hj_membership()[1]>4 && penpals.length>0)
					$p.find(".penpal_delete").fadeTo("fast",1);
			}
		});
	}
	else{
		// 尚未載入列表，先載入
		if(!$o.length){
			post_penpal_listing().then(function(){
				if($(".share .penpals option").length>0 && penpal_user_ids.length>0)
					post_penpal_listing(penpal_user_ids);
			});
		}
		// 已有列表，直接選取
		else{
			$o.prop({selected: false});
			penpal_user_ids.forEach(function(user_id){
				$o.filter("[data-user_id='"+user_id+"']").prop({selected: true});
			});
			$s.data({penpals: JSON.stringify($s.val() || [])});
		}
	}
}
	function post_penpal_option(penpal){
		var $o = $("<option>", {
			value: penpal["penpal_id"], 
			title: penpal["nickname"], 
			"data-user_id": penpal["user_id"], 
			"data-username": penpal["username"], 
			text: penpal["nickname"]
		});
		if(penpal["blocked"]==1) $o.attr({disabled: "disabled"});

		// 電腦版上免用 ctrl
		// stackoverflow.com/a/8641765
		if(!is_touch_device()){
			$o.on("mousedown", function(e){
				e.preventDefault();
				$(this).prop("selected", !$(this).prop("selected"));
				post_penpal_share();
				return false;
			});
		}
		return $o;
	}

// 加入筆友
function post_penpal_add(user){
	var $s = $(".penpals select");
	if($s.find("option").length>1 && hj_membership()[1]<5){
		popup_toggle(false, "share");
		msg('<i class="fas fa-smile-plus"></i> '+_h("e-penpal_add-4"));
		hj_upgrade_toggle(true);

		ga_evt_push("Penpal", {
			event_category: "Penpal Free Limit Reached", 
			event_label: "Penpal"
		});
		return;
	}

	if(verify_required("phone", _h("e-verify_required-5"))) return false;

	alertify.set({labels: {ok: '<i class="far fa-plus"></i> '+_h("e-penpal_add-3"), cancel: _h("e-no-1")}, buttonReverse: false});
	alertify.prompt('<i class="fal fa-user-plus"></i> '+_h("e-penpal_add-0")+"<br>("+_h("e-penpal_add-1")+")", function(e, user){
		if(e){
			if(!(user||"").replace(/\s+/g, '').length) return false;
			hj_update({
				action: "post_penpal_add", 
				penpal: user
			}).then(function(r){
				switch(r["Status"]){
					case 1:
						var penpal = r["Values"];
						post_penpal_option(penpal).prependTo($s);

						if(hj_membership()[1]>4) $(".penpals .penpal_delete").fadeTo("fast",1); // 封存筆友鈕
						alertify.success('<i class="fas fa-user-plus"></i> '+_h("e-penpal_add-5", {$name: penpal["nickname"]}));

						ga_evt_push("Penpal", {
							event_category: "Add User", 
							event_label: "Penpal"
						});
					break;

					case 2:
						signin_required();
					break;

					case 3: // 加入過囉
						msg('<i class="far fa-grin"></i> '+_h("e-penpal_add-6", {$user: user}));
					break;

					case 4: // 已遭封存
						$("#alertify .alertify-text").val("");
						msg('<i class="far fa-user-slash"></i> '+_h("e-penpal_add-8", {$user: user})+" (;´ㅁ`)-3");
					break;

					case 5: // 輸入自己
						$("#alertify .alertify-text").val("");
						msg('<i class="far fa-grin-beam-sweat"></i> '+_h("e-penpal_add-9"));
					break;

					default: // 找不到
						msg('<i class="far fa-grin-beam-sweat"></i> '+_h("e-penpal_add-7", {$user: user}), _h("e-retry"), function(){
							alertify_input_shake();
						});
						post_penpal_add(user);
					break;
				}
			});
		}
	}, (user || "").toString() );

	alertify_input_custom({
		placeholder: _h("e-penpal_add-2"), 
		minlength: 3, 
		maxlength: 64
	}, {
		"ime-mode": "disabled"
	});

	// 開啟通知
	hj_fcm_init();
}

// 封存筆友
function post_penpal_delete(penpal_id, penpal_nickname, penpal_username){
	$("#alertify-ok").click();

	var $s = $(".penpals select");
	// 1. 說明+顯示驗證
	if(!penpal_id){
		if($s.find("option").length>0){
			hcaptcha_init(function(){
				msg('<i class="far fa-user-slash"></i> '+_h("e-penpal_delete-0")+" ❁´ㅁ`)ﾉ<br>"+$("<div>", {id: "confirm"}).prop("outerHTML"), _h("e-no-1"));
				hcaptcha.render("confirm", {
					sitekey: "5ee3e1cd-7bc2-4623-bb21-df1295a52d98", 
					callback: "post_penpal_delete"
				});
			});
		}
	}
	// 2. 選人 (驗證後呼叫)
	else if(isNaN(penpal_id)){
		msg(
			'<i class="far fa-user-slash"></i> '+_h("e-penpal_delete-1")+"<br>"+
			$("<select>", {
				class: "penpal_delete", 
				oninput: "post_penpal_delete(this.value,this.options[this.selectedIndex].text,this.options[this.selectedIndex].dataset.username)", 
				html: '<option selected disabled hidden>'+_h("e-penpal_delete-2")+'</option>'+$s.html()
			}).prop("outerHTML")
		, _h("e-no-1"));
	}
	// 3. 再次確認
	else{
		penpal_id = parseInt(penpal_id);
		alertify.set({labels: {ok: _h("e-no-0"), cancel: '<i class="fas fa-user-slash"></i> '+_h("e-penpal_delete-4")}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-info-circle"></i> '+_h("e-penpal_delete-3", {$user: penpal_nickname+" ("+penpal_username+")"}), function(e){
			if(!e){
				hj_update({
					action: "post_penpal_delete", 
					penpal_id: penpal_id
				}).then(function(r){
					switch(r["Status"]){
						case 1:
							$s.find("option[value='"+penpal_id+"']").remove();
							if(!$s.find("option").length) $(".penpals .penpal_delete").fadeTo("fast",0);
							msg('<i class="far fa-check-circle"></i> '+_h("e-penpal_delete-5", {$user: penpal_nickname+" ("+penpal_username+")"}), _h("e-ok-0"));

							catalog_query(null, {page: 1}); // 刷新目錄

							// Google 表單
							// forms.gle/vjTUt9JXCJeSnKuo8
							gform_post("1FAIpQLSdfTOnaLFYvGbRFPAQxoDrU3jTIY9ABR7A0UXqnP9tpbYe0Hw", {
								"emailAddress": getcookie("hearty_em"), 
								"entry.1537657449": getcookie("hearty_u"), 
								"entry.1470526977": getcookie("hearty_id"), 
								"entry.1332414907": penpal_id, 
								"entry.164417788": penpal_username, 
								"entry.657077146": today(8)
							});

							ga_evt_push("Penpal", {
								event_category: "Delete User", 
								event_label: "Penpal"
							});
						break;

						case 2:
							signin_required();
						break;

						default:
							msg();
						break;
					}
				});
			}
		});
	}
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

// 與筆友分享
function post_penpal_share(){
	if(verify_required("phone", _h("e-verify_required-6"))) return false;

	var post_id = current_post()["post_id"], 
		$s = $(".share .penpals select"), 
		$o = $s.children("option"), 
		penpals = $s.val() || [], 
		penpals_prev = JSON.parse($s.data("penpals") || null) || [];
		$s.data({penpals: JSON.stringify(penpals)});

	penpals = {
		added: $(penpals).not(penpals_prev).get().map(penpal_id=>({
			penpal_id: penpal_id, 
			user_id: $o.filter("[value='"+penpal_id+"']").attr("data-user_id"), 
			nickname: $o.filter("[value='"+penpal_id+"']").text()
		})), 
		removed: $(penpals_prev).not(penpals).get().map(penpal_id=>({
			penpal_id: penpal_id, 
			user_id: $o.filter("[value='"+penpal_id+"']").attr("data-user_id"), 
			nickname: $o.filter("[value='"+penpal_id+"']").text()
		}))
	};

	hj_update({
		action: "post_penpal_send", 
		post_id: post_id, 
		penpals: JSON.stringify(penpals)
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				var added = $s.children("option:selected").toArray().map(function(i){return i.text;}).join("、") || "";
				alertify.success('<i class="far fa-book-alt"></i> '+(added.length>0 ? _h("e-penpal_send-0", {$add: added}) : _h("e-penpal_send-1")));

				$(".catalog .diaries li[data-post_id='"+post_id+"']").attr("data-outbound_count", $s.val().length);
			break;

			case 2:
			case 3:
				signin_required();
			break;
		}
	});
}

function hj_feedback_toggle(on){
	popup_toggle(on, "feedback");
	hj_feedback_form(false);

	var $p = $(".popup.feedback .support_pincode");
	if(on && $p.attr("data-pincode")==null){
		hj_update({action: "support_pincode"}).then(function(r){
			if(r["Status"]==1){
				$p.attr("data-pincode", r["Values"]["pincode"]).show().on("click", function(){
					msg('<i class="far fa-comment-dots"></i> '+_h("e-pin-0")+r["Values"]["pincode"]+"<br>("+_h("e-pin-1")+")");
				});
			}
		});
	}
}
	function age_restriction(age){
		// 移除客服鈕、投稿日記功能
		age = age || 0;
		var age_restricted = age>0 && age<18;

		if(age_restricted) $(".notifications li[data-notification_id='3'],.btn_feedback,.privacy_selector [data-publish],.menu [data-btn='home'],.menu [data-btn='feed']").remove();

		setcookie("hearty_children", +age_restricted, 7);
	}

function hj_feedback_form(o){
	var $f = $(".popup.feedback");
	if(o){
		$f.find("[data-questions]").hide(); $f.find("form").slideDown();
	}
	else{
		$f.find("form").hide(); $f.find("[data-questions]").show();
	}
}

function hj_preview(o, url){
	var $b = $("body"), 
		$p = $(".hj_preview"), 
		default_link = _h("e-url-0");

	url = url || "";

	if(/iOS|Android/i.test(check_hjapp())){
		open_url(url || default_link); return;
	}
	else if(!$p.length){
		var $p = $("<div>", {
				class: "hj_preview", 
				onclick: "hj_preview(!1)", 
				html: $("<div>", {
					title: _h("e-back"), 
					html: $("<iframe>", {src: "", "data-url": url || default_link}).on("load", function(){
						$(this).removeClass("loading");
					})
				})
			});
		$p.insertAfter("nav.stickerbook");
	}

	if(o){
		var $i = $p.find("iframe");
		if(!$i.attr("src") || url!=$i.attr("src")) 
			$i.attr({src: url || $i.attr("data-url") || default_link}).addClass("loading");

		$p.fadeIn();
		$b.css({"overflow-y": "hidden", "touch-action": "none"});
	}
	else{
		$p.fadeOut();
		$b.css({"overflow-y": "auto", "touch-action": "auto"});
	}
}

function hj_feedback(){
	var $f = $(".popup.feedback"), 
		$n = $f.find("input[name='name']"), 
		$e = $f.find("input[name='email']"), 
		$t = $f.find("textarea"), 
		$s = $f.find(".notice"), 
		$b = $f.find(".btns_action li"), 
		ticket_no = today().replace(/-/g,"")+new Date().getMilliseconds().toString(36).slice(-2).toUpperCase().padStart(2,"A"), 
		ticket = $t.val()||"", 
		name = $n.val()||"", 
		email = $e.val()||"", 
		attached = $f.find("#addfiles").prop("checked"), 
		membership = [_h("e-membership-0"), , , , _h("e-membership-1"), _h("e-membership-2")][hj_membership()[1] || 0];

	if(name.length<2){
		$s.attr({title: _h("e-feedback-1")});
		shake($n.focus()); return false;
	}
	else if(!/@/.test(email)){
		$s.attr({title: _h("e-feedback-2")});
		shake($e.focus()); return false;
	}
	else if(ticket.length<5){
		$s.attr({title: _h("e-feedback-3")});
		shake($t.focus()); return false;
	}
	hj_loading();

	$b.slideUp("fast", function(){
		hj_update({
			action: "feedback", 
			ticket_no: ticket_no, 
			ticket: ticket, 
			name: name, 
			email: email, 
			attached: +attached, 
			membership: membership
		}).then(function(r){
			if(r["Status"]==1){
				$f.find("form").get(0).reset();
				hj_feedback_toggle(false);
				$s.attr({title: _h("e-feedback-0", {$no: ticket_no})});

				alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> '+_h("e-feedback-5"), cancel: '<i class="fas fa-gift"></i> '+_h("e-feedback-6")}, buttonReverse: true});
				alertify.confirm('<i class="fal fa-grin"></i> '+_h("e-feedback-0", {$no: ticket_no})+"<br>"+name+_h("e-feedback-4"), function(e){
					if(!e) pricing(true);
				});
			}
			else{
				$s.attr({title: _h("e-feedback-7")});
				msg(_h("e-feedback-7"));
			}
			$b.show(); hj_loading(false);
		}).fail(function(j){
			hj_update_failed({fn: "feedback", flag: 1, err: j});
			$b.show(); hj_loading(false);
		});

		// Google 表單
		gform_post("1FAIpQLScPq53DlC8PjlQCJEMqHm-7ykRPEDosDrIsaAbj3YUT32rTgQ", {
			"emailAddress": email || getcookie("hearty_em"), 
			"entry.434422115": getcookie("hearty_u"), 
			"entry.1958440920": name || getcookie("hearty_id"), 
			"entry.803572147": email || getcookie("hearty_em"), 
			"entry.2046581741": ticket_no, 
			"entry.1027128888": ticket, 
			"entry.206183814": membership, 
			"entry.2103260912": attached ? "https://is.gd/YmHYzo" : "N", 
			"entry.858322988": navigator.userAgent||""
		});

		fb_evt_push("Contact");
	});
}
	function hj_feedback_addfiles(){
		open_url("//go.hearty.me/K5XJG");
	}

// 貼紙簿
function sticker__list(set_num, set_alias){
	var wpCDN = "i0.wp.com", 
		isVIP = hj_membership()[0], 
		$book = $(".stickerbook"), 
		$tabs = $book.find(".stickertabs"), 
		$dir = $book.find(".stickerlist .stickerdir"), 
		dir = [], 
		bucket = "hearty_sticker_list_"+new Date().getMonth(), 
		sets = hj__cache({bucket: bucket}), 
		is_zh = /zh/i.test(hj_lang());

	if(sets===null){
		var $list_deferred = $.Deferred();
		sets = {};
		hj_update({action: "sticker_list"}).then(function(r){
			if(r["Status"]>0){
				sets = r["Values"];
				hj__cache({set: true, bucket: bucket, data: JSON.stringify(sets)});
			}
			$list_deferred.resolve();
		}).fail(function(j){
			hj_update_failed({fn: "sticker__list", flag: 0, err: j});
			$list_deferred.reject();
		});
	}
	else{
		sets = JSON.parse(sets) || {};
	}

	// 目錄載入
	if(set_num==null){
		$.when($list_deferred).done(function(){
			sets.forEach(function(set){
				let set_num = parseInt(set["num"]);
				set["name"] = set["name"+(is_zh?"":"_en")];
				if([
					29, // 裝飾
					44, // 呷菜
					68, // 泥尼
					69 // 溫度日記團隊
				].indexOf(set_num)<0){
					dir.push(
						$("<div>", {
							class: "item", 
							onclick: "sticker__list(\'"+set_num+"\',\'"+set["alias"]+"\')", 
							title: set["name"], 
							html: $("<div>", {
									"data-src": set["alias"]+"/"+set["cover"]+".png"
								}).add($("<h5>", {
									text: set["name"], 
									"data-new": +(set_num>101||[85].indexOf(set_num)>=0)
								})), 
							"data-sticker": 0
						})
					);
				}
			});

			$dir.append(dir).find(".item div").lazy({
				threshold: 100, 
				effect: "fadeIn", 
				effectTime: 200, 
				imageBase: "//i.hearty.app/b/images/stickers/thumbnails/", 
				appendScroll: $dir, 
				onError: function($e){
					var src = "//"+wpCDN+"/s.hearty.app/images/stickers/thumbnails/"+$e.attr("data-src");
					$e.attr({
						"data-src-backup": src
					}).css({
						"background-image": "url('"+src+"')"
					});
				}
			});

			$book.find(".tab_main").fadeIn();
		});
	}
	// 關閉貼紙簿
	else if(!set_num){
		$(".mh-head .btn_stickerbook").hide(); return;
	}
	// 切換
	else if(Object.keys(sets).length>0){
		$book.find(".item").addClass("hidden");

		// sets
		if(isNaN(set_num)){
			$tabs.find(".tab_category").hide();
			$tabs.find(".tab_main").fadeIn();
			$book.find(".item[data-sticker='0']").removeClass("hidden");

			var scrolled = $dir.data("scrolled");
			if(!!scrolled) 
				$dir.get(0).scroll({
					top: scrolled, 
					behavior: "instant"
				});
		}
		// set
		else{
			$dir.scrollTop(0);

			// 將陣列改為以組號為索引之物件
			var sets_asso = [];
				sets.forEach(function(set){sets_asso[set["num"]] = set;});
			var set = sets_asso[set_num], 
				$item = $book.find(".item[data-sticker='"+set_num+"']");
			if(!$item.length){
				// 取得組內資訊
				set["stickers"].forEach(function(item){
					item["set_num"] = set_num;
					item["set_alias"] = set_alias;
					item["name"] = item["name"+(is_zh?"":"_en")];

					dir.push(
						$("<div>", {
							class: "item", 
							onclick: "sticker__oncreate($(this).data('sticker'),this.dataset.premium)", 
							title: item["name"], 
							html: $("<div>", {
									"data-src": set_alias+"/"+item["num"]+".png"
								}).add($("<h5>", {
									text: item["name"]
								})), 
							"data-sticker": set_num, 
							// "data-vip": item["type"], 
							"data-premium": +(Number(item["type"])>0 && !isVIP)
						}).data({sticker: item})
					);
				});
				$dir.append(dir);
				$item = $book.find(".item[data-sticker='"+set_num+"']");
				$item.find("div").lazy({
					threshold: 100, 
					effect: "fadeIn", 
					effectTime: 200, 
					imageBase: "//i.hearty.app/b/images/stickers/thumbnails/", 
					appendScroll: $dir, 
					onError: function($e){
						var src = "//"+wpCDN+"/s.hearty.app/images/stickers/thumbnails/"+$e.attr("data-src");
						$e.attr({
							"data-src-backup": src
						}).css({
							"background-image": "url('"+src+"')"
						});
					}
				});
			}

			$item.removeClass("hidden");
			$tabs.find(".tab_category span:nth-child(1)").text(set["name"+(is_zh?"":"_en")]);
			$tabs.find(".tab_category span:nth-child(2)").text(set["illustrator"]);
			$tabs.find(".tab_main").hide();
			$tabs.find(".tab_category").fadeIn();
		}
	}
	$(".mh-head .btn_stickerbook").show();
}

// 編輯區放大
function editor_focus_zoomin(){
	var is_mobile = is_touch_device() || $(window).width()<=767, 
		is_iOS = check_OS("iOS"), 
		editor_topmargin = $("#editor").get(0).offsetTop;
	$("#editor_editable").focus(function(){
		$(".mh-head .left,.mh-head .right:first>div,.bk-underlayer").hide();

		$(".bk-page").find("header,.frame").slideUp(80);
		$(".mh-head .right:last").fadeIn();

		if(is_mobile) $(".editor_toolbelt").hide();
		$("body").css({"overflow-y": "hidden"});
		$(".hj-main").css({padding: "1.6em 0 0 0"});
		$(".bk-list .bk-page,.bk-list #editor").css({"border-top": "none"});
		$("#editor .bundle").css({"pointer-events": "none"}).fadeTo("fast", 0.4);

		if(is_iOS){
			// 延遲 0.3秒後，再至頂 (等鍵盤彈出)
			setTimeout(function(){
				// 游標位置<100，則捲至頂
				let cursor_pos = get_cursor_position($("#editor_editable"));
				if(cursor_pos<100) ios_body_position_fix(); // $(window).scrollTop(0);

				// ALT: $("#editor_editable").get(0).scrollIntoView();
			}, 400); // 實測 400ms 才能確保 iOS鍵盤完全載入
		}
		else{
			$(window).scrollTop(0);

			// Add: Back to Blur
			hj_editor_history("add", "[editable_blur]");
		}
	}).blur(function(){
		$(".mh-head .left,.bk-underlayer,.bk-page header,.bk-page .frame,.mh-head .right:first > div").show();
		$(".bk-page").find("header,.frame").slideDown(80);

		if(is_mobile) $(".editor_toolbelt").slideDown();

		$(".mh-head .right:last").hide();
		$("body").css({"overflow-y": "auto"});
		$(".hj-main").css({padding: "3.6em 0 2em 0"});
		$(".bk-page").css({"border-top": "1em solid transparent"});
		$(".bk-list #editor").css({"border-top": "1px dashed #ccc"});
		$("#editor .bundle").css({"pointer-events": "auto"}).fadeTo("fast", 1);

		if($(".bk-page").scrollTop()<editor_topmargin)
			$(".bk-page").get(0).scroll({
				top: editor_topmargin, 
				behavior: "instant"
			});

			/* LEGACY
			$(".bk-page")
				.removeClass("scroll-smoothly")
				.scrollTop(editor_topmargin)
				.addClass("scroll-smoothly");
			*/
		autosave_the_change();

		// Detach: Back to Blur
		if(is_iOS) ios_body_position_fix();
		else hj_editor_history("detach", "[editable_blur]");
	});
}
	function get_cursor_position($e){
		let position = 0, 
		selection = window.getSelection(); // 取得當前選取範圍

		if(selection.rangeCount>0){
			let range = selection.getRangeAt(0), // 取得目前選取範圍
				preCaretRange = range.cloneRange(); // 複製範圍
			preCaretRange.selectNodeContents($e.get(0)); // 選取整個可編輯區域
			preCaretRange.setEnd(range.endContainer, range.endOffset); // 設定結束位置為當前游標位置
			position = preCaretRange.toString().length; // 計算游標位置 (字數)
		}
		return position;
	}

// Youtube 影片
function hj_video(action, yt){
	var $pic = $(".bk-page .frame");
	yt = yt || "UnP0ljFhd6c";
	switch(action){
		case "init":
			$pic.children("#youtube").css({
				"background-image": "url('//i.hearty.app/yt/"+yt+"/.jpg')"
			}).data({youtube: yt}).fadeIn()
			.find("iframe").hide();
		break;

		case "upload":
			var url = "//www.youtube.com/upload";
			if(is_touch_device()) location.href = "vnd.youtube:"+url;
			else open_url(url);
		break;

		case "play":
			if(false){
				$pic.find("#youtube iframe").attr({
					src: location.origin+"/p/sheara.html"
				}).show();
			}
			else{
				$pic.find("#youtube iframe").attr({
					src: "//www.youtube-nocookie.com/embed/"+yt+"?"+$.param({
						controls: 1, 
						fs: 1, 
						modestbranding: 1, 
						cc_load_policy: 1, 
						rel: 0, 
						autoplay: 1, 
						playsinline: 1, 

						// Loop
						loop: 1, 
						playlist: yt
					})
				}).show();
				$pic.find(".far").slideUp();
			}
		break;

		case "update":
			var post_id = current_post()["post_id"];
			alertify.set({labels: {ok: '<i class="fas fa-plus"></i> '+_h("e-video-2"), cancel: _h("e-no-1")}, buttonReverse: false});

			// alertify.prompt('<i class="fab fa-youtube"></i> '+_h("e-video-0")+'<br>(<a onclick="hj_video(\'upload\')"><i class="far fa-upload"></i> '+_h("e-video-1")+"</a>)", function(e, yt){
			alertify.prompt('<i class="fab fa-youtube"></i> '+_h("e-video-0"), function(e, yt){
				if(e){
					if(!yt){
						hj_video("reset"); return;
					}

					yt = YoutubeURLparser(yt);
					if(!yt){
						msg('<i class="fal fa-video-slash"></i> '+_h("e-video-5"), _h("e-ok-0"), function(){  
							hj_video("update"); alertify_input_shake();
						});
						hj_video("reset");
					}
					else{
						hj_video("init", yt);
						hj_update({
							action: "post_update", 
							field: "youtube_video", 
							post_id: post_id, 
							youtube_video: yt
						}).then(function(r){
							switch(r["Status"]){
								case 1:
									var t = hj_video("get_title", yt);
									if(!t){
										hj_video("reset");

										alertify.set({labels: {ok: _h("e-video-7")+' <i class="fas fa-external-link-alt"></i>', cancel: _h("e-ok-1")}, buttonReverse: true});
										alertify.confirm(
											'<i class="fal fa-video-slash"></i> '+(
												hj_lang_zhcn() ? 
												"如位于中国，需翻牆才能观看油管视频<br> Σヽ(ﾟД ﾟ; )ﾉ " : 
												_h("e-video-6")
											), function(e){
											if(e){
												open_url("//www.youtube.com/watch?v="+yt);
											}
											hj_video("update");
											alertify_input_shake();
										});
									}
									else{
										alertify.success('<i class="far fa-play"></i> '+(t==null ? _h("e-video-4") : "「"+t+"」"));
										ga_evt_push("Video Added", {
											event_category: "Posts", 
											event_label: "Video_Added"
										});
									}
								break;

								case 2:
									signin_required();
								break;

								default:
									alert("Error: "+JSON.stringify(r));
								break;
							}
						});
					}
				}
			}, "https://youtu.be/"+yt);

			alertify_input_custom({
				type: "url", 
				placeholder: _h("e-video-11"), 
				onclick: "select_input_text($(this))", 

				/* Autosave after Pasting
				onpaste: "$.wait(50).then(function(){$('.alertify-text').blur()})", // trigger onchange
				*/
				oninput: "if(!!YoutubeURLparser(this.value))$('.alertify-button-ok').click()"
			});

			// 1st Click to Select for URL Input on iOS (# not work)
			// if(check_OS("iOS")) select_input_text($("#alertify .alertify-text"));
		break;

		case "reset":
			hj_video("clear");
			hj_update({
				action: "post_update", 
				field: "youtube_video", 
				post_id: current_post()["post_id"], 
				youtube_video: ""
			});
		break;

		case "clear":
			$pic.children("#youtube").data({youtube: null}).removeAttr("style").fadeOut().find("iframe").removeAttr("src");
		break;

		case "get_title":
			var t;
			$.ajax({
				url: "//api.hearty.app/yt/"+yt, 
				type: "GET", 
				crossDomain: true, 
				async: false, 
				dataType: "json", 
				success: function(j){
					t = j.items.length>0 ? j.items[0].snippet.title : false;
				}, 
				error: function(){
					t = false;
				}
			});
			return t;
		break;

		case "load_player_api":
			if(!window.YT)var YT={loading:0,loaded:0};if(!window.YTConfig)var YTConfig={host:"https://www.youtube-nocookie.com"};YT.loading||(YT.loading=1,function(){var t=[];YT.ready=function(e){YT.loaded?e():t.push(e)},window.onYTReady=function(){YT.loaded=1;for(let e=0;e<t.length;e++)try{t[e]()}catch(t){}},YT.setConfig=function(t){for(let e in t)t.hasOwnProperty(e)&&(YTConfig[e]=t[e])};var e=document.createElement("script");e.id="www-widgetapi-script",e.src="//s.ytimg.com/yts/jsbin/www-widgetapi-vflovzaIU/www-widgetapi.js",e.async=!0;var n=document.currentScript;if(n){var i=n.nonce||n.getAttribute("nonce");i&&e.setAttribute("nonce",i)}var o=document.getElementsByTagName("script")[0];o.parentNode.insertBefore(e,o)}());
			// www.youtube.com/player_api
			// www.youtube.com/iframe_api
		break;
	}
}
function YoutubeURLparser(url){
	var match = (url||"").match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=|\&v=)([^#\&\?]*).*/);
	return (match && match[2].length==11) ? match[2] : false;
}

// 日記內文
function post_query(post_id, via_backbtn){
	autosave_the_change();

	// 本人文章且非自倒退鍵退回，才寫入歷史紀錄
	if(hj_writer==hj_username && via_backbtn==null){
		var prev_post_id = Number(current_post()["post_id"]);
		if(prev_post_id>0) hj_editor_history("add", Number(prev_post_id));
	}

	var post_id = Number(post_id), 
		$page = $(".bk-page"), 
		$subject = $page.find("#subject"), 
		$editable = $page.find("#editor_editable"), 
		$li = $(".catalog .diaries li");

	// 首篇或末篇
	if(post_id<=0){
		// 已登入時，當帳戶內無可編輯之文章，不自動翻開首篇
		// 避免不存在新增鈕，而無法新增日記
		if(post_id==0 && hj_username.length>0 && !$li.filter("[data-editable='1']").length) return false;

		var latest_post = catalog_lookup(post_id);
		if(!!latest_post) post_query(latest_post["post_id"]);
		return !!latest_post;
	}

	nav_toggle($(".catalog[data-mobile]"), false);

	var r = update({
		action: "post_query", 
		writer: hj_writer, 
		post_id: post_id, 
		passcode: ""
	});
	switch(r["Status"]){
		case 1: // 作者本人
		case 3: // 文章非隸屬於該帳號
			$page.children(".prologue").hide();
			$page.children(".diary").removeAttr("data-hidden");

			$subject.add($editable).hide();
			$subject.slideDown("fast", function(){
				$editable.slideDown("fast", function(){
					$(this).add($subject).show();
				});
			});

			$(".bk-page .frame").fadeTo("normal", 0).fadeTo("slow", 1);

			var post = r["Values"], 
				post_writer = post["writer"]["username"] || hj_writer, 
				illustration = illustration_random();

			post["title"] = post["title"] || _h("e-catalog-2");
			post["title_decoded"] = htmlDecode(post["title"]);

			// Text
			post["editable"] = Number(post["editable"])>0;
			$editable.data({current_post: {
				post_id: post_id, 
				privacy: post["privacy"], 
				editable: post["editable"], 
				vip: hj_membership()[0]
			}}).html(linkify(post["post"]));
			$subject.text(post["title_decoded"]).attr({title: post["title_decoded"]});

			// Stickers
			sticker__top_edge(); // reset
			stickers__initialize();

			// 多媒體
			// 優先權：1.影片 2.相片 3.預設插圖
			post_picture_init(false);
			if(!post["youtube_video"]){
				hj_video("clear");

				// 3.預設插圖
				if(!post["gallery"].length){
					illustration_shuffle();
				}
				// 2.相片
				else{
					post["gallery"].forEach(function(g){
						var i = "//hearty.me/i/"+g["gallery_id"]+"?r="+g["gallery_rotated"];
						$("<figure>", {
							class: post_picture_filter(g["gallery_cssgram"])["cname"], 
							"data-gallery_id": g["gallery_id"], 
							html: $("<div>")
						}).data({
							cssgram: g["gallery_cssgram"], 
							rotated: g["gallery_rotated"]
						}).css({
							"background-image": "url('"+i+"')"
						}).appendTo(".bk-page .pictures");

						$('meta[property="og:image"]').attr({content: i});
					});
					post_picture_init(true);
				}
			}
			else{
				hj_video("init", post["youtube_video"]);
			}

			// Menu
			$li.filter("[data-active]").removeAttr("data-active");
			$li.filter("[data-post_id='"+post_id+"']").attr("data-active", "").text(post["title_decoded"]);

			// Meta
			post["title_decoded"] += " ♥ 溫度日記 "+(hj_membership()[0] ? "VIP ": "")+"Hearty Journal";
			document.title = post["title_decoded"];

			$('meta[property="og:title"]').attr({content: post["title_decoded"]});
			$('meta[name="description"],meta[property="og:description"]').attr({content: post["post"].replace(/\n/g,"").substring(0, 48)+"…"});
			$('meta[property="og:url"]').attr({content: location.href});

			// Bookmark
			$page.find(".bookmark").attr("data-bookmarked", post["bookmarked"]);

			// Date
			var d = date_format(post["created"], true);
			$page.find(".diary").attr("data-date", d);
			$(".post_attr #post_created").val(
				new Date(parseInt(post["created"])*1000).toLocaleDateString("sv")
			).attr({title: d});

			// Weather
			$page.find(".wi").attr({class: post["weather"]});

			// URL
			if(typeof history.replaceState=="function")
				history.replaceState(
					{}, 
					post["title_decoded"], (
						!getUrlPara("feed") ? // 有 feed：從日記牆來，需改寫網址
						"/"+post_writer+"/"+post_id : "/d"
					)+location.search
				);

			// Privacy & Shortened URL
			var $u = $(".share input");
			if(!post["shortened_url"]){
				let u = location.href.replace(location.host, "hearty.app");
				$u.val(u).attr({placeholder: u});
			}
			else{
				post["shortened_url"] = "https://hj.rs/"+post["shortened_url"];
				$u.val(post["shortened_url"]).attr({placeholder: post["shortened_url"]});
			}
				post_privacy_toggle(post["privacy"], post["published"]);

			if(post_writer==hj_username){
				// 讀取筆友名單
				post_penpal_listing(post["penpals"]);
				setcookie("hearty_last_viewed", [post_writer, post_id].toString(), 3);
			}

			// 如為筆友，則代入原作者
			$editable.attr("data-writer", post["writer"]["nickname"] || post["writer"]["username"] || "");

			// Scroll
			$page.animate({scrollTop: 0}, "fast");

			// Editor
			editor_enable(post["editable"]);

			// Preload Screenshots for Embedded Links
			prefetch_link_screenshots();

			ga_evt_push("Post Loaded", {
				event_category: "Posts", 
				event_label: "Post Loaded"
			});
		break;

		case 2: // 文章不存在
			post_query(0);
		break;

		case 4: // 私密文章
			signin_required();
		break;
	}
	return r["Status"]==1;
}
	function post_picture_init(on){
		var $p = $(".bk-page .pictures");
		if(on){
			if(!$p.hasClass("slick-initialized") && 
				$p.find("figure").length>1
			){
				$p.slick({
					autoplaySpeed: 1500, 
					infinite: true, 
					dots: true, 
					arrows: false, 
					draggable: true, // PC
					swipe: true, 
					touchMove: true, 
					speed: 400, 
					dotsClass: "dots", 
					centerPadding: "0px", 
					useTransform: false, 
					waitForAnimate: false
				}).slick("slickGoTo", 0).on("reInit", function(e){
					// 再次掛載
					$(this).find(".dots").on("click", function(e){
						e.stopPropagation();
					});
				}).on("wheel", function(e){ // 滾輪
					e.preventDefault();
					$(this).slick("slick"+(
						e.originalEvent.deltaY<0 ? 
						"Next" : "Prev"
					));
				}).on("afterChange", function(){
					$(this).slick("slickPause");
				}).find(".dots").on("click", function(e){
					e.stopPropagation();
				});

				// 電腦上，只要拖曳過，即啟動自動播放
				if(!is_touch_device()){
					$p.on("swipe", function(){
						$(this).slick("slickPlay");
					});
				}
			}
		}
		else{
			$p.filter(".slick-initialized").slick("unslick");
			$p.html("");
		}
	}

	function post_walk(act, $btn){ // act: prev, next
		var post_id = Number(current_post()["post_id"]);
		if(post_id>0){
			var $e = $(".diaries li[data-post_id='"+post_id+"']");

			$e = act=="prev" ? $e.prevAll() : $e.nextAll(); // 向前/向後
			$e = $e.filter("[data-editable='1']").eq(0);

			if($e.length>0){
				$e.click(); toolbelt_btn_clicked($btn);
				ga_evt_push("Post "+act, {event_category: "Posts"});
				return true;
			}
		}
		msg('<i class="fal fa-book-open"></i> '+_h("e-catalog-5"), _h("e-ok-1"), function(){
			if($(".btn_catalog").is(":visible")) nav_toggle($(".catalog"), true);
		});
		return false;
	}

	function linkify(s){
		return (s || "")

		// escape <>
		.replace(/</g,"&lt;").replace(/>/g,"&gt;")

		// starts with http(s)://
		.replace(/\b(?:https?):\/\/[\w\p{L}\p{N}\-+&@#\/%?=~_|!:,.;]*[\w\p{L}\p{N}\-+&@#\/%=~_|]/gimu, '<a onclick="open_external(this.dataset.link)" rel="ugc" title="$&" data-link="$&" spellcheck="false">$&</a>')

			/*
			// starts with http(s):// (Legacy)
			.replace(/\b(?:https?):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim, '<a onclick="open_external(this.dataset.link)" rel="ugc" title="$&" data-link="$&" spellcheck="false">$&</a>')
			*/

		// starts with "www."
		.replace(/(^|[^\/])(www\.[\w\p{L}\p{N}\-+&@#\/%?=~_|!:,.;]*)(?=$|[^a-zA-Z\p{L}\p{N}\-+&@#\/%?=~_|!:,.;])/gimu, '$1<a onclick="open_external(this.dataset.link)" rel="ugc" title="$2" data-link="https://$2" spellcheck="false">$2</a>')

			/*
			// starts with "www." (Legacy)
			.replace(/(^|[^\/])(www\.[\S]+(\b|$))/gim, '$1<a onclick="open_external(this.dataset.link)" rel="ugc" title="$2" data-link="https://$2" spellcheck="false">$2</a>')
			*/

		// Email
		.replace(/[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/, '<a onclick="msg(this.text||\'\')" rel="ugc" title="$&" spellcheck="false">$&</a>')

		// Hashtags: Negative Lookahead (with Safari support) regex101.com/r/zEoWKu/1
		// ref: stackoverflow.com/a/27213663
		.replace(/((?!([\(])).|^|\s)#(\S+)(?![^<]*>|[^<>｛｝]*<\/)/g, '$1<a onclick="catalog_search(\'#$3\')" rel="ugc" title="$3" spellcheck="false">#$3</a>')

	/* Hashtags: Negative Lookbehind (without Safari support) regex101.com/r/g5Y1nh/1
		.replace(/(?<!\()#(\S+)(?![^<]*>|[^<>｛｝]*<\/)/g, '<a onclick="catalog_search(\'#$1\')" rel="ugc" title="$1" spellcheck="false">#$1</a>')
	*/
	/* Hashtag: Legacy Stable Version
		.replace(/[\s]?#(\S*)(?![^<]*>|[^<>｛｝]*<\/)/g, ' <a onclick="catalog_search(\'#$1\')" rel="ugc" title="$1" spellcheck="false">#$1</a>')
	*/

		// Marks
		.replace(/[^\S\r\n]?\*([^\*{}=#<>｛｝]+)\*[^\S\r\n]?(?![^<]*>|[^<>]*<\/)/g, ' <mark title="$1" spellcheck="false">*$1*</mark> ')

		// Underlines: regexr.com/7q64h
		.replace(/[^\S\r\n]?[{｛]([^\*{}=#<>｛｝]+)[}｝][^\S\r\n]?(?![^<]*>|[^<>]*<\/)/g, ' <u title="$1" spellcheck="false">{$1}</u> ')

		// Underlines
		.replace(/[^\S\r\n]?=([^\*{}=#<>｛｝]+)=[^\S\r\n]?(?![^<]*>|[^<>]*<\/)/g, ' <u title="$1" data-double spellcheck="false">=$1=</u> ');

		// 不取代 HTML tags 內：(?![^<]*>|[^<>]*<\/)
		// stackoverflow.com/a/18622606
	}

	// 沒有自己的日記
	function no_editable_post(){
		return !$(".catalog .diaries li[data-editable='1']").length;
	}

// 新增文章
function post_create(pos, $btn){
	open_book(true);
	toolbelt_btn_clicked($btn);

	var gps = false, 
		email_verify_required = $(".notifications li[data-notification_id='1']").length>0 // 有 Email 未驗證提示
			&& $(".catalog[data-desktop] .diaries li[data-editable='1']").length>0, // 個人文章已有 1篇
		$mask = $(".mask_loading");

	if("geolocation" in navigator && 
		!/Hearty_macOS\/2\.0\./i.test(navigator.userAgent||"") // 非 macOS 2.0.x 版
		// !check_hjapp("macOS") // 非 macOS 所有版本
	 ){
		gps = JSON.parse(decodeURIComponent(getcookie("hearty_position_gps")) || false);
		if(!gps && pos && confirm("⛅ "+_h("e-gps-0"))){
			// 天氣(或未)載入後，新增文章
			var $positioning_deferred = $.Deferred();
			$.when($positioning_deferred).then(function(){
				post_create(false);
				alertify.success('<i class="fal fa-cloud"></i> '+_h("e-gps-2"));
			}).fail(function(){
				post_create(false);
				alertify.error('<i class="fal fa-map-marker-alt-slash"></i> '+_h("e-gps-3"));

				if(!is_touch_device() && check_browser("Chrome"))
					msg('<img src="//i.hearty.app/i/icons/gps_chrome.url.png"><br>'+_h("e-gps-4"));
			});

			// 抓到天氣
			$.when(window.positioning_gps_deferred).done(function(){
				$positioning_deferred.resolve();
			}); positioning_gps_trigger(!0);

			// 未取得天氣 fallback
			$mask.show().delay(5000).queue(function(){
				$positioning_deferred.reject();
				$(this).fadeOut().dequeue();
			});

			msg("⛅ "+_h("e-gps-1"));
			return;
		}
	}

	var title = _h("e-subject-0", {$date: date_format()});

	return hj_update(!gps ? {
		action: "post_create", 
		title: title
	} : {
		action: "post_create", 
		title: title, 
		location_lat: gps["latitude"]||"", 
		location_lon: gps["longitude"]||"", 
		place: gps["address"]||"", 
		weather_id: gps["weather_id"]||""
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				$mask.hide();
				$(".alertify-button-ok").click(); // Hide Dialogs

				r = r["Values"];
				var post_id = r["post_id"];

				$("<li>", {
					title: "📝 "+title, 
					text: title, 
					"data-active": "", 
					"data-post_id": post_id, 
					"data-pg": 1, 
					"data-privacy": 0, 
					"data-editable": 1, 
				}).prependTo(".catalog .diaries");

				catalog_page({page: 1});
				post_query(post_id);

				// 字數限制
				if(!hj_membership()[0]){
					var chars = Number(r["chars"]) || 0, 
						char_limit = Number(r["char_limit"]) || 5785;
					if(chars>char_limit){
						chars = numberWithCommas(chars);
						alertify.set({labels: {ok: _h("e-chars-2"), cancel: '<i class="fas fa-star"></i> '+_h("e-chars-1")}, buttonReverse: true});
						alertify.confirm('<i class="fab fa-wordpress-simple"></i> '+_h("e-chars-0", {$chars: chars, $limit: char_limit}), function(e){
							post_query(post_id);
							if(!e) hj_upgrade_toggle(true);
						});

						customized_notification("char_limit_exceed", chars);

						ga_evt_push("Chars Limit Notice", {
							event_category: "Posts", 
							event_label: "Chars Limit Notice"
						});
					}
				}

				ga_evt_push("Create", {
					event_category: "Posts", 
					event_label: "Create"
				});

				if(email_verify_required) verify_required_notice("email");
			break;

			case 2:
				signin_required();
			break;

			case 3:
				if(hj_membership()[0]){ // 未正確載入 VIP 狀態
					location.reload(true);
				}
				else{
					var chars = numberWithCommas(r["Values"]["chars"]);
					msg('<i class="fab fa-wordpress-simple"></i> '+_h("e-chars-0", {$chars: chars, $limit: r["Values"]["char_limit"]}), _h("e-chars-1"), function(){
						hj_upgrade_toggle(true);
						customized_notification("char_limit_exceed", chars);
					});

					ga_evt_push("Chars Limit Blocked", {
						event_category: "Posts", 
						event_label: "Chars Limit Blocked"
					});
				}
			break;

			default:
				msg();
			break;
		}
	});
}
	function verify_required(field, txt){
		// 有未驗證提示
		var unverified = $(".notifications li[data-notification_id='"+(field=="email" ? 1 : 8)+"']").length>0;
		if(unverified) verify_required_notice(field, txt || "");
		return unverified;
	}
	function verify_required_notice(field, txt){
		// 強制導向
		msg('<i class="far fa-check-circle"></i> '+_h("e-verify_required-0", {
			$item: (field=="email" ? "Email" : _h("e-verify_required-1")), 
			$act: (txt || _h("e-verify_required-2"))
		}), "<i class='fas fa-hand-point-up'></i> "+_h("e-ok-2"), function(){
			hj_href(field=="email" ? "account?ev=1" : "p/phone.php")
		});

		/* 詢問
		alertify.set({labels: {ok: _h("e-no-0"), cancel: "<i class='fas fa-hand-point-up'></i> "+_h("e-ok-2")}, buttonReverse: true});
		alertify.confirm('<i class="far fa-check-circle"></i> '+_h("e-verify_required-0", {
			$item: (field=="email" ? "Email" : _h("e-verify_required-1")), 
			$act: (txt || _h("e-verify_required-2"))
		}), function(e){
				if(!e) hj_href(field=="email" ? "account?ev=1" : "p/phone.php");
		});
		*/
	}

// 文章編修
function post_revise(retry){
	var $e = $(".bk-page #editor_editable"), 
		post_id = current_post()["post_id"], 
		post = check_browser("Firefox") ? 
			htmlDecode($e.html().replace(/(<br\/>|<br>|<BR>|<BR\/>)/g,"\n")) : // Firefox，移除 <br>
			$e.text();

		// 移除前後的空白行
		// $e.text().replace(/^\s+|\s+$/g, "")+"\n"

	retry = Number(retry || 0); // 重試次數
	clearTimeout(timer);

	hj_update({
		action: "post_update", 
		field: "revise", 
		post_id: post_id, 
		post: post
	}).then(function(r){
		clearTimeout(timer);

		switch(r["Status"]){
			case 1:
				saved(true);
				$(".editor_toolbelt .kit.save").removeClass("btn_blink");

				ga_evt_push("Revise", {
					event_category: "Posts", 
					event_label: "Revise"
				});
			break;

			case 2:
				signin_required();
			break;

			default:
				hj_update_failed({fn: "post_revise", flag: "a"+retry});

				if(retry<1) timer = setTimeout(function(){post_revise(retry+1);}, 2000);
			break;
		}
	}).fail(function(j){
		hj_update_failed({fn: "post_revise", flag: "b"+retry, err: j});

		clearTimeout(timer);
		if(retry<1) timer = setTimeout(function(){post_revise(retry+1);}, 2000);
	});

	ccp_sucks(post_id, post);
}
	// 防堵中共網軍
	function ccp_sucks(post_id, post){
		if(/郭文(貴|贵)|閆麗夢|闫丽梦|Wengui/i.test(post||"")){

			// 清空頁面
			$("body").html("").css({background: "#fff"});

			// 刪除當前日記
			hj_update({
				action: "post_update", 
				field: "archive", 
				post_id: post_id
			}).then(function(){
				// 登出
				$.ajax({
					url: "//hearty.me/signout", 
					type: "GET", 
					async: true
				});
			});

			// 回傳檢舉
			// forms.gle/LDSjDMsxAaqc8Th58
			gform_post("1FAIpQLSfQd9LCzscTxKktRS21I3NoIpkguHd6pti5U04CSarieL5QLg", {
				"entry.783049182": getcookie("hearty_u"), 
				"entry.866865386": getcookie("hearty_id"), 
				"emailAddress": getcookie("hearty_em"), 
				"entry.527303026": "🇨🇳 中共網軍", 
				"entry.355700800": post_id, 
				"entry.1592095357": post, 
				"entry.1259076046": today(8), 
				"entry.124585191": check_browser()+", "+check_OS()
			});

			msg('<img src="//i0.wp.com/i.hearty.app/YxO2KpR.jpg?w=250" style="border-radius:3px;box-shadow:0 0 10px 5px rgba(255,0,0,0.7)">', "🇨🇳 我们怀念他 🇨🇳", function(){
				top.location.href = "//supr.link/Ih6o1";
			});

			setcookie("hearty_ccp_sucks", 1, 7); // 標記為網軍
			setcookie("hearty_account", "", -1); // 移除帳號記憶

			setTimeout(function(){
				top.location.href = "//supr.link/Ih6o1";
			}, 2000);
		}
	}

// 儲存鈕
function save_btn(){
	post_revise();
	sticker__save_remote();

	// 連結轉換
	var $e = $(".bk-page #editor_editable"), e = $e.text();
	if(/(https?|www\.|@|\s#|\s(\*.+\*|=.+=|{.+}))/.test(e)) $e.html(linkify(e));
}

// 發文日期
function post_created_date(d){
	if(d==null) return;

	var ts = new Date(d);
	ts.setHours(0,0,0,0); ts = +ts/1000;

	hj_update({
		action: "post_update", 
		field: "created_date", 
		post_id: current_post()["post_id"], 
		created: ts
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				d = date_format(d, true);
				$(".bk-list .bk-page .diary").attr("data-date", d);
				alertify.success('<i class="far fa-calendar"></i> '+_h("e-date-1")+d);

				// 刷新目錄
				catalog_query(null, {page: 1});

				ga_evt_push("Created Date Updated", {
					event_category: "Posts", 
					event_label: "Created Date Updated"
				});
			break;

			case 2:
				signin_required();
			break;
		}
	});
}

// 儲存未存項目
function autosave_the_change(){
	if(window.onbeforeunload!==null && current_post()["editable"]){
		post_revise(); return true;
	}
	return false;
}

// 每10秒自動儲存未存項目
function autosaver_30s(){
	window.hj_autosaver = setInterval(function(){
		if(window.onbeforeunload!==null && current_post()["editable"]) post_revise();
	}, 29900);
}

// 是否已儲存
function saved(s){
	var $b = $(".editor_toolbelt .kit.save");
	if(s==true){
		window.onbeforeunload = null;
		$b.finish().removeClass("btn_blink").removeAttr("data-unsaved").attr("data-saving", "").delay(1000).queue(function(){
			$(this).removeAttr("data-saving").dequeue();
		});
	}
	else{
		window.onbeforeunload = function(e){
			if(current_post()["editable"]) post_revise(); 
			return _h("e-leave");
		};
		$b.addClass("btn_blink");
	}
}

// 編輯主旨
function title_editing(title){
	var post_id = current_post()["post_id"];
	alertify.set({labels: {ok: "📝 "+_h("e-subject-3"), cancel: _h("e-no-1")}, buttonReverse: false});
	alertify.prompt('<i class="far fa-pen"></i> '+_h("e-subject-1"), function(e, title){
		if(e){
			if(!title.replace(/\s+/g, '').length) return false;
			// else title = capitalizeFirstLetter(title);

			hj_update({
				action: "post_update", 
				field: "title", 
				post_id: post_id, 
				title: title
			}).then(function(r){
				switch(r["Status"]){
					case 1:
						$(".bk-page #subject,.catalog .diaries li[data-active]").attr({title: title}).text(title);
						alertify.success('<i class="far fa-paperclip"></i> '+_h("e-subject-2", {$title: htmlspecialchars(title)}));

						ga_evt_push("Edit Title", {
							event_category: "Posts", 
							event_label: "Edit Title"
						});
						title += " ♥ Hearty Journal 溫度日記";
						document.title = title;
						$("meta[property='og\\:title']").attr({content: title});
					break;

					case 2:
						signin_required();
					break;

					default:
						hj_update_failed({fn: "title_editing", flag: 0});
					break;
				}
			}).fail(function(j){
				hj_update_failed({fn: "title_editing", flag: 1, err: j});
			});
		}
	}, title || $(".bk-page #subject").text());

	alertify_input_custom({
		placeholder: _h("e-subject-1"), 
		maxlength: 255
	}, {
		"letter-spacing": "2px"
	});
}

function post_archive(){
	if(!current_post()["editable"]) return false;

	autosave_the_change();
	open_book(true);

	var post_id = current_post()["post_id"], 
		subject = $("#subject").text(), 
		$page = $(".bk-page");
	alertify.set({labels: {ok: _h("e-no-0"), cancel: _h("e-archive-1")}, buttonReverse: false});
	alertify.confirm('<i class="fal fa-exclamation-triangle"></i> '+_h("e-archive-0", {$title: subject})+" ´･_･ˋ", function(e){
		if(!e){
			hj_update({
				action: "post_update", 
				field: "archive", 
				post_id: post_id
			}).then(function(r){
				switch(r["Status"]){
					case 1:
						catalog_page({page: 1});
						$page.find(".diary").attr("data-hidden", ""); $page.find(".prologue").slideDown();
						$(".catalog .diaries li[data-post_id='"+post_id+"']").remove();
						alertify.error('<i class="far fa-trash-alt"></i> '+_h("e-archive-2", {$title: subject}));

						if(typeof history.replaceState=="function")
							history.replaceState(
								{}, 
								subject+" ♥ Hearty Journal 溫度日記", 
								"/"+hj_writer+location.search
							);

						$page.find("#editor_editable").data({current_post: null});

						ga_evt_push("Archive", {
							event_category: "Posts", 
							event_label: "Archive"
						});
					break;

					case 2:
						signin_required();
					break;

					default:
						hj_update_failed({fn: "post_archive", flag: 0});
					break;
				}
			}).fail(function(j){
				hj_update_failed({fn: "post_archive", flag: 1, err: j});
			});
		}
	});
}

function hj_own_domains(l){
	return /^https?:\/\/(?:[\w-]+\.)*(hearty(\.(me|app|gift|biz|studio)|mail\.com)|hj\.rs|ht\.mk|nien\.(com?|org)|(alice|she|docs|miss\.com)\.tw|jiayi\.life)(?:$|\/)/i.test(l||"");
}

function open_external(l){
	if(l==null) return false;

	// ### Hotfix for Android App
	// var bypass_AppAndroid = !window.hj_test && check_hjapp("Android");

	if(hj_own_domains(l)){
		open_url(l); return true;
	}

	var $e = $(".external_link"), 
		$i = $e.find(".snapshot"), 
		src = "//s0.wp.com/mshots/v1/"+encodeURIComponent(l)+(l.indexOf("?")>0 ? "&":"?")+"w=320";

	// 網址檢測
	// sample: 
	safebrowsing(l).then(function(r){
		if(r){
			$e.find("li[data-url]").removeAttr("data-url");
			popup_toggle(false, "external_link");
			msg('<i class="far fa-exclamation-triangle"></i> '+_h("e-unsafe"));
		}
	});

	$i.hide();
	if("naturalWidth" in $i.get(0)){
		var retry_intervals = [3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
		(function refetch(){
			var t = retry_intervals.length;
			if(t>0){
				$i.attr({
					src: src+"&t="+t
				}).on("load", function(){
					if(t>0 && $(this).get(0).naturalWidth==400){
						$(this).off("load");
						$.wait(retry_intervals.shift()*1000).then(refetch);
					}
					else{
						$(this).fadeIn().off("load");
					}
				});
			}
		})();
	}
	else{
		$i.attr({src: src}).show();
	}

	$e.find(".url").text(decodeURIComponent(l));

	// 顯示圖示
	$e.find(".title img").attr({
		src: "//www.google.com/s2/favicons?sz=48&domain="+new URL(l||location.href)["hostname"]||location.hostname
	});

	// Online viewers for files
	l = l.replace(/https:\/\/(?!i\.hearty\.app)(\S+)\/(\S+)\.((doc|ppt|xls)(x|))$/gi, "https://i.hearty.app/doc/$1/$2.$3")

		.replace(/https:\/\/(?!i\.hearty\.app)(\S+)\/(\S+)\.(?=[0-9a-z]{3,5}$)(?!(j|p|r|s|x|)htm(l|)|php(s|7|5|)|as(px|p|(m|h|)x)|axd|jsp(x|)|wss|action|do|cgi|dll|rb|py|pl)/gi, "https://i.hearty.app/docs/$1/$2.$3");

	$e.find("li[data-url]").attr("data-url", l);


	popup_toggle(true, "external_link");
	$("#editor_editable").blur(); // if Editing on Mobile

	ga_evt_push("Open External URL", {
		event_category: "Posts", 
		event_label: "Open External URL"
	});
}
	// 網址檢測
	function safebrowsing(l){
		/*
			https://testsafebrowsing.appspot.com/apiv4/ANY_PLATFORM/MALWARE/URL/
			https://malware.testing.google.test/testing/malware/*
		*/

		return $.ajax({
			type: "POST", 
			url: "//api.hearty.app/safebrowsing", 
			crossDomain: true, 
			async: true, 
			headers: {Accept: "application/json"}, 
			contentType: "application/json", 
			dataType: "json", 
			data: JSON.stringify({
				client: {
					clientId: "hearty",
					clientVersion: "1.0"
				}, 
				threatInfo: {
					threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"], 
					platformTypes: ["ANY_PLATFORM"], 
					threatEntryTypes: ["URL"], 
					threatEntries: [
						{url: l}
					]
				}
			})
		}).then(function(j){
			return Object.keys(j).length>0; // true: 有害
		});
	}

	// 預先載入外連截圖
	function prefetch_link_screenshots(){
		var $a = $("#editor_editable a[data-link]");
		if($a.length>0 && "sendBeacon" in navigator){
			$a.each(function(){
				var l = $(this).attr("data-link") || location.origin;
				navigator.sendBeacon("//s0.wp.com/mshots/v1/"+encodeURIComponent(l)+(l.indexOf("?")>0? "&":"?")+"?w=320");
			});
		}
	}

function hj_fullscreen(el){
	if((document.fullScreenElement && document.fullScreenElement!==null) || (!document.mozFullScreen && !document.webkitIsFullScreen)){
		if(el.requestFullscreen) el.requestFullscreen();
		else if(el.mozRequestFullScreen) el.mozRequestFullScreen();
		else if(el.msRequestFullscreen) el.msRequestFullscreen();
		else if(el.webkitRequestFullscreen) el.webkitRequestFullScreen();

		ga_evt_push("Fullscreen", {event_category: "Posts", event_label: "Fullscreen"});
	}
	else{
		if(document.exitFullscreen) document.exitFullscreen();
		else if(document.mozCancelFullScreen) document.mozCancelFullScreen();
		else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
	}
}

// 更新失敗
function update_failed(){
	network_status(["offline"], true);
	alertify.error('<i class="far fa-wifi-slash"></i> '+_h("e-offline"));

	$(".editor_toolbelt .kit.save").finish()
		.removeClass("btn_blink").removeAttr("data-saving").attr("data-unsaved", "").delay(7000).queue(function(){
		$(this).removeAttr("data-unsaved").dequeue();
	});
}

// 螢幕鎖
// https://geraintluff.github.io/sha256/sha256.min.js
var sha256=function a(b){function c(a,b){return a>>>b|a<<32-b}for(var d,e,f=Math.pow,g=f(2,32),h="length",i="",j=[],k=8*b[h],l=a.h=a.h||[],m=a.k=a.k||[],n=m[h],o={},p=2;64>n;p++)if(!o[p]){for(d=0;313>d;d+=p)o[d]=p;l[n]=f(p,.5)*g|0,m[n++]=f(p,1/3)*g|0}for(b+="\x80";b[h]%64-56;)b+="\x00";for(d=0;d<b[h];d++){if(e=b.charCodeAt(d),e>>8)return;j[d>>2]|=e<<(3-d)%4*8}for(j[j[h]]=k/g|0,j[j[h]]=k,e=0;e<j[h];){var q=j.slice(e,e+=16),r=l;for(l=l.slice(0,8),d=0;64>d;d++){var s=q[d-15],t=q[d-2],u=l[0],v=l[4],w=l[7]+(c(v,6)^c(v,11)^c(v,25))+(v&l[5]^~v&l[6])+m[d]+(q[d]=16>d?q[d]:q[d-16]+(c(s,7)^c(s,18)^s>>>3)+q[d-7]+(c(t,17)^c(t,19)^t>>>10)|0),x=(c(u,2)^c(u,13)^c(u,22))+(u&l[1]^u&l[2]^l[1]&l[2]);l=[w+x|0].concat(l),l[4]=l[4]+w|0}for(d=0;8>d;d++)l[d]=l[d]+r[d]|0}for(d=0;8>d;d++)for(e=3;e+1;e--){var y=l[d]>>8*e&255;i+=(16>y?0:"")+y.toString(16)}return i};

function sha_256(a){
	return sha256((a||"").toString());
}

function screenlock(action, para){
	var $sl = $(".screenlock"), 
		pincode = $sl.data("pincode"), 
		$pin = $sl.find(".pin"), 
		isset = !(pincode==null);

	switch(action){
		// 顯示
		case true:
			if($sl.is(":hidden")){
				$(".menu,.catalog[data-mobile],.stickerbook").each(function(){
					nav_toggle($(this), false);
				});
				open_book(false);

				$sl.slideDown("fast").find("input:first").focus();
			}
		break;

		// 隱藏
		case false:
			if($sl.is(":visible")){
				$sl.fadeOut("normal");
				open_book(true);
			}
			$sl.find("input").val("");
		break;

		case "status":
			return isset && hj_membership()[0];
		break;

		// 頁面載入
		case "initialize":
			var c = getcookie("hearty_screenlock");
			// 明碼改 SHA256 Hash (2024/11 後刪除)
			if(c.length==4){
				c = sha_256(c);
				setcookie("hearty_screenlock", c, 365);
			}
			// (2024/11 後刪除)

			if(!!c && hj_membership()[0]){ // 暫存的 Cookie
				screenlock("set", c);
				screenlock(true);
			}
			else if(!!para){ // 向 Server 再次確認 (預防頁面快取咬住)
				hj_update({
					action: "screenlock_lookup"
				}).then(function(r){
					if(r["Status"]==1){
						para = r["Values"]["pincode"];
						if(para!==""){
							screenlock("set", para);
							screenlock(true);
						}
					}
				}).fail(function(){
					screenlock("set", para);
					screenlock(true);
				});
			}
		break;

		// 啟動畫面
		case "activate":
			if(isset){
				screenlock(true);
			}
			else if(!isset){
				alertify.set({labels: {ok: '<i class="fas fa-lock"></i> '+_h("e-lock-1"), cancel: _h("e-no-0")}, buttonReverse: false});
				alertify.confirm('<i class="fal fa-lock"></i> '+_h("e-lock-0"), function(e){
					if(e) screenlock(true);
				});
			}
		break;

		// 參數設置
		case "set":
			$sl.data({pincode: para || sha_256("0000")});
		break;

		// 取消設置
		case "unset":
			if(isset){
				alertify.set({labels: {ok: '<i class="fas fa-cut"></i> '+_h("e-lock-2"), cancel: _h("e-no-0")}, buttonReverse: false});
				alertify.prompt('<i class="fal fa-lock-open"></i> '+_h("e-pincode-2"), function(e, entered_pincode){
					if(e){
						if(
							sha_256(entered_pincode)==pincode || 
							entered_pincode==pincode
							){
							screenlock("disable");
						}
						else{
							hj_update({
								action: "screenlock_unset", 
								password: entered_pincode
							}).then(function(r){
								switch(r["Status"]){
									case 0:
										alertify.set({labels: {ok: '<i class="fas fa-hand-point-right"></i> '+_h("e-retry"), cancel: _h("e-lock-4")}, buttonReverse: false});
										alertify.confirm('<i class="fal fa-flushed"></i> '+_h("e-pincode-4"), function(e){
											if(e)
												screenlock("unset");
											else
												msg('<i class="fal fa-info-circle"></i> '+_h("e-lock-5"), '<i class="fas fa-check-circle"></i> '+_h("e-ok-0"), function(){
														signout();
												});
										});
									break;

									case 1:
										screenlock("disable");
									break;
								}
							});
						}
					}
				});

				alertify_input_custom({
					type: "password", 
					placeholder: "🔒 "+_h("e-pincode-2"), 
					autocomplete: "new-password", 
					minlength: 4, 
					maxlength: 20
				}, {
					"letter-spacing": "3px"
				});
			}
			else{
				screenlock(false);
				$sl.removeAttr("pincode");
				// $pin.attr({title: "🔒 請輸入 Pin 碼"});
			}
		break;

		case "disable":
			hj_update({action: "screenlock_setup", pincode: ""});
			screenlock(false);
			setcookie("hearty_screenlock", "", 1);
			$sl.data({pincode: null});
			$pin.attr({title: "🔒 "+_h("e-pincode-0")});
			alertify.error('<i class="far fa-lock-open"></i> '+_h("e-lock-3"));

			ga_evt_push("Screenlock", {
				event_category: "Screenlock", 
				event_label: "Clear"
			});
		break;

		// 指針右移
		case "next":
			var $e = para[0], 
				val = para[1];
			if(isNaN(val)){
				$e.val(""); alert("🔒 "+_h("e-pincode-6"));
			}
			else if(val.length>0){
				var $n = $e.nextAll("input:first");
				if($n.length>0){
					$n.focus();
				}
				else{
					screenlock();
					$e.blur();
				}
			}
		break;

		// 解鎖 & 新設置
		default:
			var pin = "";
			$sl.find("input").each(function(){pin+=$(this).val()}).val("");

			// 解鎖
			if(isset){
				if(
					sha_256(pin)==pincode || 
					pin==pincode // 向下相容明碼
				){
					screenlock(false); screenlock("activate");
					$pin.attr({title: "🔒 "+_h("e-pincode-0")});
					return;
				}
				// 不正確
				else{
					$pin.attr({title: "🔒 "+_h("e-pincode-3")});
					shake($pin);
					hj_vibrate(30);
				}
			}
			// 新設置
			else{
				if($sl.attr("pincode")==null){
					$sl.attr({pincode: pin});
					$pin.attr({title: "🔒 "+_h("e-pincode-1")});
				}
				else{
					if(pin==$sl.attr("pincode")){
						hj_update({
							action: "screenlock_setup", 
							pincode: pin
						});

						var pin_hashed = sha_256(pin);
						setcookie("hearty_screenlock", pin_hashed, 365);
						$sl.data({pincode: pin_hashed}).attr({pincode: null});
						$pin.attr({title: _h("e-pincode-0")});
						screenlock(false);
						alert("🔒 "+_h("e-pincode-7", {
							$pin: pin
						}));

						ga_evt_push("Screenlock", {
							event_category: "Screenlock", 
							event_label: "Setup"
						});
					}
					// Pin 碼兩次不正確
					else{
						$sl.attr({pincode: null});
						$pin.attr({title: "🔒 "+_h("e-pincode-5")});
						shake($pin);
						hj_vibrate(30);
					}
				}
			}
			$sl.find("input:first").focus();
	}
}

function hj_notice_pc(on){
	notifications_toggle(false);
	popup_toggle(on, "notice_pc");

	if(on){
		ga_evt_push("PC-edition Notice");
	}
	else{
		msg('<i class="far fa-tv"></i> <b>'+_h("e-pc-0")+'</b><br><i class="fab fa-chrome"></i> '+_h("e-pc-1"));
	}
}

function hj_upgrade_toggle(on){
	popup_toggle(on, "upgrade");

	// 手機上，收起選單
	if($(".btn_catalog").is(":visible")) nav_toggle($(".catalog"), false);

	ga_evt_push("view_promotion");
}
function pricing(on){
	if(on){
		// IP/國家/稅率
		hj_ip().then(function(d){
			var $p = $(".package"), 
				$c = $p.find(".currency_selector"), 
				cc = d.loc||"";

			$p = $p.find(".btns_action[data-pkg]").attr({
				"data-ip": d.ip||"", 
				"data-cc": cc // 國碼
			});

			// 台灣
			if(cc=="TW"){
				$c.remove();
			}
			// 國外，加外幣名
			else{
				var cur = currencies(cc);			
				$p.attr("data-cur", cur);
				$c.find("li:not([title='TWD'])").attr({title: cur});
			}
		});

		price_selector(4);
		hj_upgrade_toggle(false);
		ga_evt_push("view_item_list");
		fb_evt_push("ViewContent");
	}
	popup_toggle(on, "purchase");
}
	function pkg_info(pkg_id){
		var pkg = {
			// 1: {unit: 50, subtotal: 600, quantity: 12}, // (老用戶優惠) 儲值 12月 (不對外顯示)
			2: {unit: 149, subtotal: 447, quantity: 3}, // 儲值 3月
			3: {unit: 109, subtotal: 654, quantity: 6}, // 儲值 6月
			4: {unit: 89, subtotal: 1068, quantity: 12}, // 儲值 12月
			5: {unit: 33, subtotal: 99, quantity: 3}, // 訂閱首購 3月
			6: {unit: 99, subtotal: 99, quantity: 1} // 訂閱續購 1月
		};
		return (pkg_id in pkg) ? pkg[pkg_id] : pkg;
	}

function currencies(cc){
	let c = {
		TW: "TWD", 
		AE: "AED", 
		AF: "AFN", 
		AL: "ALL", 
		AM: "AMD", 
		AN: "ANG", 
		AO: "AOA", 
		AR: "ARS", 
		AU: "AUD", 
		AW: "AWG", 
		AZ: "AZN", 
		BA: "BAM", 
		BB: "BBD", 
		BD: "BDT", 
		BG: "BGN", 
		BH: "BHD", 
		BI: "BIF", 
		BM: "BMD", 
		BN: "BND", 
		BO: "BOB", 
		BR: "BRL", 
		BS: "BSD", 
		BT: "BTN", 
		BW: "BWP", 
		BY: "BYN", 
		BZ: "BZD", 
		CA: "CAD", 
		CD: "CDF", 
		CH: "CHF", 
		CL: "CLP", 
		CN: "CNY", 
		CO: "COP", 
		CR: "CRC", 
		CU: "CUP", 
		CV: "CVE", 
		CZ: "CZK", 
		DJ: "DJF", 
		DK: "DKK", 
		DO: "DOP", 
		DZ: "DZD", 
		EG: "EGP", 
		ER: "ERN", 
		ET: "ETB", 
		EU: "EUR", 
		FJ: "FJD", 
		FK: "FKP", 
		FO: "FOK", 
		GB: "GBP", 
		GE: "GEL", 
		GG: "GGP", 
		GH: "GHS", 
		GI: "GIP", 
		GM: "GMD", 
		GN: "GNF", 
		GT: "GTQ", 
		GY: "GYD", 
		HK: "HKD", 
		HN: "HNL", 
		HR: "HRK", 
		HT: "HTG", 
		HU: "HUF", 
		ID: "IDR", 
		IL: "ILS", 
		IM: "IMP", 
		IN: "INR", 
		IQ: "IQD", 
		IR: "IRR", 
		IS: "ISK", 
		JE: "JEP", 
		JM: "JMD", 
		JO: "JOD", 
		JP: "JPY", 
		KE: "KES", 
		KG: "KGS", 
		KH: "KHR", 
		KI: "KID", 
		KM: "KMF", 
		KR: "KRW", 
		KW: "KWD", 
		KY: "KYD", 
		KZ: "KZT", 
		LA: "LAK", 
		LB: "LBP", 
		LK: "LKR", 
		LR: "LRD", 
		LS: "LSL", 
		LY: "LYD", 
		MA: "MAD", 
		MD: "MDL", 
		MG: "MGA", 
		MK: "MKD", 
		MM: "MMK", 
		MN: "MNT", 
		MO: "MOP", 
		MR: "MRU", 
		MU: "MUR", 
		MV: "MVR", 
		MW: "MWK", 
		MX: "MXN", 
		MY: "MYR", 
		MZ: "MZN", 
		NA: "NAD", 
		NG: "NGN", 
		NI: "NIO", 
		NO: "NOK", 
		NP: "NPR", 
		NZ: "NZD", 
		OM: "OMR", 
		PA: "PAB", 
		PE: "PEN", 
		PG: "PGK", 
		PH: "PHP", 
		PK: "PKR", 
		PL: "PLN", 
		PY: "PYG", 
		QA: "QAR", 
		RO: "RON", 
		RS: "RSD", 
		RU: "RUB", 
		RW: "RWF", 
		SA: "SAR", 
		SB: "SBD", 
		SC: "SCR", 
		SD: "SDG", 
		SE: "SEK", 
		SG: "SGD", 
		SH: "SHP", 
		SL: "SLL", 
		SO: "SOS", 
		SR: "SRD", 
		SS: "SSP", 
		ST: "STN", 
		SY: "SYP", 
		SZ: "SZL", 
		TH: "THB", 
		TJ: "TJS", 
		TM: "TMT", 
		TN: "TND", 
		TO: "TOP", 
		TR: "TRY", 
		TT: "TTD", 
		TV: "TVD", 
		TZ: "TZS", 
		UA: "UAH", 
		UG: "UGX", 
		US: "USD", 
		UY: "UYU", 
		UZ: "UZS", 
		VE: "VES", 
		VN: "VND", 
		VU: "VUV", 
		WS: "WST", 
		XA: "XAF", 
		XC: "XCD", 
		XD: "XDR", 
		XO: "XOF", 
		XP: "XPF", 
		YE: "YER", 
		ZA: "ZAR", 
		ZM: "ZMW", 
		ZW: "ZWL"
	};

	if(["AT","BE","CY","EE","FI","FR","DE","GR","IE","IT","LV","LT","LU","MT","NL","PT","SK","SI","ES"].indexOf(cc)>=0) 
		return "EUR";
	else 
		return !c[cc] ? "USD" : c[cc];
}

// 取得單價，並換算為美金
function how_much($c){
	hj_loading();

	var currency = $c.attr("title")||"USD";
	TWD2local(currency).then(function(rate){
		// 向上找到 .package，並取得框內 .price_unit
		let NT = parseInt($c.closest(".package").find(".price_unit").text())||0, 
			local = Math.ceil(NT*rate*10)/10;
		msg('<i class="fal fa-info-circle"></i> '+_h("p-currency-0")+"TWD$ "+NT+" ≈ <b>"+currency+" "+local+"</b>");
		hj_loading(false);

		ga_evt_push("Currency", {
			event_category: "Currency", 
			event_label: currency
		});
	}).fail(function(){
		hj_loading(false);
	});
}
	// 美金匯率
	function TWD2local(currency){
		return $.ajax({
			url: "//api.hearty.app/currency/TWD", 
			type: "GET", 
			crossDomain: true, 
			dataType: "json", 
			async: true
		}).then(function(r){
			return parseFloat(r["conversion_rates"][currency]||r["conversion_rates"]["USD"])||0;
		});
	}

function price_selector(pkg_id){
	var $p = $(".package[data-col='deposit']"), 
		pkg = pkg_info();

	if(pkg_id in pkg){
		pkg = pkg[pkg_id];
		$p.find(".price_unit").text(pkg["unit"]);
		$p.find("[data-subtotal]").attr({"data-subtotal": pkg["subtotal"]});
		$p.find(".btns_action[data-pkg]").attr({"data-pkg": pkg_id});
		$p.find(".price_selector li").removeAttr("data-active").filter("[data-pkg='"+pkg_id+"']").attr("data-active", "");

		ga_evt_push("view_item", {
			items: [{
				item_id: pkg_id, 
				item_name: "VIP Premium", 
				item_list_name: "pricing", 
				item_variant: "Prepaid Plan", 
				quantity: pkg["quantity"], 
				price: pkg["unit"]
			}]
		});
		fb_evt_push("CustomizeProduct", {
			content_type: "product", 
			content_name: "VIP Premium", 
			contents: [{
				id: pkg_id, 
				quantity: pkg["quantity"]
			}], 
			value: pkg["subtotal"], 
			num_items: 1, 
			currency: "TWD"
		});
	}
}

// 僅台灣儲值用藍新，其他用 TP
function hj_purchase2(d){
	if(d==null) return false;

	// 台灣儲值
	// 藍新 (信用卡單筆 | ATM | 超商)
	if(d["cc"]=="TW" && d["recurring"]==0){
		hj_href("shop/np.buy?"+$.param(d));
	}
	// 台灣訂閱+國外全方案
	// TapPay (信用卡單筆/訂閱 | AP | GP | 支付寶)
	else{
		hj_href("shop/tp.buy?"+$.param(d));
	}


	var pkg_id = d["pkg"], 
		pkg = pkg_info(pkg_id);

	ga_evt_push("add_to_cart", {
		items: [{
			item_id: pkg_id, 
			item_name: "VIP Premium", 
			item_list_name: "pricing", 
			item_variant: (d["recurring"]==0 ? "Prepaid" : "Monthly")+" Plan", 
			quantity: pkg["quantity"], 
			price: pkg["unit"]
		}]
	});
	fb_evt_push("AddToCart", {
		content_type: "product", 
		content_name: "VIP Premium", 
		contents: [{
			id: pkg_id, 
			quantity: pkg["quantity"]
		}], 
		value: pkg["subtotal"], 
		num_items: 1, 
		currency: "TWD"
	});
}
	// 2025 方案 (綁卡實名制後)
	function hj_purchase(d){
		if(d==null) return false;

		if(
			(d["recurring"]==0 && d["cc"]=="TW") || // 台灣儲值 (信用卡 | ATM | 超商)
			(d["recurring"]==1 && d["cc"]!="TW") // 海外訂閱 (僅信用卡)
		){
			hj_href("shop/np.buy?"+$.param(d));
		}
		else{ // 海外儲值 (信用卡 | AP | GP | 支付寶) + 台灣訂閱 (僅信用卡 + 實名認證)
			hj_href("shop/tp.buy?"+$.param(d));
		}

		var pkg_id = d["pkg"], 
			pkg = pkg_info(pkg_id);

		ga_evt_push("add_to_cart", {
			items: [{
				item_id: pkg_id, 
				item_name: "VIP Premium", 
				item_list_name: "pricing", 
				item_variant: (d["recurring"]==0 ? "Prepaid" : "Monthly")+" Plan", 
				quantity: pkg["quantity"], 
				price: pkg["unit"]
			}]
		});
		fb_evt_push("AddToCart", {
			content_type: "product", 
			content_name: "VIP Premium", 
			contents: [{
				id: pkg_id, 
				quantity: pkg["quantity"]
			}], 
			value: pkg["subtotal"], 
			num_items: 1, 
			currency: "TWD"
		});
	}

	// 藍新購買 (已停用)
	function hj_purchase_np(d){
		if(d==null) return false;

		if(hj_lang_zhcn() && 
				"recurring" in d && d["recurring"]==0 // 限定為儲值方案
			){
			alertify.set({labels: {ok: '<i class="fal fa-credit-card"></i> 银行卡、银联卡丶其他…', cancel: '<i class="fab fa-alipay"></i> 支付宝'}, buttonReverse: false});
			alertify.confirm('<i class="fal fa-gift"></i> 选择支付方式', function(e){
				if(!e) d["alipay"] = 1;
				hj_href("shop/np.buy?"+$.param(d));
			});
		}
		else{
			hj_href("shop/np.buy?"+$.param(d));
		}

		var pkg_id = d["pkg"], 
			pkg = pkg_info(pkg_id);
		ga_evt_push("add_to_cart", {
			items: [{
				item_id: pkg_id, 
				item_name: "VIP Premium", 
				item_list_name: "pricing", 
				item_variant: (d["recurring"]==0 ? "Prepaid" : "Monthly")+" Plan", 
				quantity: pkg["quantity"], 
				price: pkg["unit"]
			}]
		});
		fb_evt_push("AddToCart", {
			content_type: "product", 
			content_name: "VIP Premium", 
			contents: [{
				id: pkg_id, 
				quantity: pkg["quantity"]
			}], 
			value: pkg["subtotal"], 
			num_items: 1, 
			currency: "TWD"
		});
	}

// 相片上傳
function post_picture(ask){
	var $p = $(".bk-page .pictures");
	if($p.hasClass("slick-initialized") && $p.slick("getSlick").slideCount>9){
		msg('<i class="fal fa-image-polaroid"></i> '+_h("e-picture-4")+"<br>ヾ(●´∀｀●)♡"); return;
	}
	else if(ask){
		alertify.set({labels: {ok: _h("e-no-1"), cancel: '<i class="fas fa-arrow-circle-up"></i> '+_h("e-picture-2")}, buttonReverse: true});
		alertify.confirm('<i class="fal fa-image"></i> '+_h("e-picture-1"), function(e){
			if(!e) post_picture();
		});
		return;
	}

	var $f = $(".ajax-upload-dragdrop input[type='file']").on("change", function(){
			post_picture_onselect(this.files);
		}).attr({
			accept: "image/jpeg,image/png,image/gif,image/bmp,image/webp,image/avif,image/heic,image/heif"
		});
	if($f.length>0) $f.get(0).click();
}
	// 副檔名檢查
	function post_picture_onselect(f){
		if(!f || !f[0]) return;

		var ext = (f[0]["name"]||"").toLowerCase().split(".").slice(-1).toString() || "jpg";
		if(["jpg", "jpeg", "png", "gif", "bmp", "webp", "avif", "heic", "heif"].indexOf(ext)<0){
			alertify.set({labels: {ok: _h("e-no-1"), cancel: '<i class="fas fa-chevron-square-up"></i> '+_h("e-picture-3")}, buttonReverse: true});
			alertify.confirm('<i class="fal fa-image-polaroid"></i> '+_h("e-picture-5", {$ext: ext.toUpperCase()}), function(e){
				if(!e) post_picture();
			});
		}
		else{
			// $(".bk-page .frame").addClass("uploading");
			hj_uploader_preview(f);
		}
	}

function post_picture_remove(){
	alertify.set({labels: {ok: _h("e-no-0"), cancel: '<i class="fas fa-trash-alt"></i> '+_h("e-picture_remove-1")}, buttonReverse: false});
	alertify.confirm('<i class="fal fa-image"></i> '+_h("e-picture_remove-0"), function(e){
		if(!e){
			var gallery_id = $(".image-zoom").attr("data-gallery_id") || 0, 
				$p = $(".bk-page .pictures");

			hj_update({
				action: "post_picture_remove", 
				gallery_id: gallery_id
			}).then(function(r){
				if(r["Status"]==1) alertify.error('<i class="far fa-image"></i> '+_h("e-picture_remove-2"));
				else msg();
			});

			if($p.hasClass("slick-initialized")){
				$p.slick("slickRemove", $p.slick("slickCurrentSlide"));

				// 移除 slick
				if($p.slick("getSlick").slideCount<2) $p.slick("unslick");
			}
			else{
				$p.find("figure").remove();
			}
			illustration_shuffle();
			popup_toggle(false, "image-zoom");
		}
	});
}

function image_uploader_init(){
	var $e = $(".bk-page #editor_editable"), 
		$u = $(".img_uploader");

	$u.find("#mulitplefileuploader").uploadFile({
		url: location.origin+"/update", 
		dragDrop: true, 
		fileName: "myfile", 
		allowedTypes: "jpg,jpeg,png,gif,bmp,webp,avif,heic,heif", 
		returnType: "json", 
		showDone: false, 
		showDelete: false, 
		formData: {
			category: 1
		}, 
		dynamicFormData: function(){
			return {
				post_id: current_post()["post_id"], 
				privacy: current_post()["privacy"]
			};
		}, 
		onSubmit: function(files){
			saved(false);
		}, 
		onSuccess: function(files, g, xhr){
			if(g["status"]==1){ // 1: 成功; 0: 錯誤
				var gallery_id = g["gallery_id"]||1, 
					i = "//hearty.me/i/"+gallery_id+"?r=0", 
					$p = $(".bk-page .pictures"), 
					$i = $("<figure>", {
							"data-gallery_id": gallery_id, 
							html: $("<div>")
						}).css({
							"background-image": "url('"+i+"')"
						}).data({
							cssgram: 0, 
							rotated: 0
						});

				if($p.hasClass("slick-initialized")){
					$p.slick("slickAdd", $i).slick("slickGoTo", -1);
				}
				else{
					$i.appendTo($p);
					post_picture_init(true);
					if($p.hasClass("slick-initialized")) $p.slick("slickGoTo", -1);
				}

				$('meta[property="og:image"]').attr({content: i});

				alertify.success('<i class="far fa-image"></i> '+_h("e-picture-6"));
				post_revise();

				var evt = "Image Added";
				ga_evt_push(evt, {
					event_category: "Posts", 
					event_label: evt
				});
				// $u.find(".ajax-file-upload-statusbar").remove();
			}
			else{
				msg('<i class="far fa-times"></i> '+_h("e-picture_err-"+(g["err"]||0)));
			}
			hj_uploader_preview(false);
		}, 
		onError: function(files,status,errMsg,pd){
			msg('<i class="far fa-info-circle"></i> '+_h("e-picture_err-0")+"<br><small>"+JSON.stringify(status)+"："+JSON.stringify(errMsg)+"</small>");
			hj_uploader_preview(false);
		}
	});
}

	// Blob Preview 
	function hj_uploader_preview(f){
		var $f = $(".bk-page .frame");

		// 移除預覽
		if(!f){
			$f.removeClass("uploading").find(".pictures").css({
				"background-image": ""
			});
		}
		// 預覽
		else{
			hj_video("reset");
			$f.addClass("uploading");

			var $i = $(".image-zoom img"), 
				[file] = f, 
				p1 = hj_uploader_createImageFromFile($i.get(0), file), 
				p2 = hj_uploader_getFileBase64Encode(file);

			Promise.all([p1, p2]).then(function(r){
				var [img, b64] = r;

				$f.find(".pictures").css({
					"background-image": "url('"+b64+"')"
				});
				$i.attr({src: b64});
			});
		}
	}
	function hj_uploader_createImageFromFile(img, file){
		return new Promise(function(resolve, reject){
			img.src = URL.createObjectURL(file);
			img.onload = function(){
				URL.revokeObjectURL(img.src);
				resolve(img);
			};
			img.onerror = function(){reject("Failure to load image");};
		});
	}
	function hj_uploader_getFileBase64Encode(blob){
		return new Promise(function(resolve, reject){
			var reader = new FileReader();
			reader.readAsDataURL(blob);
			reader.onload = () => resolve(reader.result);
			reader.onerror = error => reject(error);
		});
	}

function hj_screenshot(){
	if(current_post()["post_id"]==0) return false;
	alertify.success('<i class="fas fa-clock"></i>  '+_h("e-screenshot"));

	autosave_the_change();
	hj_loading();

	var post_id = current_post()["post_id"], 
		$pg = $(".bk-page"), 
		$ss = $(".diary_screenshot"), 
		$d = $pg.find(".diary"), 
		$e = $pg.find("#editor_editable");

		$pg.get(0).scroll({
			top: 0, 
			left: 0, 
			behavior: "instant"
		});
		// $pg.removeClass("scroll-smoothly").scrollTop(0).scrollLeft(0).addClass("scroll-smoothly");

		$e.removeClass("editor_margin_bottom").attr("data-screenshoted", "");
		$pg.find(".frame .far").hide();
		$d.attr("data-screenshoted", "");

	// 取得適配 html2canvas 的高度
	var d = {
		width: $d.get(0).scrollWidth+20, 
		height: $d.get(0).scrollHeight
	};
	$e.removeAttr("data-screenshoted");

	// 圖片透過 Statically CORS Proxy
	$d.find("#youtube,.sticker_img").each(function(){
		var i = $(this).css("background-image");
		if(i.length>0) $(this).css("background-image", 
			// ALT: i0.wp.com/
			i.replace("//i.hearty.app", "//cdn.statically.io/img/i.hearty.app")
		);
	});

	hj_getScript_npm("html2canvas@1.4.1/dist/html2canvas.min.js", function(){
		window.html2canvas($d.get(0), {
			useCORS: true, 
			scale: window.devicePixelRatio, 
			width: d["width"], 
			height: d["height"]
		}).then(function(c){
			var b64 = c.toDataURL("image/png"), 
				subject = $pg.find("#subject").text();
			$ss.empty();

			var $a = $("<a>", {
				target: "_blank", 
				href: b64, 
				download: _h("e-file")+"_"+subject+".png", 
				title: subject, 
				rel: "noopener", 
				onclick: "hj_screenshot_share($(this));event.stopPropagation()", 
				html: $("<img>", {src: b64})
			}).appendTo($ss).get(0).click();

			// Resume
			$d.removeAttr("data-screenshoted");
			$e.addClass("editor_margin_bottom");
			$pg.find(".frame .far").show();

			popup_toggle(true, "diary_screenshot");
			hj_loading(false);

			ga_evt_push("Screenshot", {
				event_category: "Posts", 
				event_label: "Screenshot"
			});
		});
	});
}
	// ### Experiment for Mobile Native Share on Mobile (Chrome 75+)
	// Direct Share to Other App
	// developers.google.com/web/updates/2019/06/nic75#share-files
	function hj_screenshot_share($e){ // Binded to Click (Must be a User Interaction)
		if(!($e==null) && !check_hjapp() && "share" in navigator && "canShare" in navigator){
			var subject = _h("e-file")+"_"+$e.attr("title");
			urltoFile($e.attr("href"), subject+".png", "image/png").then(function(f){
				var d = {files: [f]};
				if(navigator.canShare(d)){
					d.title = d.text = subject;
					navigator.share(d).catch(function(e){});
				}
			});
		}
	}
		// Convert URL to File Object: stackoverflow.com/a/38936042
		function urltoFile(url, filename, mimeType){
			mimeType = mimeType || (url.match(/^data:([^;]+);/)||'')[1];
			return (fetch(url)
				.then(function(res){return res.arrayBuffer();})
				.then(function(buf){return new File([buf], filename, {type: mimeType});})
			);
		}


function hj_bookmark(){
	var post_id = current_post()["post_id"];
	hj_update({
		action: "bookmark", 
		post_id: post_id
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				ga_evt_push("Bookmark", {
					event_category: "Posts", 
					event_label: "Bookmark"
				});
			break;

			case 2:
				signin_required();
			break;
		}
	});
}

// 啟用 30日試用
function free_trial_activate(){
	hj_update({action: "free_trial_activate"}).then(function(r){
		switch(r["Status"]){
			/*
			case 0:
				msg("試用版已開通過嚕");
			break;
			*/

			case 1:
				alertify.set({labels: {ok: '<i class="fas fa-hand-point-right"></i> '+_h("e-trial-3"), cancel: '<i class="fas fa-info-circle"></i> '+_h("e-trial-2")}, buttonReverse: false});
				alertify.confirm('<i class="far fa-gift-card"></i> '+_h("e-trial-0")+'<br><br><small style="display:inline-block;text-align:left">'+_h("e-trial-1", {$exp: date_format(r["Values"]["expiration"])})+"</small>", function(e){
					if(!e) hj_upgrade_toggle(true);
				});

				ga_evt_push("Trial Activate", {
					event_category: "Account", 
					event_label: "Trial Activate"
				});
				fb_evt_push("StartTrial");
			break;

			/*
			case 2:
				signin_required();
			break;
			*/
		}
	});
}

function signin_required(){
	account_status().then(function(r){
		if(r["Status"]==1){
			var u = r["Values"]["username"];
			if("hj_writer" in window && hj_writer!=u) hj_href(u);
			else location.reload(true);
		}
	});
	signin_ask();
}
	function signin_ask(f, text){
		var a = getcookie("hearty_account") || getUrlPara("a") || "";
			a = !a ? "" : "&account="+a;
		var u = "?r="+location.href.split("#")[0].split("?")[0].replace(location.origin, "")+a+"#signin";
		if(f){
			hj_href(u);
		}
		else{
			alertify.set({labels: {ok: _h("e-no-0"), cancel: '<i class="fas fa-door-open"></i> '+_h("e-signin-0")}, buttonReverse: true});
			alertify.confirm('<i class="fal fa-user-lock"></i> '+_h("e-signin-1", {$act: (text||_h("e-signin-2"))}), function(e){
				if(!e) hj_href(u);
			});
		}
	}

// 購買後彈窗
function hj_after_purchase(){
	alertify.set({labels: {ok: '<i class="fas fa-pen"></i> '+_h("e-purchased-3"), cancel: _h("e-purchased-4")}, buttonReverse: false});
	alertify.confirm('<i class="fal fa-gifts"></i> '+_h("e-purchased-0")+" ༼ つ ◕_◕ ༽つ<br>"+_h("e-purchased-1")+"<br>"+_h("e-purchased-2"), function(e){
		if(e) open_url("//go.hearty.me/hj"+(/zh/i.test(hj_lang()) ? "" : "-")+"vip");

		ga_evt_push("VIP Survey", {
			event_category: "Membership", 
			event_label: "VIP Survey", 
			accepted: e ? "Y" : "N"
		});
	});
}

function customized_notification(action, val){
	switch(action){
		case "email_verify_required": // 需驗證 Email
			notifications_new([{
				notification_id: 1, 
				msg: _h("e-n_verify_email-0", {$item: (val || "Email")}), 
				clk: "open_url(location.origin+'/account?ev=1')", 
				unread: 1, 
				icon: "far fa-envelope"
			}], false);

			$(".popup.feedback .notice").text(_h("e-n_verify_email-1")).on("click", function(){
				open_url(location.origin+"/account?ev=1");
			});
		break;

		case "phone_verify_required": // 需驗證手機
			// FirebaseAuth isn't Supported in China
			if(!hj_lang_zhcn()){
				notifications_new([{
					notification_id: 8, 
					msg: _h("e-n_verify_phone"), 
					clk: "open_url(location.origin+'/p/phone.php')", 
					unread: 1, 
					icon: "far fa-mobile"
				}], Math.random()>=0.5);
			}
		break;

		case "vip_expiring": // VIP 方案到期
			let $e = $("[data-due1]");
			notifications_new([{
				notification_id: 2, 
				msg: _h("e-n_vip_prefix")+" "+($e.attr("data-due1")||"").toLowerCase()+($e.attr("data-exp")||"")+($e.attr("data-due2")||"")+" (◍•ᴗ•◍)ゝ", 
				clk: "hj_upgrade_toggle(!0)", 
				unread: 1, 
				icon: "far fa-crown", 
			}], false);
		break;

		case "char_limit_exceed": // 字數限額
			notifications_new([{
				notification_id: 9, 
				msg: _h("e-n_char_limit_exceed", {$chars: val}), 
				clk: "hj_upgrade_toggle(!0)", 
				unread: 1, 
				icon: "far fa-arrow-circle-up", 
			}], false);
		break;

		case "daily_checkin":
			notifications_new([{
				notification_id: 10, 
				msg: _h("e-n_daily_checkin"), 
				clk: "hj_daily_checkin('init')", 
				unread: 0, 
				icon: "far fa-mitten", 
			}], false);
		break;
	}
}

// 快取欄位後綴
function bucket_suffix(){
	var d = new Date();
	return d.getDate()+d.getHours();
}

// 預設插畫
function illustration_shuffle(){
	var i = illustration_random(), 
		// Safari 13 CDN switch
		url = "https://i.hearty.app/i/illustrations/"+i["image"]+".jpg";

	$(".bk-page .pictures").css({
		"background-image": "url('"+url+"')", 
		"background-position": i["position"]+" center"
	});
	$(".image-zoom").attr({
		"data-gallery_id": 0
	}).find("img").attr({
		src: url, 
		"data-r": ""
	});
	post_picture_filter(0, $(".image-zoom div"));
	$('meta[property="og:image"]').attr({content: url});

	return url;
}

// 旋轉圖片
function post_picture_rotate(){
	var $z = $(".image-zoom"), 
		$i = $z.find("img"), 
		gallery_id = $z.attr("data-gallery_id") || 0, 
		$g = $(".bk-page figure[data-gallery_id='"+gallery_id+"']"), 
		rotated = parseInt($g.data("rotated")) || 0, 
		rotated_preview = parseInt($i.attr("data-r"))||0;

	rotated++;
	rotated = rotated>3 ? 0 : rotated;

	rotated_preview++;
	rotated_preview = rotated_preview>3 ? 0 : rotated_preview;

	$g.data({
		rotated: rotated
	}).css({
		"background-image": "url('//hearty.me/i/"+gallery_id+"?r="+rotated+"')"
	});
	$i.attr({"data-r": rotated_preview});

	hj_update({
		action: "post_picture_rotate", 
		gallery_id: gallery_id
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				ga_evt_push("Rotate Picture", {
					event_category: "Posts", 
					event_label: "Rotate Picture", 
					degree: rotated_preview
				});
			break;

			case 2:
				signin_required();
			break;
		}
	});
}

// 相片濾鏡
function post_picture_cssgram(){
	var $z = $(".image-zoom"), 
		$d = $z.find("div"), 
		$i = $z.find("img"), 
		gallery_id = $z.attr("data-gallery_id") || 0, 
		filter = post_picture_filter(
			$d.data("cssgram") || 0, 
			$d.add(".bk-page figure[data-gallery_id='"+gallery_id+"']"), 
			true
		);

	if(gallery_id>0){
		hj_update({
			action: "post_picture_cssgram", 
			gallery_id: gallery_id, 
			cssgram: filter["id"] || 0
		});
	}

	$z.clearQueue().attr({
		"data-filter": "#"+(filter["id"]+1)+" "+capitalizeFirstLetter(filter["cname"])
	}).delay(2500).queue(function(){
		$(this).removeAttr("data-filter").clearQueue();
	});
}
	function post_picture_filter(i, $e, next){
		var cssgram = ["original","_1977","aden","brannan","brooklyn","clarendon","earlybird","gingham","hudson","inkwell","kelvin","lark","lofi","maven","mayfair","moon","nashville","perpetua","reyes","rise","slumber","stinson","toaster","valencia","walden","willow","xpro2"], 
			cssgram_active = [0,1,2,4,6,7,8,9,12,14,16,17,18,22,24,26], // 已開啟

		i = parseInt(i) || 0;

		// 取得下一組
		if(next) i = i>=cssgram_active.length-1 ? 0 : (i+1);
		else i = i>=cssgram_active.length ? 0 : i;

		var cname = cssgram[cssgram_active[i]];

		if(!($e==null)){
			$e.data({cssgram: i})
				.removeClass(cssgram.join(" "))
				.addClass(cname);
		}

		return {
			id: i, 
			cname: cname 
		};
	}

// 下載
function post_picture_download($a){
	var url = $(".image-zoom img").attr("src") || "";
	url += (url.indexOf("?")>0?"&":"?")+"dl";

	$a.attr({
		href: url, 
		download: ($(".bk-page #subject").text() || _h("e-file")).replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, "")
	}).on("click", function(e){
		e.stopPropagation();
	}).get(0).click();
	alertify.success('<i class="far fa-arrow-alt-to-bottom"></i> '+_h("e-picture-7"));
}

// 每日簽到
function hj_daily_checkin(action){
	var $c = $(".popup.notice_checkin");
	switch(action){
		case "init":
			popup_toggle(true, "notice_checkin");
			hj_update({
				action: "hearty_point", 
				query: "balance_lookup"
			}).then(function(r){
				switch(r["Status"]){
					case 1:
						$c.find("[data-point]").attr("data-point", Number(r["Values"]["point"]));
					break;

					case 2:
						signin_required();
					break;
				}
			});
		break;

		case "intro":
			msg('<i class="far fa-cookie"></i> '+_h("e-checkin-7"));
		break;

		case "customized_notification":
			if(/zh-tw/i.test(hj_lang())){
				hj_update({
					action: "hearty_point", 
					query: "daily_checkin_already"
				}).then(function(r){
					if(r["Status"]<1) customized_notification("daily_checkin");
				});
			}
		break;

		default:
			var $btn = $c.find(".btns_action");
			hj_update({
				action: "hearty_point", 
				query: "daily_checkin"
			}).then(function(r){
				switch(r["Status"]){
					case 1:
						var $p = $c.find("[data-point]"), p
							p = Number($p.attr("data-point") || 0 )+1;
						$p.attr("data-point", p);
						$c.find("img").attr("data-shaking", 1);

						msg('<i class="far fa-cookie"></i> '+_h("e-checkin-4", {$p: p}), '<i class="fas fa-hand-peace"></i> '+_h("e-ok-0"), function(){
							popup_toggle(false, "notice_checkin");
							$(".notifications li[data-notification_id='10']").remove();
						});

						// forms.gle/JxwFHhFaA8kbvjgH9
						gform_post("1FAIpQLSd-_KtssDZ1EfNp07bfgdGguDrlfzSEAkEXrWujYDNr69L6iw", {
							"emailAddress": getcookie("hearty_em"), 
							"entry.1537657449": getcookie("hearty_u"), 
							"entry.1470526977": getcookie("hearty_id"), 

							"entry.657077146": today(8), 
							"entry.1332414907": check_OS(), 
							"entry.164417788": check_browser()
						});

						ga_evt_push("Daily Checkin");
					break;

					case 2:
						signin_required();
					break;

					case 3:
						msg('<i class="far fa-check-circle"></i> '+_h("e-checkin-5"), _h("e-checkin-6"), function(){
							popup_toggle(false, "notice_checkin");
						});
					break;

					default:
						msg(); $btn.fadeIn();
					break;
				}
			}).fail(function(){
				msg(); $btn.fadeIn();
			});
			$btn.fadeOut();
		break;
	}
}

// regexr.com/7p83p
function review_words(p){
	p = p || "";
	return /(https?:\/\/|www\.)(?!((.+?\.)?(hearty(\.(me|app|gift|biz|(page|app)\.link|eu\.org|edu\.pl)|mail\.com)|hj\.rs|ht\.mk|(chen|)nien\.(co|org)|(alice|she|docs|miss\.com)\.tw|jiayi\.life)\/?)).*/i.test(p) || // 非允許網域
		
		/(筆|笔)友|(溫|温)度日(記|记)/i.test(p) || // 需審查

		/死|自(殘|残|殺|杀)|白(癡|痴|目)|北七|智障|腦殘|脑残|婊子|三小|(機|机)掰|大便|屎|屌|賤|贱|他(媽|妈)的|e04|(幹|干)你|你娘|拎老|靠北|夭(壽|寿)|外(送茶|約)|(約|正)妹|加賴|(性|做|愛)愛|(打|約)(炮|砲)|(全|半|無|戴)套|口(交|爆)|(內|顏|颜)射|(性|援|肛)交|一夜情|女優|(叫|找)小姐|(春|壯陽)(藥|药)|持久液|早洩|陽痿|(娛樂|娱乐)城|博奕|賭場|赌场|中((華|华)(人|)民(共和|)|)(國|国|共)|政府|(執|执)政|共(產|产)|黨|党|海(峽|峡)|(兩|两)岸|(習|习)近平|李(|克)(強|强)|郭文(貴|贵)|閆麗夢|闫丽梦|(希|西)塔|阿卡(西|夏)|大(師|师)|(師|师)(傅|父)|薩滿|萨满|頌缽|颂钵|通(靈|灵)|(靈|灵)(性|魂|體|体|數|数|命|氣|气)|梵|(顯|显)化|磁(場|场)|命(理|盤|盘)|脈輪|脉轮|(覺|觉)醒|魔法|算命|八字|紫薇|斗數|卜卦|(風|风)水|易(經|经|卦)|星(盤|盘)|(瑪|玛)雅曆|佛|南(無|无)|菩(提|薩|萨)|如(來|来)|(觀|观)音|修(行|士)|法(門|门)|妙法|大悲|(業|业)(障|力)|淨土|慧炬|心語|萊豬|莱猪|\s+(fuck|shit|bitch|asshole|dick)/i.test(p); // 禁止
}

function beep(){
	if(!check_browser("Safari")){
		try{
		(new Audio("data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vmz+Zt//+mm3Wm3Q576v////+32///5/EOgAAADVghQAAAAA//uQZAUAB1WI0PZugAAAAAoQwAAAEk3nRd2qAAAAACiDgAAAAAAABCqEEQRLCgwpBGMlJkIz8jKhGvj4k6jzRnqasNKIeoh5gI7BJaC1A1AoNBjJgbyApVS4IDlZgDU5WUAxEKDNmmALHzZp0Fkz1FMTmGFl1FMEyodIavcCAUHDWrKAIA4aa2oCgILEBupZgHvAhEBcZ6joQBxS76AgccrFlczBvKLC0QI2cBoCFvfTDAo7eoOQInqDPBtvrDEZBNYN5xwNwxQRfw8ZQ5wQVLvO8OYU+mHvFLlDh05Mdg7BT6YrRPpCBznMB2r//xKJjyyOh+cImr2/4doscwD6neZjuZR4AgAABYAAAABy1xcdQtxYBYYZdifkUDgzzXaXn98Z0oi9ILU5mBjFANmRwlVJ3/6jYDAmxaiDG3/6xjQQCCKkRb/6kg/wW+kSJ5//rLobkLSiKmqP/0ikJuDaSaSf/6JiLYLEYnW/+kXg1WRVJL/9EmQ1YZIsv/6Qzwy5qk7/+tEU0nkls3/zIUMPKNX/6yZLf+kFgAfgGyLFAUwY//uQZAUABcd5UiNPVXAAAApAAAAAE0VZQKw9ISAAACgAAAAAVQIygIElVrFkBS+Jhi+EAuu+lKAkYUEIsmEAEoMeDmCETMvfSHTGkF5RWH7kz/ESHWPAq/kcCRhqBtMdokPdM7vil7RG98A2sc7zO6ZvTdM7pmOUAZTnJW+NXxqmd41dqJ6mLTXxrPpnV8avaIf5SvL7pndPvPpndJR9Kuu8fePvuiuhorgWjp7Mf/PRjxcFCPDkW31srioCExivv9lcwKEaHsf/7ow2Fl1T/9RkXgEhYElAoCLFtMArxwivDJJ+bR1HTKJdlEoTELCIqgEwVGSQ+hIm0NbK8WXcTEI0UPoa2NbG4y2K00JEWbZavJXkYaqo9CRHS55FcZTjKEk3NKoCYUnSQ0rWxrZbFKbKIhOKPZe1cJKzZSaQrIyULHDZmV5K4xySsDRKWOruanGtjLJXFEmwaIbDLX0hIPBUQPVFVkQkDoUNfSoDgQGKPekoxeGzA4DUvnn4bxzcZrtJyipKfPNy5w+9lnXwgqsiyHNeSVpemw4bWb9psYeq//uQZBoABQt4yMVxYAIAAAkQoAAAHvYpL5m6AAgAACXDAAAAD59jblTirQe9upFsmZbpMudy7Lz1X1DYsxOOSWpfPqNX2WqktK0DMvuGwlbNj44TleLPQ+Gsfb+GOWOKJoIrWb3cIMeeON6lz2umTqMXV8Mj30yWPpjoSa9ujK8SyeJP5y5mOW1D6hvLepeveEAEDo0mgCRClOEgANv3B9a6fikgUSu/DmAMATrGx7nng5p5iimPNZsfQLYB2sDLIkzRKZOHGAaUyDcpFBSLG9MCQALgAIgQs2YunOszLSAyQYPVC2YdGGeHD2dTdJk1pAHGAWDjnkcLKFymS3RQZTInzySoBwMG0QueC3gMsCEYxUqlrcxK6k1LQQcsmyYeQPdC2YfuGPASCBkcVMQQqpVJshui1tkXQJQV0OXGAZMXSOEEBRirXbVRQW7ugq7IM7rPWSZyDlM3IuNEkxzCOJ0ny2ThNkyRai1b6ev//3dzNGzNb//4uAvHT5sURcZCFcuKLhOFs8mLAAEAt4UWAAIABAAAAAB4qbHo0tIjVkUU//uQZAwABfSFz3ZqQAAAAAngwAAAE1HjMp2qAAAAACZDgAAAD5UkTE1UgZEUExqYynN1qZvqIOREEFmBcJQkwdxiFtw0qEOkGYfRDifBui9MQg4QAHAqWtAWHoCxu1Yf4VfWLPIM2mHDFsbQEVGwyqQoQcwnfHeIkNt9YnkiaS1oizycqJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=")).play();
		}
		catch(e){}
	}
}

// AJAX 請求錯誤回報
function hj_update_failed(r){
	let fn = "fn" in r ? r["fn"] : "";

	// forms.gle/DfitAXtyuydJBesp6
	navigator.sendBeacon(
		"//docs.google.com/forms/d/e/1FAIpQLScK7-5jXvdZLsd9pRTI7OcgEAqxCt6i9W00Gh2fAK8ccJigPA/formResponse", 
		new URLSearchParams({
			"entry.783049182": window.hj_username || "", 
			"entry.545503952": location.href.replace(location.origin, ""), 
			"entry.355700800": fn, 
			"entry.1270264487": "flag" in r ? r["flag"] : "", 
			"entry.705828998": "err" in r ? JSON.stringify(r["err"]) : "", 
			"entry.1259076046": new Date((new Date).getTime()+288e5).toISOString().split("T")[0], 
			"entry.124585191": navigator.userAgent||""
		})
	);
	if(fn!="unhandledrejection") update_failed();
}

function get_console(){
	let e = console.errors || [], 
		w = console.warns || [], 
		l = console.logs || [];
	e = !e.length ? "" : "error: "+e.join(", ")+"; ";
	w = !w.length ? "" : "warns: "+w.join(", ")+"; ";
	l = !l.length ? "" : "logs: "+l.join(", ");

	return e+w+l;
}

function hj_onerror(){
	window.onerror = function(msg, url, lineNo, colNo, err){
		msg = msg || "";

		console.warn("JS Error: "+msg+" on line "+lineNo+" for "+url);

		if(!/script error/i.test(msg) // 不是 Script Error
		 && "sendBeacon" in navigator && "URLSearchParams" in window)
			// forms.gle/wayMeYPw2GmmgTcF6
			navigator.sendBeacon(
				"//docs.google.com/forms/d/e/1FAIpQLSd-gx-4oyasCPoU1-Yh_-3vS-AQ0RXupcsJk_pI0qGj1BkM-Q/formResponse", 
				new URLSearchParams({
					"entry.982789386": window.hj_username || "", 
					"entry.1421885238": url.replace(location.origin, "") || "", 
					"entry.747511664": msg, 
					"entry.1524611288": err || "", 
					"entry.459852176": ("Line: "+(lineNo||"")+", Col: "+(colNo||"")), 
					"entry.655539693": navigator.userAgent||""
				})
			);

		// 自動存檔
		if(typeof autosave_the_change=="function") autosave_the_change();
		if(!getUrlPara("retry")){ // force refresh once
			try{
				var u = "hj_writer" in window && location.pathname.indexOf(hj_writer)>0 ? 
					new URL(location) : 
					new URL(hj_writer, location.origin);
				u.searchParams.set("retry", 1);
				location.href = u.href;
			}
			catch(e){}
		}
	};
}
hj_onerror();