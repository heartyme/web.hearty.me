"use strict";

$(function(){
	pt_balance();

	$(".popup>div").on("click", function(e){
		e.stopPropagation();
	});

	$(".coupons").on("click", "[data-cp]", function(){
		if($(this).text().length>0) hj_copy($(this));
	});


	// 語言處理
	let lang = _h$["lang"];

	// 英文版中，移除所有商城方案
	if(lang=="en-us") $(".pkgs [data-pkg^='ec']").remove();

	// 僅在 Popup中保留當前語言版本
	$(".popup>.pkg").each(function(){
		if(lang=="zh-cn") lang="zh-tw"; // 簡中則用繁中版
		if(!$(this).is('[data-lang="'+lang+'"]')) $(this).remove();
	});

	document.title = _h("pt-title")+" ♥ Hearty Journal 溫度日記";
});

// 餘額
function pt_balance(){
	hj_update({
		action: "hearty_points", 
		query: "balance_lookup"
	}).then(function(r){
		let $p = $("[data-points]");
		switch(r["Status"]){
			case 1:
				$p.text(numberWithCommas(parseInt(r["Values"]["points"])));
			break;

			case 2:
				$p.empty();
				$(".get_coupons").remove();
			break;
		}
	});
}

function pt_get(){
	alertify.set({labels: {ok: '<i class="fas fa-hand-point-right"></i> '+_h("pt-get-2"), cancel: _h("pt-no")}});
	alertify.confirm('<i class="fal fa-bell"></i> '+_h("pt-get-1"), function(e){
		if(e) hj_href("d");
	});
}

function pt_coupons(){
	hj_loading(true);

	pt_update({
		action: "get_coupons"
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				r = r["Values"];
				if(r.length>0){
					let $c = $(".coupons tbody");
					$c.empty();

					$.each(r, function(i, c){
						let code = c["code"];
						let $code = $("<td>");

						// 已使用：VIP 方案將立即啟用
						if(code.slice(0, 5)=="POINT") $code.attr("data-used", _h("pt-coupons-6"));

						// 點擊可複製
						else $code.text(code).attr("data-cp", "");


						$("<tr>")
							.append(
								$("<td>", {text: _h("pt-pkg_"+c["pkg"]+"-0")}), 
								$code, 
								$("<td>", {text: c["created"]}), 
								$("<td>", {text: c["exp"]})
							)
							.appendTo($c);
					});
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
	}).fail(function(j){
		msg();
	}).always(function(){
		hj_loading(false);
	});
}

// 查看
function pt_pop(on, pop){
	let $b = $("body"), 
		$p = $(".popup");
	if(on){
		$p.children("."+pop).add($p.removeAttr("data-hidden")).fadeIn();
		$b.addClass("noscroll");
	}
	else{
		$p.children("div").add($p).fadeOut();
		$b.removeClass("noscroll");
	}
}

// 兌換
function pt_update(d){
	return $.ajax({
		url: location.href, 
		type: "POST", 
		dataType: "json", 
		data: d, 
		async: true, 
		timeout: 10000
	});
}

function pt_signin_ask(){
	alertify.set({labels: {ok: '<i class="fas fa-door-open"></i> '+_h("pt-signin-0"), cancel: _h("pt-no")}});
	alertify.confirm('<i class="fal fa-user-lock"></i> '+_h("pt-signin-1"), function(e){
		if(e) hj_href("?r="+location.href.split("#")[0].split("?")[0].replace(location.origin, "")+"#signin");
	});
}

function pt_redeem(pkg, points){
	alertify.set({labels: {ok: '<i class="fas fa-check-circle"></i> '+_h("pt-ok"), cancel: _h("pt-back")}, buttonReverse: false});
	alertify.confirm('<i class="fal fa-shopping-bag"></i> '+_h("pt-redeem-0", {
		$pkg: $(".pkg:visible h3").text(), 
		$p: points
	})+"<br>"+_h("pt-redeem-1")+" ♡", function(e){
		if(e){
			// 點數欄隱藏，表未登入
			if($("header [data-points]:hidden").length>0){
				pt_signin_ask();
				return;
			}

			// 同意條款
			let $c = $('input[type="checkbox"]:visible');
			if($c.length>0 && !$c.is(':checked')){
				msg('<i class="fal fa-check-circle"></i> '+_h("pt-agree"));
				$c.focus().get(0).scrollIntoViewIfNeeded();

				shake($c);
				return;
			}

			// 呼叫各方案，個別處理
			switch(pkg){
				case "vip14":
					pt_vip("vip14", 14);
				break;

				case "vip30":
					pt_vip("vip30", 30);
				break;

				case "ec100":
					pt_ec("ec100", 100);
				break;

				default:
					msg();
				break;
			}
		}
	});
}

// 兌換：療癒商城課程折價券 $100
function pt_ec(pkg, amt){
	hj_loading(true);

	pt_update({
		action: "redeem", 
		pkg: pkg, 
		amt: amt
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				r = r["Values"]||[];
				let coupon = r["code"]||"";
				hj_copy_text(coupon);

				alertify.set({labels: {ok: '<i class="fas fa-hand-point-right"></i> '+_h("pt-use-0"), cancel: _h("pt-close")}, buttonReverse: false});
				alertify.prompt('<i class="fal fa-check-circle"></i> '+_h("pt-ec_ok-0", {
					$amt: amt, 
					$code: coupon
				})+"<br>"+_h("pt-ec_ok-1", {
					$exp: new Date(r["exp"]||"").toLocaleDateString()
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
			break;

			case 2: // 未登入
				pt_signin_ask();
			break;

			case 3: // 不足
				msg('<i class="fal fa-info-circle"></i> '+_h("pt-redeem-2", {
					$pkg: $(".pkg:visible h3").text()
				}));
			break;

			case 4: // 無此方案
				msg('<i class="fal fa-info-circle"></i> '+_h("pt-redeem-3"));
			break;

			default:
				msg(r["Values"]["err"]||"");
			break;
		}
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
		switch(r["Status"]){
			case 1:
				let voucher = r["Values"]["voucher"]||"";
				console.log("* 溫度日記 VIP兌換序號："+voucher);

				// 2. 用獨立序號啟用 VIP
				$.ajax({
					url: "/gift/"+voucher, 
					type: "POST", 
					dataType: "json", 
					data: {
						voucher: voucher
					}, 
					async: true
				}).then(function(r){
					if(r["Status"]==1){
						r = r["Values"]||[];

						alertify.set({labels: {ok: '<i class="fas fa-hand-point-right"></i> '+_h("pt-vip_ok-1"), cancel: _h("pt-close")}});
						alertify.confirm('<i class="far fa-gift"></i> '+_h("pt-vip_ok-0", {
							$days: r["dur"]||0, 
							$exp: new Date(r["exp"]||"").toLocaleDateString()
						})+' <i class="far fa-check-circle"></i>', function(e){
							if(e) hj_href("account?tab=1");
						});

						pt_pop(false); // 關 popup
						pt_balance(); // 更新餘額
					}
					else{
						msg(r["Values"]["err"]||"");
					}
				}).fail(function(){
					msg();
				}).always(function(){
					hj_loading(false);
				});
			break;

			case 2: // 未登入
				pt_signin_ask();
			break;

			case 3: // 不足
				msg('<i class="fal fa-info-circle"></i> '+_h("pt-redeem-1", {
					$pkg: $(".pkg:visible h3").text()
				}));
			break;

			case 4: // 無此方案
				msg('<i class="fal fa-info-circle"></i> '+_h("pt-redeem-2"));
			break;

			default:
				msg(r["Values"]["err"]||"");
			break;
		}
	}).fail(function(j){
		msg(JSON.stringify(j));
	}).always(function(){
		hj_loading(false);
	});
}
