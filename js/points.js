"use strict";

$(function(){
	pt_balance();

	$(".popup>div").on("click", e => e.stopPropagation());

	$(".coupons").on("click", "[data-cp]", function(){
		if($(this).text().length>0) hj_copy($(this));
	});


	// 語言處理
	let lang = _h$["lang"];

	// 英文版中，移除所有商城方案
	if(lang=="en-us") $(".pkgs [data-pkg^='ec']").remove();

	// 僅在 Popup中保留當前語言版本（簡中則用繁中版）
	if(lang=="zh-cn") lang = "zh-tw";
	$(".popup>.pkg").not('[data-lang="'+lang+'"]').remove();

	document.title = _h("pt-title")+" ♥ Hearty Journal 溫度日記";
});

// 共用小工具
const pt_i = (icon, txt) => '<i class="'+icon+'"></i> '+txt,
	pt_pkg_name = () => $(".pkg:visible h3").text(),
	pt_date = d => new Date(d||"").toLocaleDateString(),
	pt_labels = (ok, cancel, x) => alertify.set({labels: {ok: ok, cancel: cancel}, ...x});

// 餘額
function pt_balance(){
	hj_update({
		action: "hearty_points",
		query: "balance_lookup"
	}).then(function(r){
		let $p = $("[data-points]");
		if(r["Status"]==1){
			$p.text(numberWithCommas(parseInt(r["Values"]["points"])));
		}
		else if(r["Status"]==2){
			$p.empty();
			$(".get_coupons").remove();
		}
	});
}

function pt_get(){
	pt_labels(pt_i("fas fa-hand-point-right", _h("pt-get-2")), _h("pt-no"));
	alertify.confirm(pt_i("fal fa-bell", _h("pt-get-1")), function(e){
		if(e) hj_href("d");
	});
}

// 兌換紀錄
function pt_coupons(){
	hj_loading(true);

	pt_update({
		action: "get_coupons"
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				r = r["Values"];
				if(r.length>0){
					$(".coupons tbody").empty().append(r.map(function(c){
						let code = c["code"],
							$code = $("<td>");

						// 已使用：VIP 方案將立即啟用
						if(code.slice(0, 5)=="POINT") $code.attr("data-used", _h("pt-coupons-6"));

						// 點擊可複製
						else $code.text(code).attr("data-cp", "");

						return $("<tr>").append(
							$("<td>", {text: _h("pt-pkg_"+c["pkg"]+"-0")}),
							$code,
							$("<td>", {text: c["created"]}),
							$("<td>", {text: c["exp"]})
						);
					}));
				}
				pt_pop(true, "coupons");
			break;

			case 2: // 未登入
				pt_signin_ask();
			break;

			default:
				msg();
			break;
		}
	}).fail(function(){
		msg();
	}).always(function(){
		hj_loading(false);
	});
}

// 查看
function pt_pop(on, pop){
	let $p = $(".popup");
	if(on) $p.children("."+pop).add($p.removeAttr("data-hidden")).fadeIn();
	else $p.children("div").add($p).fadeOut();
	$("body").toggleClass("noscroll", !!on);
}

// 兌換
function pt_update(d){
	return $.ajax({
		url: location.href,
		type: "POST",
		dataType: "json",
		data: d,
		timeout: 10000
	});
}

function pt_signin_ask(){
	pt_labels(pt_i("fas fa-door-open", _h("pt-signin-0")), _h("pt-no"));
	alertify.confirm(pt_i("fal fa-user-lock", _h("pt-signin-1")), function(e){
		if(e) hj_href("?r="+location.pathname+"#signin");
	});
}

// 各方案：[處理函式, 天數或金額]
const pt_pkgs = {
	vip14: [pt_vip, 14],
	vip30: [pt_vip, 30],
	ec100: [pt_ec, 100]
};

function pt_redeem(pkg, points){
	pt_labels(pt_i("fas fa-check-circle", _h("pt-ok")), _h("pt-back"), {buttonReverse: false});
	alertify.confirm(pt_i("fal fa-shopping-bag", _h("pt-redeem-0", {
		$pkg: pt_pkg_name(),
		$p: points
	}))+"<br>"+_h("pt-redeem-1")+" ♡", function(e){
		if(!e) return;

		// 點數欄隱藏，表未登入
		if($("header [data-points]:hidden").length>0){
			pt_signin_ask();
			return;
		}

		// 同意條款
		let $c = $('input[type="checkbox"]:visible');
		if($c.length>0 && !$c.is(':checked')){
			msg(pt_i("fal fa-check-circle", _h("pt-agree")));
			$c.focus().get(0)?.scrollIntoViewIfNeeded();

			shake($c);
			return;
		}

		// 呼叫各方案，個別處理
		if(Object.hasOwn(pt_pkgs, pkg)){
			let [fn, n] = pt_pkgs[pkg];
			fn(pkg, n);
		}
		else msg();
	});
}

// 兌換失敗的共用處理
function pt_redeem_err(r){
	switch(r["Status"]){
		case 2: // 未登入
			pt_signin_ask();
		break;

		case 3: // 不足
			msg(pt_i("fal fa-info-circle", _h("pt-redeem-2", {
				$pkg: pt_pkg_name()
			})));
		break;

		case 4: // 無此方案
			msg(pt_i("fal fa-info-circle", _h("pt-redeem-3")));
		break;

		default:
			msg(r["Values"]?.["err"]||"");
		break;
	}
}

// 兌換：療癒商城課程折價券 $100
function pt_ec(pkg, amt){
	hj_loading(true);

	pt_update({
		action: "redeem",
		pkg: pkg,
		amt: amt
	}).then(function(r){
		if(r["Status"]!=1){
			pt_redeem_err(r);
			return;
		}

		r = r["Values"]||{};
		let coupon = r["code"]||"";
		hj_copy_text(coupon);

		pt_labels(pt_i("fas fa-hand-point-right", _h("pt-use-0")), _h("pt-close"), {buttonReverse: false});
		alertify.prompt(pt_i("fal fa-check-circle", _h("pt-ec_ok-0", {
			$amt: amt,
			$code: coupon
		}))+"<br>"+_h("pt-ec_ok-1", {
			$exp: pt_date(r["exp"])
		}), function(e){
			hj_copy_text(coupon);
			if(e) window.open("/life", "_blank");
		}, coupon);

		alertify_input_custom({
			inputmode: "none",
			placeholder: coupon,
			onclick: "hj_copy($(this))"
		}, {
			cursor: "copy"
		});

		pt_pop(false); // 關 popup
		pt_balance(); // 更新餘額
		pt_coupons(); // 顯示兌換紀錄
	}).fail(function(j){
		msg(JSON.stringify(j));
	}).always(function(){
		hj_loading(false);
	});
}

// 兌換：VIP 方案 n天
function pt_vip(pkg, dur){
	hj_loading(true);

	// 1. 以小布點換取獨立序號
	pt_update({
		action: "redeem",
		pkg: pkg,
		dur: dur
	}).then(function(r){
		if(r["Status"]!=1){
			pt_redeem_err(r);
			return;
		}

		let voucher = r["Values"]["voucher"]||"";
		console.log("* 溫度日記 VIP兌換序號："+voucher);

		// 2. 用獨立序號啟用 VIP（回傳 promise，loading 待啟用完成才關閉）
		return $.ajax({
			url: "/gift/"+voucher,
			type: "POST",
			dataType: "json",
			data: {
				voucher: voucher
			}
		}).then(function(r){
			if(r["Status"]!=1){
				msg(r["Values"]?.["err"]||"");
				return;
			}

			r = r["Values"]||{};

			pt_labels(pt_i("fas fa-hand-point-right", _h("pt-vip_ok-1")), _h("pt-close"));
			alertify.confirm(pt_i("far fa-gift", _h("pt-vip_ok-0", {
				$days: r["dur"]||0,
				$exp: pt_date(r["exp"])
			}))+' <i class="far fa-check-circle"></i>', function(e){
				if(e) hj_href("account?tab=1");
			});

			pt_pop(false); // 關 popup
			pt_balance(); // 更新餘額
		}).catch(function(){
			msg();
		});
	}).fail(function(j){
		msg(JSON.stringify(j));
	}).always(function(){
		hj_loading(false);
	});
}
