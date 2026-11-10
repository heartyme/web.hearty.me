/* alertify-js v0.3.11 (modified)

Modified:
The “keyup” event in the function was changed to “keydown” to ensure that when users are selecting characters using an input method editor (IME), accidentally pressing enter won’t submit the form.
Refactored for modern browsers (no IE fallbacks / vendor prefixes); public API unchanged.

Original JS:
https://cdn.jsdelivr.net/npm/alertify-js@0.3.12/lib/alertify.min.js

Issue reported:
https://github.com/MohammadYounes/AlertifyJS/issues/276
*/

!function (win) {
	"use strict";
	const doc = win.document,
		END = "transitionend",
		KEY = {ENTER: 13, ESC: 27, SPACE: 32},
		$id = id => doc.getElementById(id),
		on = (el, type, fn) => el.addEventListener(type, fn, false),
		off = (el, type, fn) => el.removeEventListener(type, fn, false),
		// <button> 的 class 與 id 共用同一名稱（ok / cancel）
		button = (name, label, submit) => '<button' + (submit ? ' type="submit"' : '') + ' class="alertify-button alertify-button-' + name + '" id="alertify-' + name + '">' + label + '</button>',
		// 取得既有元素，或建立後加到 <body>
		mount = (tag, id, className) => {
			let el = $id(id);
			if (!el) {
				el = doc.createElement(tag);
				el.id = id;
				el.className = className;
				doc.body.appendChild(el);
			}
			return el;
		};

	const factory = () => {
		let cover, dialogEl, logs, // 遮罩、對話框、通知容器
			btnOk, btnCancel, input, focusEl, resetFocus, resetFocusBack, // 目前對話框內的元素
			lastFocus, // 開啟對話框前的焦點元素，關閉後還原
			isOpen = false,
			queue = [];

		const core = {
			labels: {ok: "OK", cancel: "Cancel"},
			delay: 5e3,
			buttonReverse: false,
			buttonFocus: "ok",

			addListeners(fn) {
				const ok = btnOk, cancel = btnCancel, inp = input, reset = resetFocus, back = resetFocusBack,
					close = ev => {
						ev.preventDefault();
						off(doc.body, "keydown", onKey);
						off(reset, "focus", onFocus);
						off(back, "focus", onFocus);
						ok && off(ok, "click", onOk);
						cancel && off(cancel, "click", onCancel);
						core.hide();
					},
					onOk = ev => {
						const val = inp && inp.value; // 先取值，避免 hide() 顯示下一個對話框後讀到新的輸入框
						close(ev);
						typeof fn === "function" && (inp ? fn(true, val) : fn(true));
					},
					onCancel = ev => {
						close(ev);
						typeof fn === "function" && fn(false);
					},
					onKey = ev => {
						const key = ev.keyCode;
						if (inp ? key === KEY.ENTER : key === KEY.SPACE) onOk(ev);
						if (key === KEY.ESC && cancel) onCancel(ev);
					},
					// Tab 移出對話框時拉回焦點
					onFocus = () => {
						inp ? inp.focus() : (!cancel || core.buttonReverse ? ok : cancel).focus();
					};

				on(reset, "focus", onFocus);
				on(back, "focus", onFocus);
				ok && on(ok, "click", onOk);
				cancel && on(cancel, "click", onCancel);
				on(doc.body, "keydown", onKey);
			},

			handleErrors() {
				if (typeof win.onerror === "undefined") return false;
				const self = this;
				win.onerror = (msg, url, line) => {
					self.error("[" + msg + " on line " + line + " of " + url + "]", 0);
				};
				return true;
			},

			build(item) {
				const type = item.type,
					isPrompt = type === "prompt";
				let buttons = button("ok", this.labels.ok, isPrompt);
				if (isPrompt || type === "confirm") {
					const btn = button("cancel", this.labels.cancel);
					buttons = this.buttonReverse ? buttons + btn : btn + buttons;
				}
				dialogEl.className = "alertify alertify-" + type + " " + (item.cssClass || "");
				cover.className = "alertify-cover";
				return '<div class="alertify-dialog">'
					+ '<a id="alertify-resetFocusBack" class="alertify-resetFocus" href="#">Reset Focus</a>'
					+ (core.buttonFocus === "none" ? '<a href="#" id="alertify-noneFocus" class="alertify-hidden"></a>' : '')
					+ (isPrompt ? '<div id="alertify-form">' : '')
					+ '<article class="alertify-inner">'
					+ '<p class="alertify-message">' + item.message + '</p>'
					+ (isPrompt ? '<div class="alertify-text-wrapper"><input type="text" class="alertify-text" id="alertify-text"></div>' : '')
					+ '<nav class="alertify-buttons">' + buttons + '</nav>'
					+ '</article>'
					+ (isPrompt ? '</div>' : '')
					+ '<a id="alertify-resetFocus" class="alertify-resetFocus" href="#">Reset Focus</a>'
					+ '</div>';
			},

			// 通知：點擊或逾時後淡出移除；wait 為 0 時不自動消失
			close(el, wait) {
				const ms = wait && !isNaN(wait) ? +wait : this.delay,
					onEnd = ev => {
						ev.stopPropagation();
						off(el, END, onEnd);
						logs.removeChild(el);
						logs.hasChildNodes() || (logs.className += " alertify-logs-hidden");
					},
					dismiss = () => {
						if (el.parentNode === logs) {
							on(el, END, onEnd);
							el.className += " alertify-log-hide";
						}
					};
				on(el, "click", dismiss);
				wait !== 0 && setTimeout(dismiss, ms);
			},

			dialog(message, type, fn, placeholder, cssClass) {
				lastFocus = doc.activeElement;
				if (typeof message !== "string") throw new Error("message must be a string");
				if (typeof fn !== "undefined" && typeof fn !== "function") throw new Error("fn must be a function");
				this.init();
				queue.push({type, message, callback: fn, placeholder, cssClass});
				isOpen || this.setup();
				return this;
			},

			extend(type) {
				if (typeof type !== "string") throw new Error("extend method must have exactly one parameter");
				return function (message, wait) {
					this.log(message, type, wait);
					return this;
				};
			},

			hide() {
				queue.shift();
				if (queue.length) return this.setup(true);
				isOpen = false;
				const onEnd = ev => {
					ev.stopPropagation();
					off(dialogEl, END, onEnd);
				};
				on(dialogEl, END, onEnd);
				dialogEl.className = "alertify alertify-hide alertify-hidden";
				cover.className = "alertify-cover alertify-cover-hidden";
				lastFocus && lastFocus.focus();
			},

			init() {
				cover = mount("div", "alertify-cover", "alertify-cover alertify-cover-hidden");
				if (!$id("alertify")) {
					isOpen = false;
					queue = [];
				}
				dialogEl = mount("section", "alertify", "alertify alertify-hidden");
				logs = mount("section", "alertify-logs", "alertify-logs alertify-logs-hidden");
				doc.body.setAttribute("tabindex", "0");
			},

			log(message, type, wait) {
				this.init();
				logs.className = "alertify-logs";
				this.notify(message, type, wait);
				return this;
			},

			notify(message, type, wait) {
				const el = doc.createElement("article");
				el.className = "alertify-log" + (typeof type === "string" && type !== "" ? " alertify-log-" + type : "");
				el.innerHTML = message;
				logs.appendChild(el);
				setTimeout(() => {
					el.className += " alertify-log-show";
				}, 50);
				this.close(el, wait);
			},

			set(args) {
				for (const k in args) Object.prototype.hasOwnProperty.call(args, k) && (this[k] = args[k]);
			},

			setFocus() {
				if (input) {
					input.focus();
					input.select();
				}
				else focusEl && focusEl.focus();
			},

			setup(fromQueue) {
				const item = queue[0];
				isOpen = true;
				if (!fromQueue) {
					// 首次開啟：等進場動畫結束再設定焦點
					const onEnd = ev => {
						ev.stopPropagation();
						core.setFocus();
						off(dialogEl, END, onEnd);
					};
					on(dialogEl, END, onEnd);
				}
				dialogEl.innerHTML = this.build(item);
				resetFocus = $id("alertify-resetFocus");
				resetFocusBack = $id("alertify-resetFocusBack");
				btnOk = $id("alertify-ok");
				btnCancel = $id("alertify-cancel");
				input = $id("alertify-text");
				focusEl = core.buttonFocus === "cancel" ? btnCancel : core.buttonFocus === "none" ? $id("alertify-noneFocus") : btnOk;
				if (typeof item.placeholder === "string" && item.placeholder !== "") input.value = item.placeholder;
				fromQueue && this.setFocus();
				this.addListeners(item.callback);
			}
		};

		return {
			alert(message, fn, cssClass) {
				core.dialog(message, "alert", fn, "", cssClass);
				return this;
			},
			confirm(message, fn, cssClass) {
				core.dialog(message, "confirm", fn, "", cssClass);
				return this;
			},
			extend: core.extend,
			init: core.init,
			log(message, type, wait) {
				core.log(message, type, wait);
				return this;
			},
			prompt(message, fn, placeholder, cssClass) {
				core.dialog(message, "prompt", fn, placeholder, cssClass);
				return this;
			},
			success(message, wait) {
				core.log(message, "success", wait);
				return this;
			},
			error(message, wait) {
				core.log(message, "error", wait);
				return this;
			},
			set(args) {
				core.set(args);
			},
			labels: core.labels,
			debug: core.handleErrors
		};
	};

	typeof define === "function" ? define([], factory) : typeof win.alertify === "undefined" && (win.alertify = factory());
}(window);
