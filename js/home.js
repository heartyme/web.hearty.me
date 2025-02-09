"use strict";

var btn_alias = "home";

$(function(){
	post_font();
	// alice_greeting_read(getUrlPara("g")); // 停用
	hj_localize_cn();
	hj_alice_history_init();
	account_prefilling();

	let $n = {
		top: $(".directory .nav_btn[data-top]"), 
		left: $(".directory .nav_btn[data-left]")
	};
	$n.top.hide();
	$(".directory").scroll(function(){
		if($(this).scrollTop()>200){
			$n.left.stop().fadeOut("fast", function(){
				$n.top.stop().fadeIn();
			});
		}
		else{
			$n.top.stop().fadeOut("slow", function(){
				$n.left.stop().fadeIn();
			});
		}
	});

	$(".mh-head .left").on("click", function(){
		nav_toggle($(".menu"), true);
	});
	$(".alice").find(".tabs,[data-opinions] ul").on("click", function(e){
		e.stopPropagation();
	});

	let $p = $(".profile");
	$p.on("click", function(){
		profile_popup();
	}).find(".avatar").on("click", function(){
		$p.find("[data-link]:visible").click();
	});
	$p.find(".profile_btns").on("click", function(e){
		e.stopPropagation();
	}).find("[data-link]").on("click", function(){
		open_url(location.origin+"/"+this.dataset.username+"?feed=1");
	});
	$p.find("[data-penpal_add]").on("click", function(){
		penpal_add(this.dataset.username);
	});

	let $txt = $(".alice_inner textarea").on("input", function(){
		let $t = $(this), 
			$c = $(".alice_inner .comment");

		// 中文輸入法還沒選字時，就會被算入字數，導致無法選字或截斷
		// 故 JS限為 85字，maxlength 則設為 88字
		if($t.val().length>=85) $c.addClass("invalid");
		else $c.removeClass("invalid");
	}).autogrow(); // stackoverflow.com/a/2948256

	if(!user_verify()){
		$txt.on("click", function(){
			user_verify(true);
		}).attr({readonly: ""});
	}
});

leave_InAppBrowser();

function alice_update(d){
	return $.ajax({
		url: location.href, 
		type: "POST", 
		dataType: "json", 
		data: d, 
		async: true
	});
}

function user_verify(notice){
	if(notice){
		msg('<i class="far fa-info-circle"></i> '+_h("A-verify-0"), '<i class="fas fa-address-card"></i> '+_h("A-verify-1"), function(){
			hj_href("account");
		});
	}
	return parseInt($("body").attr("data-verified"))>1;
}

function directory_scrolltop(on){
	let $e = $(".directory");
	if(on){
		$e.stop().scrollTop(0);
		return 0;
	}
	else{
		return $e.scrollTop();
	}
}

function hj_alice_history_init(){
	if(typeof history.pushState=="function"){
		hj_alice_history_push();
		window.addEventListener("popstate", function(){
			let scrolled = $(".goodnight").scrollLeft();

			if($(".goodnight .profile").is(":visible")){
				profile_popup();
				hj_alice_history_push();
			}
			else if($(".alice_inner [data-opinions][data-off]").length==0){
				alice_opinions_toggle();
				hj_alice_history_push();
			}
			else if(directory_scrolltop()>50){
				nav_goodnight(+(scrolled==0));
				hj_alice_history_push();

				// if(scrolled>0) directory_scrolltop(true);
			}
			else{
				directory_scrolltop(true);
				hj_href("d");
			}

			if(!($("nav.menu").data("mmenu")==null)) $("nav.menu").data("mmenu").close();
		}, false);
	}
}
	function hj_alice_history_push(){
		history.pushState(null, document.title, location.href);
	}

function nav_goodnight(p, no_animation){
	let $e = $(".goodnight");
	if($e.length>0){
		$e.get(0).scroll({
			left: $e.width()*(p||0), 
			behavior: !no_animation ? "smooth" : "instant"
		});
	}
	// if(p==0) $a.children("div").scrollTop(0);
}

function alice_opinions_toggle(o){
	let $q = $(".alice_inner [data-quote]"), 
		$o = $(".alice_inner [data-opinions]"), 
		$u = $o.find("ul");
	if(o||$u.is(":hidden")){
		$o.removeAttr("data-off");
		$q.attr("data-blur", "");

		if(check_OS("Android")) $u.fadeIn("fast");
		else $u.slideDown("fast");
	}
	else{
		$u.fadeOut("fast", function(){
			$o.attr("data-off", "");
			$q.removeAttr("data-blur");
		});
	}
}

function alice_greeting_read(greeting_id){
	alice_update({
		greeting_id: greeting_id||""
	}).then(function(r){
		switch(r["Status"]){
			case 0:
				alice_greeting_read();
				msg('<i class="fal fa-comment-exclamation"></i> '+_h("A-no_post"));
			break;

			case 1:
				r = r["Values"];
				greeting_id = r["greeting_id"];
				let $g = $(".goodnight"), 
					$a = $g.find("article"), 
					$u = $g.find("[data-opinions] ul");

				$g.find("[data-quote]").attr({title: r["greeting"]})
					.find("img").attr({
						src: "//i0.wp.com/storage.googleapis.com/hearty_photo_greetings/"+r["greeting_image"], 
						alt: r["greeting"]
					});

				/* SEO */
				$a.find("h4").text(r["greeting"]||"");
				$a.find("h5").text(r["greeting_title"]||"");
				$a.find("p").text(r["greeting_post"]||"");

				$u.attr({
					title: r["greeting_title"], 
					"data-url": r["greeting_url"] || ""
				}).find(".opinions").slice(1).remove(); // 清空

				document.title = r["greeting"]+" - "+_h("A-title")+" | 💝 Hearty Journal 溫度日記";

				$g.find(".comment [data-greeting_id]").attr("data-greeting_id", greeting_id);

				if(r["comments"].length>0){
					$u.find(".opinions:first").after(
						r["comments"].map(function(c){
							return alice_greeting_comments(r, c);
						})
					);
				}

				$(".directory_inner [data-greeting_id]").removeAttr("data-active").filter("[data-greeting_id='"+greeting_id+"']").attr("data-active", "");

				// 顯示加入筆友鈕
				let $b = $(".profile .profile_btns");
				if(greeting_id==31){
					$b.show();

					// 阻擋 7天內註冊的新用戶
					alice_update({action: "signup_days"}).then(function(r){
						let days = parseInt(r["Values"]["signup_days"]||0);
						if(r["Status"]==1 && days<6){
							days++;
							msg('<i class="far fa-user-check"></i> '+_h("A-penpal_guest-0", {
								$day: numberWithCommas(days), 
								$th: nth(days)
							}), _h("A-penpal_guest-1")+' <i class="fas fa-fist-raised"></i>', function(){
									alice_greeting_read();
							});
							ga_evt_push("Penpal_not_allowed");
						}
					});
				}
				else{
					$b.hide();
				}

				// on Desktop
				if($("body").width()>=768) alice_opinions_toggle(true);

				if(typeof history.replaceState=="function")
					history.replaceState(
						{}, 
						r["greeting_title"], 
						"/home?g="+greeting_id
					);
			break;
		}
	});
}
	function alice_greeting_comments(g, c){
		let gender = c["gender"], 
			profile_image = c["profile_image"] || ("default"+(gender==1 ? "_male":"")+".jpg");

		return $("<li>", {
			class: "opinions", 
			html: $("<div>", {
				class: "avatar", 
				title: c["nickname"], 
				onclick: "profile_popup('"+c["username"]+"','"+c["nickname"]+"','"+profile_image+"','"+gender+"')", 
				"data-vip": c["is_vip"] // $.inArray(c["username"], ["nien", "jianny"])<0 ? 0 : 1
			}).css({
				"background-image": "url(//i.hearty.app/u/"+profile_image+")"
			}).add(
				$("<div>", {
					class: "opinion", 
					title: c["comment"], 
					"data-user": c["nickname"]
				}).text(htmlDecode(c["comment"])).append(
					$("<a>", {
						onclick: "alice_comment_toggle(this.dataset,$(this).parent())", 
						"data-greeting_id": g["greeting_id"], 
						"data-comment_id": c["comment_id"], 
						"data-comment_own": c["comment_own"]
					})
				)
			)
		});
	}

function alice_greeting_comment(greeting_id){
	let $o = $(".goodnight [data-opinions]"), 
		$c = $o.find(".comment textarea"), 
		c = ($c.val()||"").trim().replace(/[\r\n]{2,}/g, "\n"); // stackoverflow.com/a/22962887

	// 已留過言了
	if($o.find("[data-comment_own='1']").length>1){
		msg('<i class="fal fa-comment-lines"></i> '+_h("A-comment_limit-0"));
		shake($c);
	}
	else if(c.length>85){
		msg('<i class="fal fa-comment-lines"></i> '+_h("A-comment_limit-1", {$chars: c.length}));
		shake($c);
	}
	else if(c.length>2){
		$c.val("").css({height: "auto"});
		if(banned_words(c)){
			report_abuse("已拒登", greeting_id, "", c);
			msg('<i class="fal fa-info-circle"></i> '+_h("A-comment_ban-0")+"<br>"+_h("A-comment_ban-1")+'<br><i class="fal fa-sticky-note"></i> '+_h("A-comment_ban-2")+" <a target='_blank' href='//faq.hearty.me/tutorial/public_diaries'>["+_h("A-comment_ban-3")+"]</a>");
			return false;
		}

		alice_update({
			action: "comment", 
			greeting_id: greeting_id, 
			comment: c
		}).then(function(r){
			switch(r["Status"]){
				case 1:
					r = r["Values"];

					let gender = r["gender"], 
						profile_image = r["profile_image"] || ("default"+(gender==1 ? "_male":"")+".jpg");

					$o.scrollTop(0).find(".opinions:first").after(alice_greeting_comments({
						greeting_id: greeting_id
					}, {
						username: r["username"], 
						nickname: r["nickname"], 
						profile_image: profile_image, 
						gender: gender, 
						comment_id: r["comment_id"], 
						comment_own: 1, 
						comment: c
					}));

					ga_evt_push("Comment", {
						event_category: "Posts", 
						event_label: "Comment"
					});
					fb_evt_push("Comment");
				break;

				case 2:
					$c.val(c);
					alice_signin_required();
				break;
			}
		}).fail(function(){
			$c.val(c);
			shake($c);
		});
	}
	else{
		msg('<i class="fal fa-comment-lines"></i> '+_h("A-comment_limit-2"));
		shake($c);
	}
}

function hj_share_page(){
	let url = $(".alice_inner [data-opinions] ul").attr("data-url")||"";
	if(!url){
		url = location.href.replace(location.host, "hearty.app");
		url += (url.indexOf("?")>0?"&":"?")+"st=Alice%20%E8%AA%AA%E6%99%9A%E5%AE%89";
	}
	else{
		url = "https://hj.rs/"+url;
	}

	if(/iOS|Android/i.test(check_hjapp())){
		location.assign("//hearty.me/wv?s="+encodeURIComponent(url.replace(/(^\w+:|^)\/\//, "")));
	}
	else if(is_touch_device() && "share" in navigator){
		navigator.share({
			title: document.title, 
			url: url
		}).catch(function(e){});
	}
	else{
		alertify.set({labels: {ok: _h("A-url-2")+' <i class="fas fa-qrcode"></i>', cancel: '<i class="fas fa-copy"></i> '+_h("A-url-0")}, buttonReverse: true});
		alertify.prompt('<i class="fal fa-link"></i> '+_h("A-url-1")+'<br><br><a class="qrcode"></a>', function(e){
			if(e) $("#alertify .qrcode").get(0).click();
			else hj_copy($("#alertify .alertify-text"));
		}, url);

		alertify_input_custom({
			type: "url", 
			inputmode: "none", 
			placeholder: url, 
			onclick: "hj_copy($(this))"
		}, {
			cursor: "copy"
		});
		hj_copy_text(url);

		get_qrcode($("#alertify .qrcode"), url);
	}
}

function alice_comment_toggle(v, $c){
	let greeting_id = Number(v["greeting_id"]), 
		comment_id = Number(v["comment_id"]);
	if(v["comment_own"]=="1"){
		alertify.set({labels: {ok: _h("A-no"), cancel: '<i class="fas fa-pencil"></i> '+_h("A-comment_edit-1")}, buttonReverse: false});
		alertify.confirm('<i class="fal fa-edit"></i> '+_h("A-comment_edit-0"), function(e){
			if(!e){
				alice_update({
					action: "comment_delete", 
					comment_id: comment_id, 
				}).then(function(r){
					switch(r["Status"]){
						case 1:
							let $i = $(".comment textarea");
							$i.val(
								($c.text()+" "+($i.val()||"")).trim()
							).focus();

							$c.parent().slideUp(400, function(){
								$(this).remove();
							});
							hj_vibrate(30);

							ga_evt_push("Comment Removed", {
								event_category: "Posts", 
								event_label: "Comment Removed"
							});
							fb_evt_push("Comment Removed");
						break;

						case 2:
							alice_signin_required();
						break;
					}
				});
			}
		});
	}
	else{
		account_status().then(function(r){
			if(r["Status"]==1){
				alertify.set({labels: {ok: _h("A-no"), cancel: '<i class="fas fa-check-circle"></i> '+_h("A-report_ask-1")}, buttonReverse: false});
				alertify.confirm('<i class="fal fa-flag-alt"></i> '+_h("A-report_ask-0"), function(e){
					if(!e){
						$c.parent().css({opacity: 0.5});
						msg("📝 "+_h("A-report_ask-2"));

						report_abuse("被檢舉", greeting_id, comment_id, $c.text());

						ga_evt_push("Comment Reported", {
							event_category: "Posts", 
							event_label: "Comment Reported"
						});
						fb_evt_push("Comment Reported");
					}
				});
			}
			else{
				msg('<i class="fal fa-door-open"></i>'+_h("A-signin-2"));
			}
		});
	}
}

function report_abuse(category, greeting_id, comment_id, comment){
	// forms.gle/z6gzojN2h8ewF5vd9
	gform_post("1FAIpQLSdPi8fPhBq6KN1ok8h6fK8h5At0SO0qANuNlDCNk6VDoVjjuA", {
		"entry.783049182": getcookie("hearty_u"), 
		"entry.866865386": getcookie("hearty_id"), 
		"emailAddress": getcookie("hearty_em"), 
		"entry.527303026": "說晚安留言 ("+(category||"")+")", 
		"entry.355700800": greeting_id || "", 
		"entry.1270264487": comment_id || "", 
		"entry.1592095357": (comment || "").trim(), 
		"entry.1259076046": today(8), 
		"entry.124585191": check_browser()+", "+check_OS()
	});
}

function alice_signin_required(){
	hj_update({action: "account_status"}).then(function(r){
		if(r["Status"]===1) location.reload(true);
	});
	alice_signin_ask();
}
	function alice_signin_ask(f){
		let u = "?r="+location.href.split("#")[0].split("?")[0].replace(location.origin, "")+"#signin";
		if(f){
			hj_href(u);
		}
		else{
			alertify.set({labels: {ok: '<i class="fas fa-door-open"></i> '+_h("A-signin-0"), cancel: _h("A-no")}});
			alertify.confirm('<i class="fal fa-user-lock"></i> '+_h("A-signin-1"), function(e){
				if(e) hj_href(u);
			});
		}
	}

function profile_popup(username, nickname, profile_image, gender){
	let $p = $(".goodnight .profile");
	if(username==null){
		$p.fadeOut("fast");
	}
	else{
		$p.find(".avatar").css({
			"background-image": "url(//i.hearty.app/u/"+profile_image+")"
		});
		$p.find("[data-n]").attr({title: nickname, "data-gender": gender});
		$p.find("[data-link]").attr({
			"data-username": username, 
			"data-nickname": nickname
		});
		$p.find("[data-penpal_add]").attr({
			"data-username": username
		});
		$p.fadeIn("fast");
	}
}

function penpal_waitlist(){
	if(user_verify()){
		try{
			// Android App 上會閃退
			if(check_hjapp("Android")){
				penpal_waitlist_redirect();
			}
			else{
				$(".mask").show();
				hj_fcm_init(penpal_waitlist_redirect);
			}
		}
		catch(e){
			penpal_waitlist_redirect();
		}
	}
	else{
		user_verify(true);
	}
}
	function penpal_waitlist_redirect(){
		$(".mask").hide();
		alice_greeting_read(31);
		alice_opinions_toggle();
	}

function penpal_add(id){
	alertify.set({labels: {ok: '<i class="fas fa-paw-claws"></i> '+_h("A-penpal_add-2"), cancel: _h("A-no")}, buttonReverse: false});
	alertify.confirm('<i class="fal fa-user-edit"></i> '+_h("A-penpal_add-0", {$id: id})+'<br><i class="fal fa-info-circle"></i> '+_h("A-penpal_add-1"), function(e){
		if(e) hj_href("d?penpal_add="+id);
	});
}

// 將推播帶的參數，寫入 cookie
function account_prefilling(){
	let u = getUrlPara("a");
	if(!!u && !getcookie("hearty_account"))
		setcookie("hearty_account", u, 90);
}

// regexr.com/7p83p
function banned_words(p){
	return /http|www.|死|自(殘|残|殺|杀)|白(癡|痴|目)|北七|智障|腦殘|脑残|婊子|三小|(機|机)掰|大便|屎|屌|賤|贱|他(媽|妈)的|e04|(幹|干)你|你娘|拎老|靠北|夭(壽|寿)|外(送茶|約)|(約|正)妹|加賴|(性|做|愛)愛|(打|約)(炮|砲)|(全|半|無|戴)套|口(交|爆)|(內|顏|颜)射|(性|援|肛)交|一夜情|女優|(叫|找)小姐|(春|壯陽)(藥|药)|持久液|早洩|陽痿|(娛樂|娱乐)城|博奕|賭場|赌场|中((華|华)(人|)民(共和|)|)(國|国|共)|政府|(執|执)政|共(產|产)|黨|党|海(峽|峡)|(兩|两)岸|(習|习)近平|李(|克)(強|强)|郭文(貴|贵)|閆麗夢|闫丽梦|(希|西)塔|阿卡(西|夏)|大(師|师)|(師|师)(傅|父)|薩滿|萨满|頌缽|颂钵|通(靈|灵)|(靈|灵)(性|魂|體|体|數|数|命|氣|气)|梵|(顯|显)化|磁(場|场)|命(理|盤|盘)|脈輪|脉轮|(覺|觉)醒|魔法|算命|八字|紫薇|斗數|卜卦|(風|风)水|易(經|经|卦)|星(盤|盘)|(瑪|玛)雅曆|佛|南(無|无)|菩(提|薩|萨)|如(來|来)|(觀|观)音|修(行|士)|法(門|门)|妙法|大悲|(業|业)(障|力)|淨土|慧炬|心語|萊豬|莱猪|\s+(fuck|shit|bitch|asshole|dick)|\s+(fuck|shit|bitch|asshole|dick)/i.test(p||"");
}
