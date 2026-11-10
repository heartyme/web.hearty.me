(function(factory){
	if(typeof define === "function" && define.amd) define(["../widgets/datepicker"], factory);
	else factory(jQuery.datepicker);
})(function(datepicker){
	"use strict";

	const months = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"],
		days = [..."日一二三四五六"];

	const zhTW = datepicker.regional["zh-TW"] = {
		closeText: "關閉",
		prevText: "&#x3C;上個月",
		nextText: "下個月&#x3E;",
		currentText: "今天",
		monthNames: months,
		monthNamesShort: months,
		dayNames: days.map(d => "星期"+d),
		dayNamesShort: days.map(d => "週"+d),
		dayNamesMin: days,
		weekHeader: "週",
		dateFormat: "yy/mm/dd",
		firstDay: 1,
		isRTL: false,
		showMonthAfterYear: true,
		yearSuffix: "年"
	};

	datepicker.setDefaults(zhTW);
	return zhTW;
});
