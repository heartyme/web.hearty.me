"use strict";

var yt_player;

function onYouTubeIframeAPIReady(){
	yt_player = new YT.Player("yt_player", {
		host: "https://www.youtube-nocookie.com", 
		videoId: "vYFnZdUiUyg", 
		events: {
			onReady: function(e){
				e.target.setVolume(50);
				yt_player.current_video = 0;
			}, 
			onStateChange: function(e){
				if(e.data==YT.PlayerState.ENDED){
					var $ls = $(".yt_list");
					if(yt_player.current_video<($ls.find("li[data-yt]").length-1)){
						yt_player.current_video++;
					}
					else{
						yt_player.current_video = 0;
						$ls.scrollTop(0);
					}
					ytbox_play();
				}
			}
		}
	});
}

function ytbox_play(){
	var $li = $(".yt_list li[data-yt]"), 
		$current = $li.eq(yt_player.current_video), 
		v = $current.attr("data-yt");

	if("loadVideoById" in yt_player){ // Error Handling
		yt_player.loadVideoById({
			"videoId": v, 
			"suggestedQuality": "large"
		});
	}
	$li.removeAttr("data-playing");
	$current.attr("data-playing", "");
}

function ytbox_toggle(o, yt){
	if($(".ytbox").data("init")==null){
		yt = yt || "vYFnZdUiUyg";
		$("<iframe>", {
			id: "yt_player", 
			src: "//www.youtube-nocookie.com/embed/"+yt+"?"+ $.param({
				enablejsapi: 1, 
				controls: 1, 
				fs: 1, 
				modestbranding: 1, 
				cc_load_policy: 1, 
				rel: 0, 
				autoplay: 0, 
				playsinline: 1
			}), 
			allow: "autoplay;encrypted-media;picture-in-picture", 
			allowfullscreen: ""
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
			update: function(){
				ytbox_sorting();
			}, 
			change: function(){
				$("li.dragging").css({margin: 0}).delay(10).queue(function(){
					$(this).css({margin: "10px auto"}).dequeue();
				});
			}
		}).disableSelection();

		$(".ytbox").data("init", 1);
	}

	popup_toggle(o, "ytbox");
	if(o) saved(false); // onbeforeunload

	var t = o ? "Open" : "Close";
	ga_evt_push("YTbox "+t, {
		event_category: "YTbox "+t, 
		event_label: "YTbox "+t
	});
}

function ytbox_sorting(){
	var play_ids = $(".yt_list li[data-yt]").map(function(){
			return Number($(this).attr("data-play_id"))
		}).toArray();
	if(play_ids.length>1){
		hj_update({
			action: "ytbox_sorting", 
			videos: JSON.stringify(play_ids)
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					ga_evt_push("Video Sorting", {
						event_category: "YTbox", 
						event_label: "Video Sorting"
					});
				break;
				case 2:
					signin_required();
				break;
			}
		});
	}
}

function ytbox_add(yt){
	var $yt = $(".yt_list"), 
		$ol = $yt.find("ol"), 
		v = ["nQWFzMvCfLE", "FYjxHPtKihw", "C9ujBoud26k", "bVjedGudN8w", "5IlVfkY5q54", "PfuW-IkgVAY", "HsCp5LG_zNE"];
	yt = yt || v[Math.floor(Math.random()*v.length)];

	alertify.set({labels: {ok: '<i class="fas fa-plus"></i> '+_h("e-video-3"), cancel: _h("e-no-1")}, buttonReverse: false});
	// alertify.prompt('<i class="fab fa-youtube"></i> '+_h("e-video-0")+'<br>(<a onclick="hj_video(\'upload\')"><i class="far fa-upload"></i> '+_h("e-video-1")+"</a>)", function(e, yt){
	alertify.prompt('<i class="fab fa-youtube"></i> '+_h("e-video-0"), function(e, yt){
		if(e){
			yt = YoutubeURLparser(yt);
			if(!yt){
				msg('<i class="fal fa-video-slash"></i> '+_h("e-video-5"), _h("e-ok-0"), function(){  
					ytbox_add(""); alertify_input_shake();
				});
			}
			else{
				var title = hj_video("get_title", yt);
				if(!title){
					if(hj_lang_zhcn()){
						ytbox_cn();
					}
					else{
						alertify.set({labels: {ok: _h("e-video-7")+' <i class="fas fa-external-link-alt"></i>', cancel: _h("e-ok-1")}, buttonReverse: true});
						alertify.confirm('<i class="fal fa-video-slash"></i> '+_h("e-video-6"), function(e){
							if(e) open_url("//www.youtube.com/watch?v="+yt);
							ytbox_add(""); alertify_input_shake();
						});
					}
					return;
				}
				title = capitalizeFirstLetter(title) || _h("e-video-4");

				hj_update({
					action: "ytbox_add", 
					video: yt, 
					title: title
				}).then(function(r){
					switch(r["Status"]){
						case 1:
							// 加在最前
							$ol.prepend(
								ytbox_btns_binding(
									ytbox_create({
										play_id: r["Values"]["play_id"], 
										title: title, 
										youtube: yt
									})
								)
							);
							
							$yt.scrollTop(0); // 加在最後：$yt.scrollTop($yt.get(0).scrollHeight);

							alertify.success('<i class="far fa-play"></i> '+title);

							ga_evt_push("Video Added", {
								event_category: "YTbox", 
								event_label: "Video_Added"
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
		}
	}, "https://youtu.be/"+yt);

	alertify_input_custom({
		type: "url", 
		placeholder: _h("e-video-11"), 
		onfocus: "select_input_text($(this))", 

		/* Autosave after Pasting
		onpaste: "$.wait(50).then(function(){$('.alertify-text').blur()})", // trigger onchange
		*/
		oninput: "if(!!YoutubeURLparser(this.value))$('.alertify-button-ok').click()"
	});

	ytbox_delete_btns(false);
}

function ytbox_detach(play_id){
	var $li = $(".yt_list li[data-play_id='"+play_id+"']");
	var title = $li.attr("title");
	alertify.set({labels: {ok: _h("e-no-0"), cancel: '<i class="fas fa-trash-alt"></i> '+_h("e-video-9")}, buttonReverse: !1});
	alertify.confirm('<i class="fal fa-exclamation-triangle"></i> '+_h("e-video-8", {$title: title}), function(e){
		if(!e){
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

						ga_evt_push("Video Detach", {
							event_category: "YTbox", 
							event_label: "Video Detach"
						});
					break;

					case 2:
						signin_required();
					break;
				}
				ytbox_delete_btns();
			});
		}
	});
}

function ytbox_query(){
	hj_update({
		action: "ytbox_query"
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				var ls = [], 
					$ol = $(".yt_list ol");
				r["Values"]["videos"].forEach(function(v, order){
					ls.push(
						ytbox_btns_binding(
							ytbox_create({
								play_id: v["play_id"], 
								title: htmlDecode(v["title"]), 
								youtube: v["youtube"]
							})
						)
					);
				});
				$ol.html(ls).attr("data-empty", _h("e-yt-4"));
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
	function ytbox_btns_binding($e){
		$e.on("click", function(){
			if(!!window.yt_player && "current_video" in yt_player){
				yt_player.current_video = $(this).index();
				ytbox_play();
			}
			else if(hj_lang_zhcn()){
				ytbox_cn();
			}
		})
		.find("[data-delete]").on("click", function(e){
			e.stopPropagation();
			ytbox_detach($e.attr("data-play_id"));
		});
		return $e;
	}

	function ytbox_intro(){
		msg('<i class="fas fa-music"></i> '+_h("e-yt-5"));
	}
	function ytbox_cn(){
		msg('<i class="far fa-exclamation-circle"></i> 如位于中国，需翻牆才能观看油管视频', " Σヽ(ﾟД ﾟ; )ﾉ ");
	}

function ytbox_lightoff(){
	if(!$(".mask").length){
		$("<div>", {class: "mask"}).on("click", function(){
			$(this).hide();
		}).appendTo($("body")).get(0).addEventListener("touchmove", function(){
			$(this).hide();
		}, {passive: true})
	}
	$(".mask").show();
}
