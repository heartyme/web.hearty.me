"use strict";

$(function(){
	$(".survey header .notice").hide();
	scroll2focused($(".survey"));
	hj_survey_sortable_init({
		list: $(".survey .sortable"),
		output: $("input[data-gform='403836374']")
	});

	$(".survey [data-gform]").on("change", function(){survey_modified(false);});
	$(".survey [data-gform='497590971']").val(check_browser()+", "+check_OS());
	survey_modified(false);
});

function hj_survey(uri, $selector, callback){
	const $f = ($selector || $("body")).find("[data-gform]"),
		// 有 name 者取同名之集合（radio / checkbox），否則為自身
		group = $t => $t.is("[name]") ? $f.filter("[name='"+$t.attr("name")+"']") : $t;

	// 依序檢查，回傳 truthy 表示不合格（required 回傳整個同名集合）
	const rules = [
		// 必填，檢查 input 本身及有相同 name 的集合是否為空
		["[required]", $t => {
			$t = group($t);
			const v = hj_survey_val($t);
			return (v==null || !v.length) && $t;
		}],
		["[minlength]", $t => {
			const l = $t.val().length;
			return l>0 && l<Number($t.attr("minlength")) && $t;
		}],
		["[maxlength]", $t => $t.val().length>Number($t.attr("maxlength")) && $t],
		// Email
		["[type='email']", $t => (!/@/.test($t.val()) || $t.val().length<6) && $t],
		// RegExp
		["[pattern]", $t => !new RegExp($t.attr("pattern")).test(hj_survey_val($t)) && $t]
	];

	for(const [sel, invalid] of rules){
		for(const el of $f.filter(sel).toArray()){
			const $e = invalid($(el));
			if($e){
				shake($e);
				$e[0]?.focus();
				return $e.attr("title")||"";
			}
		}
	}

	// 同名集合只取值一次
	const data = {}, cache = new Map();
	$f.each(function(){
		const $t = $(this),
			name = $t.attr("name");
		if(name!=null && !cache.has(name)) cache.set(name, hj_survey_val(group($t)));
		const v = name==null ? hj_survey_val($t) : cache.get(name);
		if(v!=null) data["entry."+$t.attr("data-gform")] = v.trim();
	});

	if(Object.keys(data).length>0){
		gform_post(uri, data);
		if(typeof callback=="function") callback(1);
	}
	return true;
}

function hj_survey_val($e){
	if($e.is("[type='checkbox']"))
		return $e.filter(":checked").map(function(){return $(this).val();}).get().join(", ");
	if($e.is("[type='radio']"))
		return $e.filter(":checked").val();
	return $e.val();
}

function hj_survey_sortable_init($e){
	const output = function(){
		$e.output.val(
			$e.list.children("li").map(function(){return $(this).text();}).get().join(", ")
		);
	};

	$e.list.sortable({
		items: "> li",
		axis: "y",
		cursor: "row-resize",
		scroll: true,
		placeholder: "dragging",
		create: output,
		update: output,
		change: function(){
			$("li.dragging").css({margin: 0}).delay(10).queue(function(){
				$(this).css({margin: "10px auto"}).dequeue();
			});
		}
	}).disableSelection();
}

function hj_survey_checkbox_limit($e, limit=3){
	const $boxes = ($e || $("[data-checkboxes]")).find("input[type='checkbox']");
	$boxes.not(":checked").prop("disabled", $boxes.filter(":checked").length>=limit);
}

function survey_notice(o, t){
	const $n = $(".survey header .notice"),
		$t = $(".survey .title");
	if(o){
		$t.hide();
		$n.attr("title", t).fadeIn("fast").delay(4000).queue(function(){
			$(this).fadeOut("slow", function(){
				$t.fadeIn("slow");
			}).dequeue();
		});
	}
	else{
		$n.hide(); $t.fadeIn();
	}
}

function survey_beforeunload(){return "尚未送出表單";}
function survey_modified(o){
	window.onbeforeunload = o ? null : survey_beforeunload;
}

function survey_unlock(o, n){
	const $s = $(".survey");
	if(o){
		for(let i=1; i<=n; i++) $s.find("[data-unlock='"+i+"']").fadeIn();
	}
	else{
		for(let i=3; i>=n; i--) $s.find("[data-unlock='"+i+"']").fadeOut();
	}
}

// 送出表單共用流程：成功時先解除離開提示，執行 onSuccess，再記錄 FB 事件
function hj_survey_submit(form_id, onSuccess){
	const $b = $(".btns_action li"); $b.removeAttr("data-active");
	const r = hj_survey(form_id, $(".survey"), function(r){
		if(r===1){
			survey_modified(true);
			onSuccess();
			fb_evt_push(!1, "SubmitApplication");
		}
		else{
			msg();
			$b.attr("data-active", "");
		}
	});
	if(r!==true){
		survey_notice(true, "請填寫 Please fill:「"+r+"」");
		$b.attr("data-active", "");
	}
}

// VIP 知心小調查：forms.gle/t3dWZpGLPNDwtfC57
function hj_survey_subscriber(){
	hj_survey_submit("1FAIpQLScZSsT5cp4Yf3B41LVbgD6sUMUpMqr6uXyVwR6Cx6Bf6C2l0A", function(){
		msg('<i class="fas fa-check-circle"></i> 感謝您的填寫與分享！ Thank you for filling it out and sharing!', "OK", function(){
			self.location.href = "//hearty.me";
		});
	});
}

// 2025 貼圖許願池：forms.gle/gBHsr9EUohbNo8ci9
function hj_survey_stickers(){
	hj_survey_submit("1FAIpQLSfGrKLagX6BTqzHZjhqplVmaJaEn8YrGQ-HYA9YqwExHD7SMQ", function(){
		const t = '<i class="far fa-check-circle"></i> 感謝您的填寫與分享！ Thank you for filling it out and sharing!';
		$(".survey").html(t); msg(t, "不客氣 OK");
		$(window).scrollTop(0);
	});
}
