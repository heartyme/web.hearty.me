"use strict";

var btn_alias = "bible";

$(function(){
	post_font();
	var $v = $(".verse");

	// iOS 及 Android App 上，不支援 blob
	// 改用 a[download]
	if(check_hjapp()) 
		$v.attr({
			href: "//i0.wp.com/"+$v.attr("data-url").replace(/(^\w+:|^)\/\//, ''), 
			download: "今日經文"
		}).find("picture").removeAttr("onclick");

	// Android App 直接打開
	if(check_hjapp("Android")) $v.attr({target: "_blank"});
});
leave_InAppBrowser();

function pray(d){
	open_url("//docs.google.com/forms/d/e/1FAIpQLSdfaYUU2iv1tDp6yUQIfaXzj9mGfs-mtfeY8E-5JmK4VmTXMA/viewform?emailAddress="+(d.email||"")+"&entry.1443996158="+(d.nickname||"")+"&entry.1160286885=%E7%84%A1%20%28%E6%BA%AB%E5%BA%A6%E6%97%A5%E8%A8%98%29");
	ga_evt_push("Pray", {event_category: "Pray"});
}

function youversion(){
	open_url("//www.bible.com/zh-TW/verse-of-the-day?day="+dayoftheyear());
	ga_evt_push("Bible Youversion", {event_category: "Bible Youversion"});
}
	function dayoftheyear(){
		var today = new Date();
		return Math.round(((today-new Date(today.getFullYear(),0,1))/1000/60/60/24)+.5,0);
	}

/*
function forceDownload(url, filename){
	fetch(url).then(function(t){
		return t.blob().then((b)=>{
			$("<a>", {
				href: (window.URL || window.webkitURL).createObjectURL(b), 
				download: filename
			}).get(0).click();
		});
	});

	hj_getFile(url, filename)
}

	function forceDownload2(url, fileName){
		var xhr = new XMLHttpRequest();
		xhr.open("GET", url, true);
		xhr.responseType = "blob";
		xhr.onload = function(){
			var a = document.createElement("a");
			a.href = (window.URL || window.webkitURL).createObjectURL(this.response);
			a.download = fileName;
			// document.body.appendChild(a);
			a.click();
			// document.body.removeChild(a);
		}
		xhr.send();
	}
*/
