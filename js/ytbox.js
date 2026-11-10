"use strict";

var yt_player,
	YTBOX_DEFAULT_VIDEO = "vYFnZdUiUyg";

function onYouTubeIframeAPIReady(){
	yt_player = new YT.Player("yt_player", {
		host: "https://www.youtube-nocookie.com",
		videoId: YTBOX_DEFAULT_VIDEO,
		events: {
			onReady: function(e){
				e.target.setVolume(50);
				yt_player.current_video = 0;
			},
			onStateChange: function(e){
				if(e.data!=YT.PlayerState.ENDED) return;

				// 播完接下一首，最後一首則回到第一首
				var $ls = $(".yt_list");
				if(yt_player.current_video<$ls.find("li[data-yt]").length-1){
					yt_player.current_video++;
				}
				else{
					yt_player.current_video = 0;
					$ls.scrollTop(0);
				}
				ytbox_play();
			}
		}
	});
}

function ytbox_play(){
	var $li = $(".yt_list li[data-yt]"),
		$current = $li.eq(yt_player.current_video);

	if("loadVideoById" in yt_player){ // Error Handling
		yt_player.loadVideoById({
			videoId: $current.attr("data-yt"),
			suggestedQuality: "large"
		});
	}
	$li.removeAttr("data-playing");
	$current.attr("data-playing", "");
}

function ytbox_toggle(o, yt){
	var $box = $(".ytbox");
	if($box.data("init")==null){
		$("<iframe>", {
			id: "yt_player",
			src: "//www.youtube-nocookie.com/embed/"+(yt || YTBOX_DEFAULT_VIDEO)+"?"+$.param({
				enablejsapi: 1,
				controls: 1,
				fs: 1,
				modestbranding: 1,
				cc_load_policy: 1,
				rel: 0,
				autoplay: 0,
				playsinline: 1
			}),
			allow: "fullscreen;autoplay;encrypted-media;picture-in-picture"
		}).appendTo(".yt_player>div:first-child");
		hj_video("load_player_api");

		ytbox_query();
		$(".yt_list ol").sortable({
			items: "> li",
			axis: "y",
			cursor: "row-resize",
			scroll: true,
			handle: ".arr",
			placeholder: "dragging",
			start: function(){
				$(this).children("li").attr("data-opacity", "");
			},
			stop: function(){
				$(this).children("li").removeAttr("data-opacity");
			},
			update: ytbox_sorting,
			change: function(){
				$("li.dragging").css({margin: 0}).delay(10).queue(function(){
					$(this).css({margin: "10px auto"}).dequeue();
				});
			}
		})
		// 須綁在 sortable 之後：拖曳排序放開時，sortable 會先攔下該次 click，不觸發播放
		.on("click", function(e){
			var $t = $(e.target),
				$li = $t.closest("li", this);
			if(!$li.length) return;

			if($t.closest("[data-delete]").length){
				e.stopPropagation();
				ytbox_detach($li.attr("data-play_id"));
			}
			else if(window.yt_player && "current_video" in yt_player){
				yt_player.current_video = $li.index();
				ytbox_play();
			}
			else if(hj_lang_zhcn()){
				ytbox_cn();
			}
		})
		.disableSelection();

		$box.data("init", 1);
	}

	popup_toggle(o, "ytbox");
	if(o) saved(false); // onbeforeunload

	var t = "YTbox "+(o ? "Open" : "Close");
	ga_evt_push(t, {
		event_category: t,
		event_label: t
	});
}

function ytbox_sorting(){
	var play_ids = $(".yt_list li[data-yt]").map(function(){
		return Number($(this).attr("data-play_id"));
	}).get();
	if(play_ids.length<2) return;

	hj_update({
		action: "ytbox_sorting",
		videos: JSON.stringify(play_ids)
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				ytbox_ga("Video Sorting");
			break;
			case 2:
				signin_required();
			break;
		}
	});
}

function ytbox_add(yt){
	var $yt = $(".yt_list"),
		v = ["nQWFzMvCfLE", "FYjxHPtKihw", "C9ujBoud26k", "bVjedGudN8w", "5IlVfkY5q54", "PfuW-IkgVAY", "HsCp5LG_zNE"];
	yt = yt || v[Math.floor(Math.random()*v.length)];

	// 重新開啟輸入框並晃動提示
	function retry(){
		ytbox_add(""); alertify_input_shake();
	}

	alertify.set({labels: {ok: '<i class="fas fa-plus"></i> '+_h("e-video-3"), cancel: _h("e-no-1")}, buttonReverse: false});
	// alertify.prompt('<i class="fab fa-youtube"></i> '+_h("e-video-0")+'<br>(<a onclick="hj_video(\'upload\')"><i class="far fa-upload"></i> '+_h("e-video-1")+"</a>)", function(e, yt){
	alertify.prompt('<i class="fab fa-youtube"></i> '+_h("e-video-0"), function(e, url){
		if(!e) return;

		var id = YoutubeURLparser(url);
		if(!id){
			msg('<i class="fal fa-video-slash"></i> '+_h("e-video-5"), _h("e-ok-0"), retry);
			return;
		}

		var title = hj_video("get_title", id);
		if(!title){
			if(hj_lang_zhcn()){
				ytbox_cn();
			}
			else{
				alertify.set({labels: {ok: _h("e-video-7")+' <i class="fas fa-external-link-alt"></i>', cancel: _h("e-ok-1")}, buttonReverse: true});
				alertify.confirm('<i class="fal fa-video-slash"></i> '+_h("e-video-6"), function(e){
					if(e) open_url("//www.youtube.com/watch?v="+id);
					retry();
				});
			}
			return;
		}
		title = capitalizeFirstLetter(title) || _h("e-video-4");

		hj_update({
			action: "ytbox_add",
			video: id,
			title: title
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					// 加在最前
					$yt.find("ol").prepend(
						ytbox_create({
							play_id: r["Values"]["play_id"],
							title: title,
							youtube: id
						})
					);
					$yt.scrollTop(0); // 加在最後：$yt.scrollTop($yt.get(0)?.scrollHeight);

					alertify.success('<i class="far fa-play"></i> '+title);
					ytbox_ga("Video Added", "Video_Added");
				break;

				case 2:
					signin_required();
				break;

				default:
					msg();
				break;
			}
		});
	}, "https://youtu.be/"+yt);

	alertify_input_custom({
		type: "url",
		placeholder: _h("e-video-11"),
		onfocus: "select_input_text($(this))",

		/* Autosave after Pasting
		onpaste: "$.wait(50).then(function(){$('.alertify-text').blur()})", // trigger onchange
		*/
		oninput: "if(!!YoutubeURLparser(this.value))$('.alertify-button-ok').trigger('click')"
	});

	ytbox_delete_btns(false);
}

function ytbox_detach(play_id){
	var $li = $(".yt_list li[data-play_id='"+play_id+"']");
	alertify.set({labels: {ok: _h("e-no-0"), cancel: '<i class="fas fa-trash-alt"></i> '+_h("e-video-9")}, buttonReverse: false});
	alertify.confirm('<i class="fal fa-exclamation-triangle"></i> '+_h("e-video-8", {$title: $li.attr("title")}), function(e){
		if(e) return; // 「刪除」為 cancel 鍵

		hj_update({
			action: "ytbox_detach",
			play_id: play_id
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					$li.slideUp("fast", function(){
						$(this).remove();
					});
					hj_vibrate(30);
					ytbox_ga("Video Detach");
				break;

				case 2:
					signin_required();
				break;
			}
			ytbox_delete_btns();
		});
	});
}

function ytbox_query(){
	hj_update({
		action: "ytbox_query"
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				$(".yt_list ol").empty().append(
					r["Values"]["videos"].map(function(v){
						return ytbox_create({
							play_id: v["play_id"],
							title: htmlDecode(v["title"]),
							youtube: v["youtube"]
						});
					})
				).attr("data-empty", _h("e-yt-4"));
			break;

			case 2:
				signin_required();
			break;
		}
	});
}
	function ytbox_create(v){
		return $("<li>", {
			title: v["title"],
			"data-play_id": v["play_id"],
			"data-yt": v["youtube"],
			html: $("<span>", {class: "arr", title: _h("e-yt-1")}).add(
				$("<span>", {"data-delete": "", title: _h("e-yt-2")})
			)
		});
	}
	function ytbox_delete_btns(o){
		var $d = $(".yt_list li [data-delete]");
		if(o==null) $d.toggle();
		else if(o) $d.fadeIn();
		else $d.fadeOut();
	}
	function ytbox_ga(evt, label){
		ga_evt_push(evt, {
			event_category: "YTbox",
			event_label: label || evt
		});
	}

	function ytbox_intro(){
		msg('<i class="fas fa-music"></i> '+_h("e-yt-5"));
	}
	function ytbox_cn(){
		msg('<i class="far fa-exclamation-circle"></i> 如位于中国，需翻牆才能观看油管视频', " Σヽ(ﾟД ﾟ; )ﾉ ");
	}

function ytbox_lightoff(){
	var $mask = $(".mask");
	if(!$mask.length){
		$mask = $("<div>", {class: "mask"}).appendTo("body");
		$mask.on("click", function(){
			$(this).hide();
		});
		$mask[0].addEventListener("touchmove", function(){
			$(this).hide();
		}, {passive: true});
	}
	$mask.show();
}
