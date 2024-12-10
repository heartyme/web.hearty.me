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
	let $f = ($selector || $("body")).find("[data-gform]"), 
		$f_invalid = [];

	// 必填，檢查 input 本身及有相同 name 的集合是否為空
	$f.filter("[required]").each(function(){
		let $t = $(this).is("[name]") ? // 取得同名之任一值
				$f.filter($("[name='"+$(this).attr("name")+"']")) : 
				$(this), 
			v = hj_survey_val($t);
		if(v==null || !v.length)
			$f_invalid.push({e: $t, t: $t.attr("title")||""});
	});
	$f.filter("[minlength]").each(function(){
		let l = $(this).val().length;
		if(l>0 && l<Number($(this).attr("minlength")))
			$f_invalid.push({e: $(this), t: $(this).attr("title")||""});
	});
	$f.filter("[maxlength]").each(function(){
		if($(this).val().length>Number($(this).attr("maxlength")))
			$f_invalid.push({e: $(this), t: $(this).attr("title")||""});
	});
	// Email
	$f.filter("[type=\"email\"]").each(function(){
		if(!/@/.test($(this).val()) || $(this).val().length<6)
			$f_invalid.push({e: $(this), t: $(this).attr("title")||""});
	});
	// RegExp
	$f.filter("[pattern]").each(function(){
		let r = new RegExp($(this).attr("pattern"));
		if(!r.test(hj_survey_val($(this)))) $f_invalid.push({e: $(this), t: $(this).attr("title")||""});
	});

	if($f_invalid.length>0){
		shake($f_invalid[0].e);
		$f_invalid[0].e.focus();
		return $f_invalid[0].t;
	}

	let data = {};
	$f.each(function(){
		let $t = $(this).is("[name]") ? // 取得同名之任一值
				$f.filter($("[name='"+$(this).attr("name")+"']")) : 
				$(this), 
			v = hj_survey_val($t);
		if(!(v==null)) data["entry."+$(this).attr("data-gform")] = v.trim();
	});

	if(Object.keys(data).length>0){
		gform_post(uri, data);
		if(typeof callback=="function") callback(1);
	}
	return true;
}
	function hj_survey_val($e){
		if($e.is("[type='checkbox']"))
			return $e.map(function(){
				return $(this).filter(":checked").val()
			}).toArray().join(", ")
		else if($e.is("[type='radio']"))
			return $e.filter(":checked").val();
		else
			return $e.val();
	}

function hj_survey_subscriber(){
	let $b = $(".btns_action li"); $b.removeAttr("data-active");
	let r = hj_survey(
		"1FAIpQLScZSsT5cp4Yf3B41LVbgD6sUMUpMqr6uXyVwR6Cx6Bf6C2l0A", 
		$(".survey"), 
		function(r){
			switch(r){
				case 1:
					survey_modified(true);
					msg('<i class="fas fa-check-circle"></i> 感謝您填寫分享', "不客氣", function(){
						location.href = "//hearty.me";
					});
					fb_event_push(!1, "SubmitApplication");
				break;

				default:
					msg();
					$b.attr("data-active", "");
				break;
			}
	});
	if(r!==true){
		survey_notice(true, "請填寫：「"+r+"」");
		$b.attr("data-active", "");
	}
}

function hj_survey_sortable_init($e){
	$e["list"].sortable({
		items: "> li", 
		axis: "y", 
		cursor: "row-resize", 
		scroll: true, 
		placeholder: "dragging", 
		create: function(){
			$e["output"].val(
				$e["list"].children("li").map(function(){
					return $(this).text()
				}).toArray().join(", ")
			)
		}, 
		update: function(){
			$e["output"].val(
				$e["list"].children("li").map(function(){
					return $(this).text()
				}).toArray().join(", ")
			)
		}, 
		change: function(){
			$("li.dragging").css({margin: 0}).delay(10).queue(function(){
				$(this).css({margin: "10px auto"}).dequeue();
			});
		}
	}).disableSelection();
}

function survey_notice(o, t){
	let $n = $(".survey header .notice"), 
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

function survey_modified(o){
	if(o) window.onbeforeunload = null;
	else window.onbeforeunload = function(){return "尚未送出表單";};
}

function survey_unlock(o, n){
	let $s = $(".survey");
	if(o){
		for(let i=1; i<=n; i++) $s.find("[data-unlock='"+i+"']").fadeIn();
	}
	else{
		for(let i=3; i>=n; i--) $s.find("[data-unlock='"+i+"']").fadeOut();
	}
}
