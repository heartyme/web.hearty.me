"use strict";

var btn_alias = "feed";

// 疫情相關關鍵字：符合時顯示健康提醒
const FEED_COVID_RE = /co(vid|ronavirus)|vaccin(e|ation)|(epi|pan)demic|delta|omicron|新冠|冠(狀|状)|病毒|肺炎|疫(情|苗)|(防|抗)疫|武(漢|汉)/i,
	FEED_HTML_ESC = {"<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"};

// 最近一次 read_post 的序號，用以忽略過期的回應
let feed_read_seq = 0;

function feed_avatar_bg(profile_image){
	return "url(//i.hearty.app/u/"+profile_image+")";
}

hj_getScript("//cdn.jsdelivr.net/combine/npm/@webcreate/infinite-ajax-scroll@3.1.0/dist/infinite-ajax-scroll.min.js,npm/pulltorefreshjs@0.1.22/dist/index.umd.min.js").then(function(){
	$(function(){
		post_font();

		const ias = new InfiniteAjaxScroll(".feed_wall", {
			scrollContainer: ".feed_wall",
			item: ".article",
			next: ".pager_next",
			pagination: ".pager",
			spinner: {
				element: ".bouncingLoader",
				delay: 600
			}
		});
		ias.on("page", function(e){
			const page_no = e.pageIndex+1,
				title = _h("f-title", {$p: page_no})+" | 💝 Hearty Journal 溫度日記";
			document.title = title;
			history.replaceState(history.state, title, location.pathname+"?pg="+page_no);
		});
		ias.on("appended", function(e){
			if(!e.items.length) $(".no_more").fadeIn();
		});

		PullToRefresh.init({
			mainElement: ".feed_wall",
			triggerElement: ".feed_wall",
			instructionsRefreshing: _h("f-refresh-0"),
			instructionsPullToRefresh: _h("f-refresh-1"),
			instructionsReleaseToRefresh: _h("f-refresh-2"),
			distIgnore: 200,
			onRefresh: function(){
				hj_href("feed?p=1");
			}
		});

		// 聚焦於某篇日記
		const post_assigned = Number(getUrlPara("post") || 0);
		if(post_assigned>0) focus_active_post(post_assigned).attr("data-active", "");

		const $story = $(".page .story"),
			$gotop = $(".nav_btn.fa-chevron-up");

		// 僅在顯示狀態改變時才觸發動畫，避免每個 scroll 事件都重啟淡入淡出
		let gotop_shown = false;
		$story.on("scroll", function(){
			const show = this.scrollTop>200;
			if(show===gotop_shown) return;
			gotop_shown = show;
			$gotop.stop()[show ? "fadeIn" : "fadeOut"]("slow");
		}).hide();
		$gotop.on("click", function(){
			$story.stop().scrollTop(0);
		}).hide();

		$(".mh-head .left").on("click", function(){
			nav_toggle($(".menu"), true);
		});
		$(".page_back").on("click", function(){
			nav_feed(0);
		});
		$(".nav_btn.fa-plus,.page_publish").on("click", how2publish);
		$("[data-focus_post]").on("click", function(){
			focus_active_post();
		});

		// 個人檔案彈窗：點背景或按鈕皆關閉
		const $profile = $(".feed .profile");
		$profile.on("click", function(){
			profile_popup();
		});
		$profile.find(".avatar").on("click", function(e){
			e.stopPropagation();
		});
		$profile.find(".profile_btns").on("click", function(){
			profile_popup();
		});
		$profile.find("[data-link]").on("click", function(){
			window.open(location.origin+"/"+this.dataset.username+"/"+this.dataset.post_id+"?feed=1", "_blank");
		});

		feed_translate();
		feed_hotkey_init();
		hj_feed_history_init();
	});
});
leave_InAppBrowser();

// 鍵盤 ↑↓ 切換日記
function feed_hotkey_init(){
	if(is_touch_device()) return;

	const $f = $(".feed_wall");
	$(document).on("keydown", function(e){
		if(e.key!=="ArrowUp" && e.key!=="ArrowDown") return;
		e.preventDefault();

		// 文章會由 infinite scroll 動態加入，每次重新查詢
		const $a = $f.find("article");
		if(!$a.length) return;

		const $active = $a.filter("[data-active]"),
			a = (e.key==="ArrowUp" ? $active.prev() : $active.next()).get(0) || $a.get(0);
		a.click();
		$f.scrollTop(a.offsetTop || $f.get(0).scrollHeight);
	});
}

// 手機版：返回鍵依序關閉個人檔案、單篇日記，最後回到日記本
function hj_feed_history_init(){
	if($("body").width()>=1025) return;

	const push = function(){
		history.pushState(null, document.title, location.href);
	};
	push();

	window.addEventListener("popstate", function(){
		const $s = $(".page .story"),
			scrolled = $(".feed").scrollLeft();

		if($(".feed .profile").is(":visible")){
			profile_popup();
			push();
		}
		else if($s.is(":visible")){
			nav_feed(+(scrolled==0));

			// 在單篇日記頁時，點返回鍵，則返回 timeline 並清除單篇日記
			if(scrolled>0){
				$s.delay(500).queue(function(){
					$(this).hide().dequeue();
				});
			}
			else{
				$s.show();
			}
			push();
		}
		else{
			hj_href("d");
		}

		$("nav.menu").data("mmenu")?.close();
	}, false);
}

// 水平捲動切換欄位：0 = 日記牆、1 = 單篇日記
function nav_feed(p, no_animation){
	const $e = $(".feed");
	$e.get(0)?.scroll({
		left: $e.width()*(p||0),
		behavior: no_animation ? "instant" : "smooth"
	});
}

function read_post(d){
	const post_id = Number(d.post_id) || 0,
		$s = $(".page .story"),
		$p = $s.find("article"),
		on_mobile = is_touch_device(),
		seq = ++feed_read_seq;

	if(!on_mobile) $s.fadeOut("fast");

	$.ajax({
		url: location.href,
		type: "POST",
		data: {
			action: "read",
			post_id: post_id
		},
		dataType: "json"
	}).then(function(r){
		// 快速連點多篇時，只採用最後一次的回應，避免內容與選取狀態不一致
		if(seq!==feed_read_seq) return;

		if(r.Status!=1){
			nav_feed(0);
			return;
		}
		r = r.Values;

		const post = (r.post||"").trim();
		document.title = r.title+" | 💝 溫度日記 Hearty Journal";
		$p.find("h2").attr({title: r.title});
		$p.find("p").html(linkify(post));

		// 疫情相關日記，顯示健康提醒
		$s.find(".reminder").toggle(FEED_COVID_RE.test(r.title+post));

		$p.find(".published").attr({title: r.published});
		$p.attr({
			"data-username": d.username,
			"data-post_id": post_id
		}).find(".avatar").attr({
			title: d.nickname,
			"data-profile_image": d.profile_image,
			"data-gender": d.gender
		}).find("div").css({
			"background-image": feed_avatar_bg(d.profile_image)
		});
		$(".page .illustration").hide();

		// 在手機上，關閉動畫 (避免緩慢)
		if(on_mobile) $s.show().scrollTop(0);
		else $s.slideDown("fast", function(){
			$(this).scrollTop(0);
		});

		$(".feed_wall article").removeAttr("data-active")
			.filter("[data-post_id='"+post_id+"']").attr("data-active", "");
	}).fail(function(){
		if(seq===feed_read_seq) msg();
	});

	nav_feed(1);
}
	function linkify(s){
		return (s || "")
		// escape <>"' (&apos; 不含 #，避免被 Hashtags 誤判)
		.replace(/[<>"']/g, function(c){ return FEED_HTML_ESC[c]; })

		// https://+ Owned Domains
		.replace(/\bhttps:\/\/(|(\w+)\.)(hearty\.(me|app|gift|tw|page\.link|eu\.org)|hj\.rs|ht\.mk|nien\.(co(m|)|org)|youtu(be\.com|\.be))(\/(\S+)?|)/gim, '<a target="_blank" href="$&" rel="ugc" title="$&">$&</a>')

		// Hashtags: Negative Lookahead (with Safari support) regex101.com/r/zEoWKu/1
		// ref: stackoverflow.com/a/27213663
		.replace(/((?!([\(])).|^|\s)#(\S+)(?![^<]*>|[^<>｛｝]*<\/)/g, '$1<a title="$3" onclick="msg(\'#\'+htmlspecialchars(this.title))">#$3</a>')

		// Marks
		.replace(/[^\S\r\n]?\*([^\*{}=#<>｛｝]+)\*[^\S\r\n]?(?![^<]*>|[^<>]*<\/)/g, '<mark title="$1">$1</mark>')

		// Underlines
		.replace(/[^\S\r\n]?[{|｛]([^\*{}=#<>｛｝]+)[}|｝][^\S\r\n]?(?![^<]*>|[^<>]*<\/)/g, '<u title="$1">$1</u>')
		.replace(/[^\S\r\n]?=([^\*{}=#<>｛｝]+)=[^\S\r\n]?(?![^<]*>|[^<>]*<\/)/g, '<u title="$1" data-double>$1</u>');
	}

function focus_active_post(post_id){
	nav_feed(0);

	const $p = $(".feed_wall article"+(post_id==null ? "[data-active]" : "[data-post_id='"+post_id+"']"));
	$p.get(0)?.scrollIntoView();
	$p.delay(400).animate({zoom: 1.1}, 300, function(){
		$(this).animate({zoom: 1}, 300);
		hj_vibrate(30);
	});
	return $p;
}

function bookmark(post_id, $e){
	hj_update({
		action: "bookmark",
		post_id: post_id
	}).then(function(r){
		if(r.Status==1){
			ga_evt_push("Bookmark", {
				event_category: "Posts",
				event_label: "Bookmark"
			});
		}
		else if(r.Status==2){
			alertify.set({labels: {ok: '<i class="fas fa-sign-in-alt"></i> '+_h("f-signin-0"), cancel: _h("f-no")}, buttonReverse: false});
			alertify.confirm('<i class="fal fa-door-open"></i> '+_h("f-signin-1"), function(e){
				if(e) hj_href("#signin?r=/feed");
			});
		}
	});
	$e.toggleClass("fal fas");
}

function profile_popup(username, nickname, profile_image, gender, post_id){
	const $p = $(".feed .profile");
	if(username==null){
		$p.fadeOut("fast");
		return;
	}
	$p.find("[data-a]").css({
		"background-image": feed_avatar_bg(profile_image)
	});
	$p.find("[data-n]").attr({title: nickname, "data-gender": gender});
	$p.find("[data-link]").attr({
		"data-username": username,
		"data-nickname": nickname,
		"data-post_id": post_id
	});
	$p.fadeIn("fast");
}

function feed_share_this(username, post_id){
	const url = "https://o.hearty.me/"+username+"/"+post_id+"?st="+encodeURIComponent($(".story h2").attr("title")||"");

	if(/iOS|Android/i.test(check_hjapp())){
		location.assign("//hearty.me/wv?s="+encodeURIComponent(url.replace(/(^\w+:|^)\/\//, "")));
	}
	else if(is_touch_device() && "share" in navigator){
		navigator.share({
			title: document.title,
			url: url
		}).catch(function(){});
	}
	else{
		alertify.set({labels: {ok: _h("f-no"), cancel: '<i class="fas fa-copy"></i> '+_h("f-url-0")}, buttonReverse: true});
		alertify.prompt('<i class="fal fa-file-alt"></i> '+_h("f-url-1")+'<br><br><a class="qrcode"></a>', function(e){
			if(!e) hj_copy($("#alertify .alertify-text"));
		}, url);

		alertify_input_custom({
			type: "url",
			inputmode: "none",
			placeholder: url,
			onclick: "hj_copy($(this))"
		}, {
			cursor: "copy"
		});

		get_qrcode($("#alertify .qrcode"), url);
	}
	hj_copy_text(url);
}

function how2publish(){
	alertify.set({labels: {ok: '<i class="fas fa-hand-point-right"></i> '+_h("f-publish_ask-4"), cancel: _h("f-publish_ask-3")}, buttonReverse: false});
	alertify.confirm('<h3><i class="fal fa-info-circle"></i> '+_h("f-publish_ask-0")+"</h3>"+_h("f-publish_ask-1")+'【 <i class="fal fa-share-alt"></i> 】'+_h("f-publish_ask-2"), function(e){
		if(e) hj_href("d");
	});
}

function report_abuse(post_id){
	account_status().then(function(r){
		if(r.Status!=1){
			msg('<i class="fal fa-door-open"></i> '+_h("f-signin-1"));
			return;
		}

		const $a = $(".page .story article"),
			title = htmlspecialchars(($a.find("h2").attr("title") || "無標題").trim());

		alertify.set({labels: {ok: _h("f-no"), cancel: '<i class="fas fa-check-circle"></i> '+_h("f-report_ask-1")}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-flag-alt"></i> '+_h("f-report_ask-0", {$title: title}), function(e){
			if(e) return;

			msg("📝 "+_h("f-report_ask-2", {$title: title}));

			// forms.gle/z6gzojN2h8ewF5vd9
			gform_post("1FAIpQLSdPi8fPhBq6KN1ok8h6fK8h5At0SO0qANuNlDCNk6VDoVjjuA", {
				"entry.783049182": getcookie("hearty_u"),
				"entry.866865386": getcookie("hearty_id"),
				"emailAddress": getcookie("hearty_em"),
				"entry.527303026": "投稿日記 (被檢舉)",
				"entry.355700800": post_id,
				"entry.1592095357": ($a.find("p").text() || "n/a").trim(),
				"entry.1259076046": today(8),
				"entry.124585191": check_browser()+", "+check_OS()
			});

			ga_evt_push("Feed Post Reported", {
				event_category: "Posts",
				event_label: "Comment Reported"
			});
			fb_evt_push("Feed Post Reported");
		});
	});
}

// Google 翻譯外掛
function feed_translate(){
	if(!/zh/i.test(hj_lang()))
		hj_getScript("//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit");
}
	function googleTranslateElementInit(){
		new google.translate.TranslateElement({pageLanguage: "zh-TW", includedLanguages: "en,jp,zh-TW,ja,ko", layout: google.translate.TranslateElement.InlineLayout.SIMPLE, autoDisplay: false}, "google_translate_element");
	}
