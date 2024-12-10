"use strict";

function bill(order_no){
	if(order_no==null || order_no=="")
		msg('<i class="fal fa-gift-card"></i>'+_h("o-plan-2"));
	else
		hj_href("shop/bill?o="+order_no);
}

function bill_reload(){
	setTimeout(function(){
		let u = new URL(location.href);
		if(u.searchParams.has("reload")){
			// 給 tp.buy.js 讀取，可關 3D
			setcookie("hearty_3ds", 0, 2);
		}
		else{
			hj_loading(true);
			u.searchParams.set("reload", 1);
			location.href = u;
		}
	}, 3000);
}

function bill_share(){
	let url = location.href.replace(location.host, "hearty.app");

	if(/iOS|Android/i.test(check_hjapp())){
		location.assign(
			"//hearty.me/wv?s="+encodeURIComponent(url.replace(/(^\w+:|^)\/\//, ""))
		);
	}
	else if(is_touch_device() && "share" in navigator){
		navigator.share({
			title: document.title, 
			url: url
		}).catch(function(e){});
	}
	else{
		alertify.set({labels: {ok: _h("o-back"), cancel: '<i class="fas fa-copy"></i> '+_h("o-url-1")}, buttonReverse: true});
		alertify.prompt('<i class="fal fa-file-alt"></i> '+_h("o-url-0")+'<br><br><a class="qrcode"></a>', function(e){
			if(!e) hj_copy($("#alertify .alertify-text"));
		}, url);

		alertify_input_custom({
			type: "url", 
			inputmode: "none", 
			placeholder: url, 
			onclick: "hj_copy($(this))"
		}, {
			cursor: "copy"
		});

		get_qrcode($("#alertify .qrcode"), url);
	}
}

function bill_screenshot($e, orderno){
	hj_loading(true);
	$e = $e || $(".bill_payment");

	hj_getScript_npm("html2canvas@1.4.1/dist/html2canvas.min.js", function(){
		window.html2canvas($e.get(0), {
			useCORS: true, 
			scale: window.devicePixelRatio, 
			width: $e.get(0).offsetWidth, 
			height: $e.get(0).offsetHeight
		}).then(function(c){
			$(".btn_screenshot_download").removeAttr("onclick").attr({
				target: "_blank", 
				href: c.toDataURL("image/png"), // b64
				download: "Hearty-Journal_"+orderno+".png"
			}).get(0).click();
		}).finally(function(){
			hj_loading(false);
		});
	});
}
	/* 
		bill_screenshot 的 JPG 壓縮版本
		由於 png 及 jpg 檔案差異小，所以 bill_screenshot_compress 未啟用
	*/
	function bill_screenshot_compress($e, orderno){
		hj_loading(true);
		$e = $e || $(".bill_payment");

		$.getScript("//cdn.jsdelivr.net/combine/npm/html2canvas@1.4.1/dist/html2canvas.min.js,npm/compressorjs@1.2.1/dist/compressor.min.js", function(){
			window.html2canvas($e.get(0), {
				useCORS: true, 
				scale: window.devicePixelRatio, 
				width: $e.get(0).offsetWidth, 
				height: $e.get(0).offsetHeight
			}).then(function(c){
				// canvas 轉 base64 (原圖)，備用
				let b64 = c.toDataURL("image/png"), 
					$a = $(".btn_screenshot_download").removeAttr("onclick").attr({
						target: "_blank", 
						download: "Hearty-Journal_"+orderno+".png"
					});

				// canvas 轉 blob
				c.toBlob(function(blob){
					// 壓縮
					new Compressor(blob, {
						quality: 0.9, // 壓縮質量（0-1）
						mimeType: "image/jpeg", 
						success(blob_compressed){
							// blob 轉 base64
							let f = new FileReader();
							f.readAsDataURL(blob_compressed);
							f.onloadend = function(){
								let b64_compressed = f.result;

								// 下載
								$a.attr({ 
									href: b64_compressed, 
									download: "Hearty-Journal_"+orderno+".jpg"
								}).get(0).click();
							};
						}, 
						error(e){
							// 下載原圖 (base64)
							$a.attr({ 
								href: b64, 
							}).get(0).click();
						}
					});

				}, "image/png");
			}).finally(function(){
				hj_loading(false);
			});
		});
	}

function sales_tracking(evt, pkg_id, order_no){
	let pkg = pkg_info(pkg_id), 
		plan = (pkg_id>4 ? "Prepaid" : "Monthly")+" Plan";
	if(!pkg) return false; // 無此方案 or 禮物方案

	switch(evt){
		case "purchase":
			// 僅有帶 ?pay=1 是藍新跳轉回來 (其他則是查閱過往訂單紀錄)
			if(!getUrlPara("pay")) return;
			affiliates_cps(pkg_id, order_no, pkg["subtotal"]);

			evt = {g: "purchase", f: "Purchase"};
		break;

		case "checkout":
			evt = {g: "begin_checkout", f: "InitiateCheckout"};
		break;

		default: // remove_from_cart
			evt = {g: "remove_from_cart", f: "RemoveFromCart"};
		break;
	}
	ga_evt_push(evt["g"], {
		items: [{
			item_id: pkg_id, 
			item_name: "VIP Premium", 
			item_variant: plan, 
			quantity: pkg["quantity"], 
			price: pkg["unit"]
		}]
	});
	fb_evt_push(evt["f"], {
		content_type: "product", 
		content_name: "VIP Premium", 
		contents: [{
			id: pkg_id, 
			quantity: pkg["quantity"]
		}], 
		value: pkg["subtotal"], 
		num_items: 1, 
		currency: "TWD"
	});

	// LINE Tag
	if(typeof _lt!="undefined"){
		try{
			_lt("send", "cv", {
				type: "Purchase", 
				value: pkg["subtotal"], 
				currency: "TWD"
			}, ['91b6ece5-a435-4ac9-9119-d8973be6322e']);
		}
		catch(e){}
	}
}
	function pkg_info(pkg_id){
		let pkg = {
			1: {unit: 50, subtotal: 600, quantity: 12}, // (老用戶優惠) 儲值 12月 (不對外顯示)
			2: {unit: 149, subtotal: 447, quantity: 3}, // 儲值 3月
			3: {unit: 109, subtotal: 654, quantity: 6}, // 儲值 6月
			4: {unit: 89, subtotal: 1068, quantity: 12}, // 儲值 12月
			5: {unit: 33, subtotal: 99, quantity: 3}, // 訂閱首購 3月
			6: {unit: 99, subtotal: 99, quantity: 1} // 訂閱續購 1月
		};
		return (pkg_id in pkg) ? pkg[pkg_id] : false;
	}
	function affiliates_cps(pkg_id, order_no, amt){
		let pkg_name = {
			2: "season", 
			3: "semi-annual", 
			4: "annual", 
			5: "monthly"
		}[pkg_id]||"";

		if(!!pkg_name){
			try{
				(function(){
					let payload = {
						step: pkg_name
						// revenue: 90
						// order: order_no||"", 
						// orderTotal: amt||0
					};
					order_no = order_no||"";
					if(!!order_no) payload["order"] = order_no;
					if(parseInt(amt)>0) payload["orderTotal"] = amt;

					let VARemoteLoadOptions = {
						whiteLabel: {id: 8, siteId: 2640, domain: "t.adotone.com"},
						conversion: true,
						conversionData: payload, 
						locale: "en-US", mkt: true
					};
					(function (c, o, n, v, e, r, l, y){
					c['VARemoteLoadOptions'] = e; r = o.createElement(n), l = o.getElementsByTagName(n)[0];
					r.async = 1; r.src = v; l.parentNode.insertBefore(r, l);
					})(window, document, 'script', '//cdn.adotone.com/javascripts/va.js', VARemoteLoadOptions);


					// Debug
					VARemoteLoadOptions = JSON.stringify(VARemoteLoadOptions);

					// 回傳 Google 表單
					// forms.gle/qxYamUxzjx7u8hP28
					gform_post("1FAIpQLSc114FBksG_IRL82X2jRxIEap9UIi3X1Vj6wLuZqY23zsQTPw", {
						"emailAddress": getcookie("hearty_em")||"guest@hearty.me", 
						"entry.2046581741": order_no, 
						"entry.434422115": amt, 
						"entry.1958440920": getcookie("hearty_u"), 
						"entry.803572147": getcookie("hearty_id"), 
						"entry.1027128888": VARemoteLoadOptions, 
						"entry.206183814": today(8), 
						"entry.858322988": navigator.userAgent||""
					});
					console.log("Affiliates CPS: "+VARemoteLoadOptions);

				})();
			}
			catch(e){}
		}
	}
