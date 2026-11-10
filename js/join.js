"use strict";

$(function(){
	post_font();
	$(".user,.join_apply .person").on("click", function(){
		hj_href("?r=/account#signin");
	});

	// 中國用戶
	hj_localize_cn();

	/* Scroll to Anchor
	if(["#job", "#apply"].indexOf(location.hash)>=0){
		$("html,body").animate({
			"scrollTop": $(location.hash).offset().top
		}, 800);
	}
	*/
});
leave_InAppBrowser();

// 只在跨越門檻時切換，避免每次 scroll 事件都排入動畫
let gotop_on;
$(window).on("scroll", function(){
	const on = $(this).scrollTop()>200;
	if(on===gotop_on) return;
	gotop_on = on;
	$(".gotop")[on ? "fadeIn" : "fadeOut"]();
});

// 中國版本
function localize_cn(){
	$(".join_documentary .video_yt iframe").attr({src: "//embed.nicovideo.jp/watch/sm33778735"});
	// ALT: $(".join_documentary .video_yt iframe").attr("src", "//open.iqiyi.com/developer/player_js/coopPlayerIndex.html?vid=05d536c8762497f4ef3a6f3da8792620&tvId=22856912209");
}

function apply_signin_redirect(){
	location.assign("//hearty.me/?r="+location.href.split("#")[0].replace("?", "？").replace(/&/g, "＆").replace(location.origin, "")+"#apply");
}

function application_toggle(on){
	const $a = $(".join_apply"), $b = $("body");
	if(on){
		$a.fadeIn(); $b.addClass("unscrollable");
		$(".application_wrapper").scrollTop(0);
	}
	else{
		$a.slideUp("fast"); $b.removeClass("unscrollable");
	}
}

// 顯示錯誤、聚焦並晃動欄位
function invalid($el, text){
	notice(true, text);
	$el[0]?.focus(); shake($el);
	return false;
}

function apply(){
	if(!examine()) return;

	const $a = $(".join_apply"),
		$e = $a.find("input[name='email']"),
		$p = $a.find("input[name='phone']"),
		$i = $a.find("textarea[name='idea']"),
		$b = $a.find(".submit .join_btn"),
		email = $e.val();

	if(email.length<6 || !email.includes("@")) return invalid($e, "Email 格式不正確");
	const phone = $p.val();
	if(phone.length<10 || !phone.startsWith("09")) return invalid($p, "手機格式不符合");
	if($i.val().length<20) return invalid($i, "報名原因多填一些，讓我們進一步了解你");

	const data = encodeURIComponent($("form").serialize().replace(/'/g, "")),
		fail = function(r){
			$("body").removeClass("page-loading");
			notice(true, "發生異常，請稍候重試");
			$b.attr({onclick: "apply()"}).removeClass("disabled");
			shake($a.find(".tb"));
			msg("糟了，請稍候重試\n"+r);
		};

	alertify.set({labels: {ok: "<i class='fas fa-inbox-out'></i> 確認送出", cancel: "取消"}, buttonReverse: false});
	alertify.confirm("<i class='far fa-mailbox'></i> 確定送出報名表嗎？", function(ok){
		if(!ok) return;
		$("body").addClass("page-loading");
		$b.addClass("disabled").attr("onclick", "");

		$.ajax({
			url: location.href,
			type: "POST",
			crossDomain: true,
			dataType: "json",
			data: {action: "join", data: data},
			xhrFields: {withCredentials: true}
		}).then(function(r){
			if(r===1){
				$("body").removeClass("page-loading");
				$a.find(".tb, .remark").fadeOut(); notice(false);
				$a.find(".submitted").slideDown();
			}
			else fail(r);
			fb_evt_push("Lead");
		}).fail(fail);
	});
}

// 必填欄位檢查：text 至少 1 字、url 至少 10 字
function examine(){
	const $a = $(".join_apply");
	for(const [type, min] of [["text", 1], ["url", 10]]){
		const el = $a.find("input[type='"+type+"'][required]").get().find(el => $(el).val().length<min);
		if(el){
			notice(true, "「"+$(el).attr("title")+"」尚未填寫");
			if(type==="url") $(el).trigger("select");
			else el.focus();
			shake($(el));
			return;
		}
	}
	return true;
}

function notice(on, text){
	const $n = $(".notice");
	if(on) $n.text(text).fadeIn("fast");
	else $n.fadeOut();
}
