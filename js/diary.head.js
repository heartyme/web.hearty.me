// 開闔日記本；o 為空時切換。回傳是否有變更
function open_book(o){
	const opened = $(".bk-viewinside").length>0;
	o = o || !opened;
	if(o!==opened){
		$(".bk-list .bk-book").toggleClass("bk-viewinside", o).toggleClass("bk-default", !o).removeClass("bk-filp");
		if(is_touch_device()){
			const $t = $(".editor_toolbelt");
			o ? $t.slideDown("normal") : $t.slideUp("fast");
		}
	}
	if(!o) $(".bk-page, .bk-cover-back .catalog").scrollTop(0);
	return o!==opened;
}

function popup_toggle(o, toggle){
	if(!(toggle||"").length) return; // 避免空值引發錯誤

	const el = toggle=="image-zoom" ? ".image-zoom" : ".popup-underlayer, .popup."+toggle;
	if(o){
		$(el).fadeIn();
		$(".popup-underlayer").attr({onclick: "popup_toggle(!1,'"+toggle+"')"}).children("div").scrollTop(0);
		// Esc
		$(document).on("keydown", e => {
			if(e.keyCode==27) popup_toggle(!1, toggle);
		});
	}
	else{
		$(el).hide();
		$(document).off("keydown");
	}
	bk_blur(o);

	if(typeof hj_editor_history=="function")
		hj_editor_history(o ? "add" : "detach", "[popup_toggle]"+toggle);
}

function bk_blur(b){
	$(".bk-list").toggleClass("blur", !!b);
	$("body").scrollTop(0).css({overflow: b ? "hidden" : "auto"});
}

// 切換網站圖示（data-a：一般；data-b：有未讀）
function favicon_swap(attr){
	const $i = $('link[rel="shortcut icon"]');
	$i.attr("href", $i.attr(attr));
}

function notifications_toggle(o){
	popup_toggle(o, "notifications");
	if(!o) return;

	$(".mh-head .fa-bell").attr("data-count", 0);
	$(".popup.notifications").delay(2000).queue(function(){
		hj_update({action: "notifications_read"});
		$(this).find("li").attr("data-unread", 0);
		favicon_swap("data-a");
		$(this).dequeue();
	});

	if(typeof notifications_toggled=="function")
		notifications_toggled();

	if(window.hj_username) hj_fcm_init();

	ga_evt_push("Notification Toggle", {
		event_category: "Notifications",
		event_label: "Notification Toggle"
	});
}

// 通知
function notifications_query(lastest, callback){
	hj_update({
		action: "notifications_query",
		lastest: lastest || 0
	}).then(r => {
		if(r.Status==1){
			const msg = "message"+(/zh/i.test(hj_lang()) ? "" : "_en");
			notifications_new(r.Values.notifications.map(n => ({
				notification_id: n.notification_id,
				msg: n[msg],
				clk: n.onclick,
				unread: n.unread,
				icon: n.icon,
				date: date_format(n.ts || "")
			})), !0);
		}
		if(callback) callback();
	});
}

function notifications_click(notification_id){
	notifications_toggle(!1);
	ga_evt_push("Notification Click", {
		event_category: "Notifications",
		event_label: "Notification Click"
	});
}

function notifications_new(ls, tobottom){
	ls = ls || [];
	const $ul = $(".popup.notifications ul"),
		$li = ls.map(li =>
			$("<li>", {
				title: li.msg,
				onclick: "notifications_click(this.dataset.notification_id);"+("clk" in li ? li.clk : ""),
				"data-unread": "unread" in li ? li.unread : "",
				"data-date": "date" in li ? li.date || date_format() : "",
				"data-notification_id": "notification_id" in li ? li.notification_id : 0
			}).text(li.msg).prepend(
				$("<i>", {class: "icon" in li && li.icon.length>0 ? li.icon : "far fa-envelope-open"})
			)
		);

	// 新的在後（置頂通知之前）
	if(tobottom){
		const $pinned = $ul.find("li[data-pinned]");
		$pinned.length>0 ? $pinned.first().before($li) : $ul.append($li);
	}
	// 新的在前
	else $ul.prepend($li);

	const unread = $ul.find("li[data-unread='1']").length;
	if(unread>0) favicon_swap("data-b");
	$(".mh-head .fa-bell").attr("data-count", unread);
	return ls.length;
}
