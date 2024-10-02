"use strict";

// Browse
try{
	if(/hearty\.me/i.test(location.hostname||"")){
		(function(){
		var VARemoteLoadOptions = {
		whiteLabel: {id: 8, siteId: 2640, domain: 't.adotone.com'},
		locale: "en-US", mkt: true
		};
		(function (c, o, n, v, e, r, l, y){
		c['VARemoteLoadOptions'] = e; r = o.createElement(n), l = o.getElementsByTagName(n)[0];
		r.async = 1; r.src = v; l.parentNode.insertBefore(r, l);
		})(window, document, 'script', '//cdn.adotone.com/javascripts/va.js', VARemoteLoadOptions);
		})();
	}
}
catch(e){}


// CPS
try{
	(function(){
	var VARemoteLoadOptions = {
	whiteLabel: {id: 8, siteId: 2640, domain: 't.adotone.com'},
	conversion: true,
	conversionData: {
	step: 'sale', 
	order: 0, 
	orderTotal: 99, 
	revenue: 90, 
	},
	locale: "en-US", mkt: true
	};
	(function (c, o, n, v, e, r, l, y){
	c['VARemoteLoadOptions'] = e; r = o.createElement(n), l = o.getElementsByTagName(n)[0];
	r.async = 1; r.src = v; l.parentNode.insertBefore(r, l);
	})(window, document, 'script', '//cdn.adotone.com/javascripts/va.js', VARemoteLoadOptions);
	})();
}
catch(e){}
