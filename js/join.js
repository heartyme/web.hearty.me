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

$(window).on("scroll", function(){
	if($(this).scrollTop()>200) $(".gotop").fadeIn();
	else $(".gotop").fadeOut();
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
	var $a = $(".join_apply"), 
		$b = $("body");
	if(on){
		$a.fadeIn(); $b.addClass("unscrollable");
		$(".application_wrapper").scrollTop(0);
	}
	else{
		$a.slideUp("fast"); $b.removeClass("unscrollable");
	}
}

function apply(){
	if(examine()){
		var $a = $(".join_apply"), 
			$e = $a.find("input[name='email']"), 
			$p = $a.find("input[name='phone']"), 
			$i = $a.find("textarea[name='idea']"), 
			$b = $a.find(".submit .join_btn"), 
			data = encodeURIComponent($("form").serialize().replace(/'/g, ""));

		if($e.val().length<6 || !/@/.test($e.val())){
			notice(true, "Email 格式不正確");
			$e.focus(); shake($e);
			return false;
		}
		else if($p.val().length<10 || $p.val().substr(0,2)!=="09"){
			notice(true, "手機格式不符合");
			$p.focus(); shake($p);
			return false;
		}
		else if($i.val().length<20){
			notice(true, "報名原因多填一些，讓我們進一步了解你");
			$i.focus(); shake($i);
			return false;
		}

		alertify.set({labels: {ok: "<i class='fas fa-inbox-out'></i> 確認送出", cancel: "取消"}, buttonReverse: false});
		alertify.confirm("<i class='far fa-mailbox'></i> 確定送出報名表嗎？", function(e){
			if(e){
				$("body").addClass("page-loading");
				$b.addClass("disabled").attr("onclick", "");

				$.ajax({
					url: location.href, 
					type: "post", 
					crossDomain: true, 
					dataType: "json", 
					data: {
						action: "join", 
						data: data
					}, 
					async: true, 
					xhrFields: {withCredentials: true}
				}).then(function(r){
					$("body").removeClass("page-loading");
					switch(r){
						case 1:
							$a.find(".tb, .remark").fadeOut(); notice(false);
							$a.find(".submitted").slideDown();
						break;

						default:
							notice(true, "發生異常，請稍候重試");
							$b.attr({onclick: "apply()"}).removeClass("disabled");
							shake($a.find(".tb"));
							msg("糟了，請稍候重試\n"+r);
						break;
					}
					fb_evt_push("Lead");
				}).fail(function(e){
					notice(true, "發生異常，請稍候重試");
					$b.attr({onclick: "apply()"}).removeClass("disabled");
					shake($a.find(".tb"));
					msg("糟了，請稍候重試\n"+e);
				});
			}
		});
	}
}

function examine(){
	var $a = $(".join_apply"), e = !0;
	$a.find("input[type='text'][required]").each(function(){
		if($(this).val().length<1){
			notice(true, "「"+$(this).attr("title")+"」尚未填寫");
			$(this).focus(); shake($(this));
			e = !1; return e;
		}
	}); if(!e){return;}

	$a.find("input[type='url'][required]").each(function(){ 
		if($(this).val().length<10){
			notice(true, "「"+$(this).attr("title")+"」尚未填寫");
			$(this).select(); shake($(this));
			e = !1; return e;
		}
	}); if(!e){return;}
	return e;
}

function notice(on, msg){
	var $n = $(".notice");
	if(on) $n.text(msg).fadeIn("fast");
	else $n.fadeOut();
}