"use strict";

var btn_alias = "img";

hj_getScript("//cdn.jsdelivr.net/combine/npm/@webcreate/infinite-ajax-scroll@3.1.0/dist/infinite-ajax-scroll.min.js,npm/masonry-layout@4.2.2/dist/masonry.pkgd.min.js,npm/imagesloaded@5.0.0/imagesloaded.pkgd.min.js").then(function(){
	$(function(){
		var ias = new InfiniteAjaxScroll(".img_wall", {
				item: ".img_wall figure", 
				next: ".pager_next", 
				pagination: ".pager", 
				bind: false, 
				spinner: {
					element: ".bouncingLoader", 
					delay: 600
				}
			});

		ias.on("append", function(e){
				let appendFn = e.appendFn;
				e.appendFn = (items, parent, last) => {
				return new Promise((resolve) => {
					appendFn(items, parent, last);
					imagesLoadedAndLayout(items).then(resolve);
				});
			};
		});
		ias.on("appended", function(e){
			if(e["items"].length==0) $(".no_more").fadeIn();
		});

		imagesLoadedAndLayout(".img_wall").then(function(){
			ias.bind();
		});

		$(".pager").hide().delay(1000).queue(function(){
			// 自動緩滑
			if($(".img .vip_only").length>0) img_carousel();
			$(this).dequeue();
		});
	});
});

$(function(){
	$(".mh-head .left").on("click", function(){
		nav_toggle($(".menu"), true);
	});
	$(".nav_btn[data-gotop]").on("click", function(){
		img_scrolltop();
	});
	$(".nav_btn[data-add],.img_empty").on("click", function(){
		hj_href("d?img=1");
	});
	$(".vip_only").on("click", function(){
		hj_href("d?plans=1");
	}); 
	$(document).on("click", ".img_wall img[data-post_id]", function(){
		read_post(this.dataset.post_id);
	});
	post_font();

	document.title = _h("I-title")+" | 💝 Hearty Journal 溫度日記";
});

let msnry;
function imagesLoadedAndLayout(el){
	if(!msnry){
		msnry = new Masonry(".img_wall", {
			itemSelector: ".img_wall .img-loaded", 
			columnWidth: 24, 
			gutter: 20, 
			percentPosition: true, 
			transitionDuration: "0.3s"
			// resize: false
		});
	}

	return new Promise((resolve) => {
		imagesLoaded(el).on("progress", (imgLoad, e) => {
			e.img.parentNode.classList.add("img-loaded");
			msnry.appended(e.img.parentNode);
			msnry.layout();
		}).on("done", () => {
			msnry.once("layoutComplete", () => {
				resolve();
			});
		});
	});
}

function img_carousel(t){
	t = t || 30000;

	$("html,body").stop().animate({
		scrollTop: $(".bouncingLoader").offset().top
	}, t, function(){
		$(this).animate({
			scrollTop: 0
		}, t, function(){
			img_carousel(t);
		});
	});
}

function img_scrolltop($e){
	($e||$("html,body")).stop().scrollTop(0);
}

function read_post(post_id){
	post_id = post_id || 0;
	if(post_id<1 || typeof hj_username=="undefined"){
		hj_href("account");
	}
	else{
		var u = hj_username+"/"+post_id;
		if(/iOS|Android/i.test(check_hjapp())) window.open(location.origin+"/"+u, "_blank");
		else hj_href(u);
	} 
}
