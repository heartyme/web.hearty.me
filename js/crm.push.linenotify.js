"use strict";

$(function(){
	get_sent_stats();

	window.onbeforeunload = function(){
		return false;
	};

	$(document).scroll(function(){
		var $u = $(".notify .page_up");
		if($(this).scrollTop()>200) $u.stop().fadeIn("slow");
		else $u.stop().fadeOut("slow");
	});

	if(!!getUrlPara("order_id")) $("select[data-template]").val("unpaid_order").change();
});

function hj_update__push(d){
	return $.ajax({
		url: location.href, 
		type: "post", 
		crossDomain: true, 
		dataType: "json", 
		data: d, 
		async: true, 
		timeout: 10000, 
		xhrFields: {withCredentials: true}
	});
}

function get_sent_stats(){
	hj_update__push({
		action: "get_sent_stats"
	}).then(function(r){
		r = r["Values"];
		$("[data-sent_stats]").text(r["date"]+" 午夜起，已寄給 "+numberWithCommas(r["users_sent"]||0)+"人，共 "+numberWithCommas(r["pushs_sent"]||0)+"則");
	});
}

function get_recipients(){
	var $recipients = $(".recipients"), 
		uid_selection = parseInt($("input[name='uid_selection']:checked").val() || 0), 
		uid_interval = $("input[data-uid_interval]").map(function(){return parseInt(this.value || 1);}).get().sort(), 
		uid_listed = $("textarea[data-uid_listed]").val().split(",").map(function(u){return parseInt(u.trim())||1}).sort();

	$recipients.slideUp("fast");
	$(".recipient_data .result").empty();

	hj_update__push({
		action: "get_recipients", 
		uid_interval: uid_selection==0 ? JSON.stringify(uid_interval) : "", 
		uid_listed: uid_selection==1 ? JSON.stringify(uid_listed) : ""
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				r = r["Values"];
				$recipients.empty();
				for(var user_id in r){
					var u = r[user_id];
					for(var t in u["tokens"]){
						var username = u["username"], 
							sent_today = parseInt(u["tokens"][t]["sent_today"]);

						$("<li>", {
							onclick: sent_today>0 ? 
								"alertify.error('* 略過寄送 #"+username+"')" : 
								"send_push(false,$(this))", 
							title: username, 
							"data-username": u["username"], 
							"data-nickname": u["nickname"], 
							"data-access_token": u["tokens"][t]["access_token"], 
							"data-device": 5, 
							"data-sent_today": sent_today
						}).appendTo($recipients);
					}
				}

				$recipients.slideDown("fast", function(){
					$("html, body").scrollTop($recipients.get(0).offsetTop-50);
				});
			break;

			case 2:
				$recipients.show();
				msg("<i class='far fa-exclamation-triangle'></i> 有資料漏填，或未選擇任何裝置");
			break;
		}
	}).fail(function(e){
		msg("<i class='far fa-exclamation-triangle'></i> 發生異常：<br>"+JSON.stringify(e));
	});
}

function send_push(bulk, $btn){
	bulk = bulk || false;
	$btn = $btn==null ? $(".recipients li[data-sent_today='0']:first") : $btn;
	if(!$btn.length) return false;

	var d = $btn.get(0).dataset, 
		$push = $(".push_data"), 
		push = {
			body: ($push.find("[data-body]").val() || "").trim(), 
			image: ($push.find("[data-image]").val() || "").trim(), 
			stickerid: parseInt($push.find("[data-stickerid]").val()) || "", 
			stickerid2: parseInt($push.find("[data-stickerid2]").val()) || "", 
			access_token: (d["access_token"] || "").trim(), 
			username: (d["username"] || "").trim(), 
			nickname: (d["nickname"] || "").trim()
		};

	if(push["body"].length<4){
		msg("<i class='far fa-exclamation-triangle'></i> 沒有填寫推播訊息"); return false;
	}

	push["body"] = push["body"]
		.replace(/\{{username}}/g, push["username"])
		.replace(/\{{nickname}}/g, push["nickname"]);

	if(bulk){
		send_push_exec(push, bulk, $btn);
	}
	else{
		alertify.set({labels: {ok: "取消", cancel: "<i class='fas fa-inbox-out'></i> 發送"}, buttonReverse: false});
		alertify.confirm("<i class='far fa-comment-lines'></i> 即將推播予："+push["nickname"]+" ("+push["username"]+")", function(e){
			if(!e) send_push_exec(push, bulk, $btn);
		});
	}
}
	function send_push_exec(push, bulk, $btn){
		hj_update__push({
			action: "send_push", 
			push: JSON.stringify(push)
		}).then(function(r){
			var v = r["Values"];
			switch(r["Status"]){
/*
{"Status":0,"Values":{"status":400,"message":"LINE Notify account doesn't join group which you want to send."}}
*/
				case 1:
					console.log(JSON.stringify(r));
				break;

				case 3:
					alertify.error('<i class="fas fa-exclamation-triangle"></i> 略過重複寄發：'+push["username"]);
				break;

				case 4:
					alertify.error("<i class='far fa-comment-alt-times'></i> token 過期廢止");
				break;

				default:
					msg("<i class='far fa-exclamation-triangle'></i> 推播失敗<br>："+JSON.stringify(r) );
				break;
			}

			if(bulk){
				var $btn_next = $btn.nextAll("[data-bulk='"+$btn.attr("data-bulk")+"']").eq(0);

				if($btn_next.length>0){
					send_push(bulk, $btn_next);
				}
				else if(!$(".recipients li[data-sent_today='0']").length){
					get_sent_stats();
					msg("<i class='far fa-comments-alt'></i> 批次推播完成", "好耶", function(){
						$("html, body").scrollTop(0);
					});
				}
			}
			$btn.remove();

			$("<ol>", {
				title: push["nickname"], 
				onclick: "$(this).fadeOut('fast')", 
				"data-username": push["username"], 
				"data-success": +(r["Status"]==1), 
				html: $("<li>", {"data-device": 5, text: push["username"]})
						.add($("<li>", {text: push["body"]}))
			}).prependTo($(".result")).fadeIn();
		}).fail(function(e){
			msg("<i class='far fa-exclamation-triangle'></i> 發生異常：<br>"+JSON.stringify(e));
		});
	}

	function send_push_bulk(){
		var $d = $(".recipients li[data-sent_today='0']"), 
			d = $d.length;

		if(d>0){
			alertify.set({labels: {ok: "取消", cancel: "<i class='fas fa-inbox-out'></i> 確定群發"}, buttonReverse: false});
			alertify.confirm("<i class='fal fa-comments-alt'></i> 即將推播至 "+d+"部用戶裝置", function(e){
				if(!e){
					// ref: stackoverflow.com/a/3672400
					send_push(true, $d.odd().attr({"data-bulk": "odd"}).eq(0) );
					send_push(true, $d.even().attr({"data-bulk": "even"}).eq(0) );
				}
			});
		}
		else{
			msg("<i class='far fa-exclamation-triangle'></i> 沒有可發送的裝置，請先行查詢");
		}
	}
	function filter_finished(hide){
		var $r = $(".recipients");
		if(!hide) $r.removeClass("unfinished");
		else $r.addClass("unfinished");
	}

function empty_recipients(){
	$(".recipients").slideUp("fast", function(){
		$(this).empty().show();
	});
}
function filter_all(max_user_id){
	var $u = $(".user_data [data-uid_interval]");
	$u.filter(":eq(0)").val(1).attr({max: max_user_id});
	$u.filter(":eq(1)").val(max_user_id).attr({max: max_user_id});
}
function uid_toggle(mode, mode_text){
	$(".user_data tr").attr("data-off", "").filter(".uid_"+mode).removeAttr("data-off");
	alertify.success("<i class='fas fa-filter'></i> "+mode_text+"模式");
}