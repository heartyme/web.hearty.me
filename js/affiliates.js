"use strict";

// Browse：載入 adotone 追蹤碼（僅限 hearty.me 網域）
try{
	if(/hearty\.me/i.test(location.hostname)){
		window.VARemoteLoadOptions = {
			whiteLabel: {id: 8, siteId: 2640, domain: "t.adotone.com"},
			locale: "en-US",
			mkt: true
		};
		const s = document.createElement("script");
		s.async = true;
		s.src = "//cdn.adotone.com/javascripts/va.js";
		document.head.appendChild(s);
	}
}
catch(e){}
