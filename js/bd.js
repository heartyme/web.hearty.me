"use strict";

$(function(){
	$(".fa-home-alt").on("click", function(){
		nav_toggle($(".menu"), true);
	});
	$(".user").on("click", function(){
		msg('<i class="fal fa-door-open"></i> 請先登入');
		hj_href("?r=/bd/#signin");
	});
	$("[data-ask]").on("click", function(){
		alertify.set({labels: {ok: '<i class="fas fa-file-alt"></i> 客服表單', cancel: '<i class="fas fa-envelope"></i> '+_h("i-chat-2")}, buttonReverse: false});
		alertify.confirm("<i class='fal fa-info-circle'></i> 連繫方式：", function(e){
			if(e){
				hj_preview(true, "//docs.google.com/forms/d/e/1FAIpQLSdPjxV9HnVqEK6jlzzDsRppuz5H-7DyA4_5Qn3KkoYSouIyKA/viewform?embedded=true");
			}
			else{
				contact(false);
			}
		});
	});
	$("[data-entry]").on("click", entry);
	$("[data-redeem]").on("click", function(){
		redeem_tutorial(true);
	});
	$(".hj_preview").on("click", function(){
		hj_preview(false);
	});

	$(".bd_brands img").on("click", function(){
		var url = $(this).attr("data-url");
		if(!!url){
			if(/iOS|Android/i.test(check_hjapp())) open_url("//"+url);
			else hj_preview(true, "//"+url);
		}
		else{
			msg('<img src="'+$(this).attr("src")+'" alt="'+$(this).attr("alt")+'">');
		}
	});

	$(".teammates").on("click", function(){
		hj_href("c/%E5%81%9A%E7%84%A6%E6%85%AE%E4%B8%96%E4%BB%A3%E7%9A%84%E6%9A%96%E5%BF%83%E9%99%AA%E4%BC%B4");
	});
	$(".nav_btn.fa-link").on("click", hj_share_page);

	// github.com/kenwheeler/slick/
	var slide_num = $("body").width()>767 ? 5 : 3;
	$(".bd_brands div").delay(100).queue(function(){
		$(this).slick({
			autoplay: true, 
			autoplaySpeed: 1500, 
			infinite: true, 
			slidesToShow: slide_num, 
			slidesToScroll: slide_num, 
			arrows: false, 
			draggable: false, 
			swipe: true, 
			touchMove: true, 
			speed: 400, 
			centerPadding: "0px", 
			pauseOnHover: false
		}).on("wheel", function(e){ // 滾輪
			e.preventDefault();
			$(this).slick("slick"+(
				e.originalEvent.deltaY<0 ? 
				"Next" : "Prev"
			));
		}).find("img").fadeTo(0,1).dequeue();
	});

	leave_InAppBrowser();
	post_font();
	hj_testimonials();

	if(!!getUrlPara("ask")){
		hj_preview(true);
		msg('<i class="fal fa-store"></i> 您尚未加入合作夥伴計畫，敬請填寫申請資料');
		hj_vibrate(80);
	}

	hj_localize_cn();
});

function contact(v){
	if(!v){
		hcaptcha_init(function(){
			msg($("<div>", {id: "contact"}).prop("outerHTML"), '<i class="fas fa-reply"></i> '+_h("i-back"));
			hcaptcha.render("contact", {
				sitekey: "5ee3e1cd-7bc2-4623-bb21-df1295a52d98", 
				size: "compact", 
				callback: "contact"
			});
		});
	}
	else{
		$("#alertify-ok").click();

		var m = "jwbzgjx2@nien.co";
		alertify.set({labels: {ok: '<i class="fas fa-copy"></i> '+_h("i-copy-0"), cancel: _h("i-no-0")}, buttonReverse: false});
		alertify.prompt('<i class="fal fa-envelope"></i> '+_h("i-chat-3"), function(e){
			if(e){
				hj_copy($("#alertify .alertify-text"));
				msg('<i class="fal fa-copy"></i> '+_h("i-copy-1")+m);
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

function entry(){
	var bucket = "hearty_bd_app";

	if("fetch" in window && 
		!getcookie(bucket) && 
		(navigator.userAgent || "").indexOf("Windows NT 1")>0 && !check_hjpwa()
	){
		alertify.set({labels: {ok: "否", cancel: '<i class="fas fa-arrow-to-bottom"></i> 好，快速下載'}, buttonReverse: true});
		alertify.confirm('<i class="fab fa-windows"></i> 是否下載「合作夥伴專用 APP」呢？<br>可方便您日後管理序號', function(e){
			if(e){
				hj_href("bd/vouchers.php");
			}
			else{
				hj_getFile("d.hearty.app/win/BD.exe", "溫度日記合作夥伴.exe").then(function(){
					hj_href("bd/vouchers.php");
				});
			}
			setcookie(bucket, 1, 30);
		});
	}
	else{
		hj_href("bd/vouchers.php");
	}
}

function hj_preview(o, url){
	var $b = $("body"), 
		$d = $(".hj_preview"), 
		$i = $d.find("iframe");

	if(o){
		url = url || $i.attr("data-url") || "//drive.google.com/file/d/1vN0JGnk2cnd6cljzXYkthIhcfdV-r3oN/preview";
		if(!$i.attr("src") || url!=$i.attr("src")){
			$i.attr({src: url}).on("load", function(){
				$(this).removeClass("loading");
			});
		}
		else{
			$i.removeClass("loading");
		}
		$d.fadeIn();
		$b.css({"overflow-y": "hidden", "touch-action": "none"});
	}
	else{
		$d.fadeOut();
		$b.css({"overflow-y": "auto", "touch-action": "auto"});
		$i.off("load").addClass("loading");
	}
}
	function hj_video(){
		hj_preview(true, "//www.youtube-nocookie.com/embed/hEALdS4xMQU?playlist=hEALdS4xMQU&loop=1&controls=1&fs=1&modestbranding=1&cc_load_policy=0&rel=0&autoplay=1&playsinline=0");
	}

function hj_intro(){
	open_url("//"+(is_touch_device()?"get":"try")+".hearty.me/?utm_source=website&utm_medium=footer&utm_campaign=bd");
}

function hj_share_page(){
	var url = "https://go.hearty.me/BD", 
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
		alertify.prompt('<i class="fal fa-link"></i> 本頁網址/QRcode：<br><br><a href="'+qrcode+'" download="合作夥伴服務中心 QRcode"><img src="'+qrcode+'"></a>', function(e){
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

function redeem_tutorial(on){
	var $r = $(".redeem_tutorial"), 
		r = {
			1: "一、手動輸入序號", 
			2: "二、點選兌換連結"
		};

	if(!on){
		$r.fadeOut();
	}
	else if($r.length>0){
		$r.fadeIn();
	}
	else{
		var video_url = [
			"//i.hearty.app/b/videos/voucher_redeem", 
			(check_OS("iOS") ? "#t=0.001" : "") // muffinman.io/blog/hack-for-ios-safari-to-display-html-video-thumbnail/
		];

		// imgur.com/a/vVlUUVX
		$("<section>", {
			class: "redeem_tutorial", 
			html: Object.keys(r).map(function(i){
				return $("<div>", {
					title: r[i], 
					html: $("<video>", {
						controls: "", 
						controlsList: "nodownload noplaybackrate", 
						muted: "", 
						preload: "", 
						disablePictureInPicture: "", 
						html: $("<source>", {
							src: video_url[0]+i+".webm"+video_url[1], 
							type: "video/webm"
						}).add(
							$("<source>", {
								src: video_url[0]+i+".mp4"+video_url[1], 
								type: "video/mp4"
							})
						)
					}).on("play", function(){
						if(this.requestFullscreen) this.requestFullscreen();
					}).on("click", function(e){
						e.stopPropagation();
					})
				});
			})
		}).on("click", function(){
			redeem_tutorial(false);
		}).appendTo("body");
	}
}

function hj_testimonials(){
	if($(".tr-widget").length>0)
		$.ajax({
			type: "GET", 
			dataType: "script", 
			url: "//cdn.trust.reviews/widget/embed.min.js", 
			cache: true, 
			scriptCharset: "utf-8"
		});

	$(".rating>div,.tr-widget").on("click", function(){
		open_url("//get.hearty.me/reviews");
	});
}
