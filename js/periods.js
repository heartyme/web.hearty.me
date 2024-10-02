"use strict";

period_lookup();

function period_add(day_id, day_start, day_end, day_interval){
	var day_id = day_id || 0, 
		today2 = today(), 
		tomorrow = new Date(new Date().getTime()+8.64e7).toLocaleDateString("sv"), 
		day_pattern = "20[0-2][0-9]-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])", 
		day_start = day_start || "", 
		day_end = day_end || "", 
		day_interval = day_interval || 0, 
		day_start_f = date_format(day_start || today2), 
		day_end_f = !day_end ? "" : date_format(day_end), 
		$pd = $(".periods"), 
		$interval = $("<div>", {
			class: "td td1 period_interval"+(day_id>0 && (day_interval<18 || day_interval>=38) ? " ng" : "")
		}).text(day_id>0 ? day_interval : ""), 
		$remove = $("<div>", {
			class: "td td1 period_removal", 
			title: _h("e-pd-10"), 
			html: $("<span>", {
				class: "period_remove", 
				onclick: "period_remove("+day_id+")"
			})
		}), 
		$start = {
			td: $("<div>", {
					class: "td td2 period_start display", 
					"data-dayid": day_id, 
					"data-day": day_start==today2 ? _h("e-pd-8") : day_start_f, 
					title: day_start_f, 
					onclick: "period_editing_toggle(true,this.dataset.dayid,0)"
				}), 
			td_inner: $("<div>", {onclick: "event.stopPropagation()"}), 
			edit: $("<input>", {
					type: "date", 
					pattern: day_pattern, 
					max: tomorrow, 
					onchange: "if(!this.value) this.value='"+today2+"'; else period_update('start',"+day_id+",this.value)", 
					required: true, 
					autofocus: !day_start
				}).val(day_start), 
			ok: $("<div>", {
					class: "ok", 
					onclick: "period_editing_toggle(false,"+day_id+")", 
					title: _h("e-ok-0")
				})
		}, 
		$end = {
			td: $("<div>", {
					class: "td td2 period_end display", 
					"data-dayid": day_id, 
					"data-day": day_end==today2 ? _h("e-pd-8") : day_end_f, 
					title: day_end_f, 
					onclick: "period_editing_toggle(true,this.dataset.dayid,1)"
				}), 
			td_inner: $("<div>", {onclick: "event.stopPropagation()"}), 
			edit: $("<input>", {
					type: "date", 
					pattern: day_pattern, 
					list: "ls_"+day_id, 

					// min: 經期起始後 2天
					min: !day_start ? "" : period_add_days(day_start, 2), 

					// max: 今天 & 經期起始後 14天，取其小
					max: !day_start ? today2 : [today2, period_add_days(day_start, 14)].reduce(function(a, b){return a<b ? a:b}), 
					onchange: "if(this.value!=='') period_update('end',"+day_id+",this.value)", 
					title: day_end_f, 
					disabled: !day_start
				}).val(day_end), 
			list: $("<datalist>", {id: "ls_"+day_id}), 
			ok: $("<div>", {
					class: "ok", 
					onclick: "period_editing_toggle(false,"+day_id+")", 
					title: _h("e-ok-0")
				})
		};

	// Datepicker for iOS & Safari on macOS
	// caniuse.com/input-datetime
	// min & max NOT support natively
	if(check_OS("iOS")||check_browser("Safari"))
		$start["edit"].add($end["edit"]).each(function(){
			$(this).attr({
				type: "text", 
				pattern: day_pattern, 
				onclick: "$(this).datepicker('show').select()", 
				readonly: ""
			}).datepicker({
				dateFormat: "yy-mm-dd", 
				changeMonth: true, 
				showAnim: "slideDown", 
				minDate: $(this).attr("min") || "", 
				maxDate: $(this).attr("max") || "", 
				showButtonPanel: true
			});
		});

	// 移除多的新增欄
	$pd.find("[data-dayid='0']").parent().remove();

	// 起始日
	$start = $start["td"].html(
		$start["td_inner"].append($start["edit"].add($start["ok"]))
	);

	// 結束日
	for(let d=6; d<9; d++)
		$end["list"].append(
			$("<option>").val(period_add_days(day_start, d))
		);

	$end = $end["td"].html(
		$end["td_inner"].append($end["edit"].add($end["list"]).add($end["ok"]))
	);

	$("<div>", {class: "period tr"})
		.append($start.add($end).add($interval).add($remove))
		.prependTo($pd.find(".records"));

	if(!day_id) period_editing_toggle(true, 0, 0);

	ga_evt_push("Period Day Added", {
		event_category: "Period Day", 
		event_label: "Added"
	});
}

function period_add_days(d, days){
	d = new Date(new Date(d).getTime()+days*8.64e7);
	return d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
}

function period_lookup(){
	var $pd = $(".periods");
	$pd.find(".records").slideUp("fast", function(){
		hj_update({action: "period_lookup"}).then(function(r){
			switch(r["Status"]){
				case 1:
					var v = r["Values"], 
						day_next = v["period_day_next"];
					$pd.find(".day_cycle").text(v["period_day_cycle"]);
					$pd.find(".day_next").text(date_format(day_next));
					period_days_between(day_next);

					$pd.find(".period").remove();
					v["periods"].forEach(function(d){
						period_add(
							d["day_id"], 
							d["day_start"], 
							d["day_end"], 
							d["day_interval"]
						);
					});

					if(v["periods"].length>0) $pd.find(".prediction").slideDown();
					else $pd.find(".prediction").slideUp();
					period_remove_btn(false);

					$pd.find(".records").slideDown("slow");
				break;
			}
		});
	});

	ga_evt_push("Period Day Lookup", {
		event_category: "Period Day", 
		event_label: "Lookup"
	});
}

function period_editing_toggle(on, day_id, i){
	var $pd = $(".periods");
	$pd.find("[data-dayid]").addClass("display");
	if(on){
		$pd.find("[data-dayid='"+day_id+"']").removeClass("display").find("input").eq(i==null ? 0 : i).focus();
		period_remove_btn(false);
	}
}

function period_update(type, day_id, day){
	if(day==null||day=="") return;

	var $pd = $(".periods"), 
		$r = $pd.find(".period_"+type+"[data-dayid='"+day_id+"']"), 
		day_f = date_format(day);

	period_editing_toggle(false, day_id);
	$r.attr({
		"data-day": day_f, 
		title: day_f
	});

	hj_update({
		action: "period_update",
		type: type, 
		day_id: day_id || 0, 
		day: day
	}).then(function(r){
		switch(r["Status"]){
			case 1:
				var day_id_new = r["Values"]["day_id"];

				// start: Refresh
				if(type=="start")
					period_lookup();

				// end
				else if(!day_id)
					$pd.find("[data-dayid=0]").attr({
						"data-dayid": day_id_new, 
						onclick: "period_editing_toggle(true,"+day_id_new+",1)"
					});

				ga_evt_push("Period Day Updated", {
					event_category: "Period Day", 
					event_label: "Updated"
				});
			break;
		}
	});
}

function period_remove_btn(on){
	var $pd = $(".periods"), 
		$i = $pd.find(".period_interval").add($pd.find(".day_trash")), 
		$r = $pd.find(".period_removal");

	if(!$pd.find(".period").length){
		$r.fadeOut(); $i.slideUp();
	}
	else if(on){
		$r.fadeIn(); $i.slideUp();
	}
	else{
		$r.fadeOut(); $i.slideDown();
	}
}

function period_remove(day_id){
	var $pd = $(".periods");
	if(!day_id){
		$pd.find("[data-dayid=0]").parent().fadeOut(300, function(){$(this).remove()}); return;
	}
	alertify.set({labels: {ok: _h("e-no-0"), cancel: '<i class="fas fa-times"></i> '+_h("e-pd-9")}, buttonReverse: true});
	alertify.confirm('<i class="fal fa-moon"></i> '+_h("e-pd-10"), function(e){
		if(!e){
			hj_update({
				action: "period_remove",
				day_id: day_id
			}).then(function(r){
				switch(r["Status"]){
					case 1:
						period_lookup();
						$pd.find(".period_removal").fadeOut();
						hj_vibrate(30);

						ga_evt_push("Period Day Removed", {
							event_category: "Period Day", 
							event_label: "Removed"
						});
					break;

					default:
						signin_required();
					break;
				}
				period_remove_btn(false);
			});
		}
	});
}

function period_days_between(period_day){
	var now = new Date(new Date().setHours(0,0,0)), 
		d_left = Math.round(
			(
				new Date(new Date(period_day).setHours(0,0,0)).getTime() - // 預測經期日
				now.getTime() // 現在
			)/8.64e7), 
		$d_left = $(".periods .days_left");

	switch(true){
		// 日期已過
		case (d_left<=0):
			d_left = Math.abs(d_left);
			if(d_left<7){
				d_left++;

				// 第 X天
				$d_left.text(_h("e-pd-11", {
					$d: d_left, 
					$th: nth(d_left)
				}));
			}
			else{
				$d_left.text(_h("e-pd-1"));
			}
		break;

		/* Day 1
		case (d_left<=7):
			$d_left.text(_h("e-pd-12", {$d: d_left})); // X天後
		break;
		*/

		// 剩 n天
		default:
			$d_left.text(_h("e-pd-12", {$d: d_left})); // X天後
		break;
	}
}
