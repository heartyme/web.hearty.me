var positioning_gps_deferred = $.Deferred();

if(navigator.geolocation){
	if("permissions" in navigator && "query" in navigator.permissions)
		navigator.permissions.query({name: "geolocation"}).then(function(status){  
			positioning_gps_trigger(!1, status.state);
			status.onchange = function(){  
				positioning_gps_trigger(!1, this.state);
			};
		});
}
positioning_agps();

function positioning_gps_trigger(on, state){
	// 主動請求授權，或原本就已授權，則打開 getCurrentPosition
	if(on || state=="granted"){
		navigator.geolocation.getCurrentPosition(positioning_gps, positioning_gps_error_handling, {
			enableHighAccuracy: true, 
			maximumAge: Infinity, 
			timeout: 10000
		});
	}
}

function positioning_gps(pos){
	if(!getcookie("hearty_position_gps").length){
		$.ajax({
			type: "POST", 
			url: location.origin+"/positioning.php", 
			data: {
				action: "positioning_gps", 
				latitude: pos.coords.latitude, 
				longitude: pos.coords.longitude, 
				accuracy: pos.coords.accuracy
			}, 
			async: true
		}).then(function(){
			window.positioning_gps_deferred.resolve();

			ga_evt_push("Positioning", {
				event_category: "Query GPS Data", 
				event_label: "Queued"
			});
		});
	}
}

function positioning_agps(){
	if(!getcookie("hearty_position_agps").length){
		hj_ip().then(function(d){
			var ip_addr = (d["ip"]||"").trim();
			$.ajax({
				type: "POST", 
				url: location.origin+"/positioning.php", 
				data: {
					action: "positioning_agps", 
					ip_addr: ip_addr
				}, 
				async: true
			}).then(function(){
				ga_evt_push("Positioning", {
					event_category: "Query AGPS Data", 
					event_label: "Queued"
				});
			});
		});
	}
}

function positioning_gps_error_handling(err){
	window.positioning_gps_deferred.reject();

	var s = "";
	switch(err.code){
		case err.PERMISSION_DENIED:
			s = "Denied";
			alertify.error('<i class="fas fa-ban"></i> 裝置不提供定位 Location Access is Denied');
		break;

		case err.POSITION_UNAVAILABLE:
			s = "Unavailable";
			if(!getcookie("hearty_position_gps_unavailable").length){
				setcookie("hearty_position_gps_unavailable", 1, 1);

				msg('<i class="fal fa-map-marker-alt-slash"></i> 無法定位 No Location Info');
			}
		break;

		case err.TIMEOUT:
			s = "Timeout";
		break;

		default: // case err.UNKNOWN_ERROR:
			s = "Unknown Error";
		break;
    }

	$("body").removeClass("loading");

	ga_evt_push("Positioning", {
		event_category: "Query GPS Data", 
		event_label: s
	});
}

function positioning_gps_reset_support(){
	var u;
	switch(check_browser()){
		case "Safari":
			u = "support.apple.com/HT20"+(check_OS("iOS") ? "7092" : "4690");
		break;

		case "Firefox":
			u = "support.mozilla.org/kb/does-firefox-share-my-location-websites";
		break;

		case "OPR":
			u = "help.opera.com/geolocation";
		break;

		case "Edg":
			u = "support.microsoft.com/help/4536154";
		break;

		default:
			u = "support.google.com/chrome/answer/142065";
		break;
	}
	return "//"+u;
}