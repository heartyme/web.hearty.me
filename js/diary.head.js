function open_book(o){
	var opened = $(".bk-viewinside").length>0, 
		o = o || !opened, 
		$t = $(".editor_toolbelt");
	if(o!==opened){
		$(".bk-read").click();
		if(is_touch_device()){
			if(o) $t.slideDown("normal");
			else $t.slideUp("fast");
		}
	}
	if(!o) $(".bk-page, .bk-cover-back .catalog").scrollTop(0);
	return o!==opened;
}

function popup_toggle(o, toggle){
	if(!(toggle||"").length) return; // 避免空值引發錯誤

	var el = toggle=="image-zoom" ? ".image-zoom" : ".popup-underlayer, .popup."+toggle;
	if(o){
		$(el).fadeIn();
		$(".popup-underlayer").attr({onclick: "popup_toggle(!1,'"+toggle+"')"}).children("div").scrollTop(0);
		// Esc
		$(document).on("keydown", function(e){
			if(e.keyCode==27) popup_toggle(false, toggle);
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
	var $b = $(".bk-list");
	if(b) $b.addClass("blur");
	else $b.removeClass("blur");
	$("body").scrollTop(0).css({overflow: b ? "hidden" : "auto"});
}

function notifications_toggle(o){
	popup_toggle(o, "notifications");
	if(o){
		$(".mh-head .fa-bell").attr("data-count", 0);
		$(".popup.notifications").delay(2000).queue(function(){
			hj_update({action: "notifications_read"});
			// if($(this).is(":visible")){ // 維持展開超過 2秒才已讀
				$(this).find("li").attr("data-unread", 0);
				var $i = $('link[rel="shortcut icon"]');
				$i.attr({href: $i.attr("data-a")});
			// }
			$(this).dequeue();
		});

		if(typeof notifications_toggled=="function")
			notifications_toggled();

		if(!!window.hj_username) hj_fcm_init();

		ga_evt_push("Notification Toggle", {
			event_category: "Notifications", 
			event_label: "Notification Toggle"
		});
	}
}

// 通知
function notifications_query(lastest, callback){
	hj_update({
		action: "notifications_query", 
		lastest: lastest || 0
	}).then(function(r){
		if(r["Status"]==1){
			var $li = r["Values"]["notifications"].map(function(n){
				return {
					notification_id: n["notification_id"], 
					msg: n["message"+(/zh/i.test(hj_lang()) ? "" : "_en")], 
					clk: n["onclick"], 
					unread: n["unread"], 
					icon: n["icon"], 
					date: date_format(n["ts"] || "")
				};
			});
			notifications_new($li, !0);
		}
		callback = callback || function(){}; callback();
	});
}

function notifications_click(notification_id){
	notifications_toggle(false);
	ga_evt_push("Notification Click", {
		event_category: "Notifications", 
		event_label: "Notification Click"
	});
}

function notifications_new(ls, tobottom){
	ls = ls || [];
	var $ul = $(".popup.notifications ul"), 
		$li = [];
	ls.forEach(function(li){
		$li.push(
			$("<li>", {
				title: li.msg, 
				onclick: "notifications_click(this.dataset.notification_id);"+("clk" in li ? li.clk : ""), 
				"data-unread": "unread" in li ? li.unread : "", 
				"data-date": "date" in li ? li.date || date_format() : "", 
				"data-notification_id": "notification_id" in li ? li.notification_id : 0,
			}).text(li.msg).prepend(
				$("<i>", {class: "icon" in li && li["icon"].length>0 ? li["icon"] : "far fa-envelope-open"})
			)
		)
	});

	// 新的在後
	if(tobottom){
		var $pinned = $ul.find("li[data-pinned]");
		if($pinned.length>0) $pinned.filter(":first").before($li);
		else $ul.append($li);
	}
	// 新的在前
	else{
		$ul.prepend($li);
	}

	var unread = $ul.find("li[data-unread='1']").length, 
		$i = $('link[rel="shortcut icon"]');
	if(unread>0) $i.attr("href", $i.attr("data-b"));
	$(".mh-head .fa-bell").attr("data-count", unread);
	return ls.length;
}
