"use strict";

var btn_alias = "img";

// 相片載入後淡入；破圖不顯示（capture 才能收到 img的 load/error事件）
document.addEventListener("load", function(e){
	let el = e.target;
	if(el.tagName=="IMG" && el.closest(".img_wall")) el.parentNode.classList.add("img-loaded");
}, true);
document.addEventListener("error", function(e){
	let el = e.target;
	if(el.tagName=="IMG" && el.closest(".img_wall")) el.parentNode.remove();
}, true);

hj_getScript("//cdn.jsdelivr.net/npm/@webcreate/infinite-ajax-scroll@3.1.0/dist/infinite-ajax-scroll.min.js").then(function(){
	$(function(){
		let ias = new InfiniteAjaxScroll(".img_wall", {
				item: ".img_wall > *",
				next: ".pager_next",
				pagination: ".pager",
				bind: false,
				spinner: {
					element: ".bouncingLoader",
					delay: 600
				}
			});

		ias.on("append", function(e){
			// 跨頁同月份，移除重複的月份標題
			let first = e.items[0],
				last = $(".img_wall .img_month").last()[0];
			if(first && last && first.classList.contains("img_month") && first.dataset.month==last.dataset.month){
				e.items = e.items.slice(1);
			}
			img_month_label(e.items);

			// masonry：插入後待圖片載入、排版完成，才繼續下一頁
			// 於實際插入時才判斷版型，避免載入下一頁期間切換版型
			let appendFn = e.appendFn;
			e.appendFn = (items, parent, last) => {
				appendFn(items, parent, last);
				if(img_layout()=="masonry") return img_masonry_layout(items);
			};
		});
		ias.on("appended", function(e){
			if(e["items"].length==0) $(".no_more").fadeIn();
		});

		(img_layout()=="masonry" ? img_masonry_layout(".img_wall") : Promise.resolve()).then(function(){
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
	$(".img_layout [data-img_layout]").on("click", function(){
		img_layout_set(this.dataset.img_layout);
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

	img_month_label($(".img_wall > .img_month"));

	document.title = _h("I-title")+" | 💝 Hearty Journal 溫度日記";
});

// 月份標題：data-month="2026-10" → 依語系顯示（如：2026年10月）
function img_month_label(el){
	$(el).filter(".img_month").each(function(){
		let m = (this.dataset.month||"").split("-");
		this.textContent = new Date(m[0], m[1]-1, 1).toLocaleDateString(hj_lang(), {
			year: "numeric",
			month: "long"
		});
	});
}

// 版型：grid（預設）/ masonry
function img_layout(){
	return $(".img_wall").attr("data-layout") || "grid";
}
function img_layout_set(layout){
	let $wall = $(".img_wall");
	if(layout==img_layout()) return;

	setcookie("img_layout", layout, 365);
	$(".img_layout [data-img_layout]").removeClass("active").filter("[data-img_layout='"+layout+"']").addClass("active");

	// 立即回頂：html 設有 scroll-behavior: smooth，平滑捲動會與重新排版同時進行而卡頓
	window.scrollTo({top: 0, behavior: "instant"});

	if(layout=="masonry"){
		let $body = $("body"),
			wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

		// 轉場動畫：masonry 排版較耗時，以免畫面停住
		$body.addClass("loading");

		// 待轉場動畫繪出後再排版
		requestAnimationFrame(() => requestAnimationFrame(() => {
			// 改為立即載入：lazy 圖片在排版前疊於頂部，可能永遠不載入
			$wall.find("img").attr("loading", "eager");
			$wall.attr("data-layout", layout);

			// 排版完成即結束（未載入的圖片多時最多等 1.5 秒），且至少顯示 300ms 避免一閃而過
			Promise.all([
				Promise.race([img_masonry_layout($wall[0]), wait(1500)]),
				wait(300)
			]).finally(() => $body.removeClass("loading"));
		}));
	}
	else{
		img_masonry_destroy();
		$wall.attr("data-layout", layout);
		$("body").removeClass("loading"); // masonry 排版中途切回時，一併結束轉場
	}
}

// masonry 套件：僅在需要時載入
var msnry, msnry_gen = 0, msnry_libs;
function img_masonry_libs(){
	return msnry_libs = msnry_libs || Promise.resolve(hj_getScript("//cdn.jsdelivr.net/combine/npm/masonry-layout@4.2.2/dist/masonry.pkgd.min.js,npm/imagesloaded@5.0.0/imagesloaded.pkgd.min.js")).catch((e) => {
		msnry_libs = null; // 載入失敗，下次重試
		throw e;
	});
}

function img_masonry_layout(el){
	// 切換版型後，進行中的排版一律中止
	let gen = msnry_gen;

	return img_masonry_libs().then(() => {
		if(gen!=msnry_gen) return;

		if(!msnry){
			msnry = new Masonry(".img_wall", {
				itemSelector: ".img_wall .msnry-item",
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
			if(gen!=msnry_gen) return;
			let ready = [];
			while(pending.length && pending[0].dataset.loaded) ready.push(pending.shift());
			ready = ready.filter(f => f.isConnected);
			if(ready.length==0) return;
			ready.forEach(f => f.classList.add("msnry-item"));
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
	});
}

function img_masonry_destroy(){
	msnry_gen++;
	if(msnry){
		msnry.destroy(); // 清除 inline 定位
		msnry = null;
	}
	$(".img_wall figure").removeClass("msnry-item").removeAttr("data-loaded");
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
