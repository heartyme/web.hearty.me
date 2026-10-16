"use strict";

var btn_alias = "img";

hj_getScript("//cdn.jsdelivr.net/combine/npm/@webcreate/infinite-ajax-scroll@3.1.0/dist/infinite-ajax-scroll.min.js,npm/masonry-layout@4.2.2/dist/masonry.pkgd.min.js,npm/imagesloaded@5.0.0/imagesloaded.pkgd.min.js").then(function(){
	$(function(){
		let ias = new InfiniteAjaxScroll(".img_wall", {
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

var msnry;
function imagesLoadedAndLayout(el){
	if(!msnry){
		msnry = new Masonry(".img_wall", {
			itemSelector: ".img_wall .img-loaded",
			columnWidth: ".img_wall figure",
			gutter: 20,
			percentPosition: true,
			transitionDuration: 0 // 淡入交給 CSS
			// resize: false
		});
	}

	// 依 DOM 順序放出已載入的連續段；只 appended 不 layout，舊圖不會移動
	let pending = $(el).find("figure").addBack("figure").get(), raf = 0;
	const flush = () => {
		raf = 0;
		let ready = [];
		while(pending.length && pending[0].dataset.loaded) ready.push(pending.shift());
		ready = ready.filter(f => f.isConnected);
		if(ready.length==0) return;
		ready.forEach(f => f.classList.add("img-loaded"));
		msnry.appended(ready);
	};

	return new Promise((resolve) => {
		imagesLoaded(el).on("progress", (imgLoad, e) => {
			let f = e.img.closest("figure");
			if(!f) return;
			f.dataset.loaded = 1;
			if(!e.isLoaded) f.remove(); // 破圖不顯示
			raf = raf || requestAnimationFrame(flush);
		}).on("always", () => {
			// 有破圖時 done 不會觸發，改用 always
			cancelAnimationFrame(raf);
			flush();
			resolve();
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
		let u = hj_username+"/"+post_id;
		if(/iOS|Android/i.test(check_hjapp())) window.open(location.origin+"/"+u, "_blank");
		else hj_href(u);
	} 
}
