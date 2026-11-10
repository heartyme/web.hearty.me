"use strict";

var a2hsPrompt = null;

function a2hs_active(callback){
	window.addEventListener("beforeinstallprompt", (e) => {
		e.preventDefault();
		a2hsPrompt = e;
		if(typeof callback=="function") callback();
	});
}

function a2hs_init(){
	// 記錄所有平台的安裝（含從網址列、瀏覽器選單安裝）
	window.addEventListener("appinstalled", a2hs_installed);

	if(!a2hs_desktop()) return;

	a2hs_active(function(){
		// macOS：以 PWA 取代原本的 get_app() 下載
		$("[data-os='Macintosh']").removeAttr("onclick");

		// 由於 Windows 上的 PWA 不會自動 (1)加到桌面 (2)釘選至工具列
		// 因此安裝 PWA 時，保留 get_app() 同時提供 exe 桌面版
		// （加命名空間：beforeinstallprompt 再次觸發時不會重複綁定）
		$("[data-os='Windows'],[data-os='Macintosh']").off("click.a2hs").on("click.a2hs", a2hs);
	});
}
	function a2hs_desktop(){
		return /Windows|Macintosh/i.test(check_OS());
	}
	function a2hs_hide(){
		$("[data-os='Windows'],[data-os='Macintosh']").hide();
	}

function a2hs(){
	const p = a2hsPrompt;
	if(!p) return; // 尚未觸發 beforeinstallprompt，或已使用過（prompt() 只能呼叫一次）
	a2hsPrompt = null;

	p.prompt().catch(() => {}); // 安裝與否改由 appinstalled 事件記錄
	a2hs_hide();
}

function a2hs_installed(){
	// 已安裝：原本存下的 prompt 失效，桌面版按鈕一併隱藏
	a2hsPrompt = null;
	if(a2hs_desktop()) a2hs_hide();

	// forms.gle/ZczTx6VcsNKbx5yh8
	hj_update({
		action: "gform_post",
		uri: "1FAIpQLScP9-lJvoR85jpd3MPZ_fw5SW2eqjD3rLVFq-LRbrWYwuiMXg",
		data: $.param({
			"entry.986370885": "[hj_user_id]",
			"entry.381916775": "[hj_username]",
			"entry.77022907": "[hj_email]",
			"emailAddress": "[hj_email]",
			"entry.152912059": check_OS(),
			"entry.128593849": check_browser()+" "+check_Chrome_Ver()
		})
	});
	const evt = "PWA Installed";
	ga_evt_push(evt, {event_category: evt});
}
	function check_Chrome_Ver(){
		const r = (navigator.userAgent||"").match(/Chrom(?:e|ium)\/(\d+)\./);
		return r ? parseInt(r[1], 10) : "";
	}

// App Store 上架隱藏
function appstore_review_hiding(){
	// macOS 2.1.1 版
	if(!/Hearty_macOS\/2\.1\.1/i.test(navigator.userAgent||"")) return;

	$(function(){
		$([
			".home_footer .non-iOSapp",
			".mh-head .fa-gift",
			".popup.upgrade",
			".popup.purchase",
			".menu [data-btn='upgrade']",
			".menu .menu_apps",
			".menu .tabs_bottom",
			".notifications li[data-notification_id='6']",
			".nav_toggle_account"
		].join(",")).remove();
	});
}
