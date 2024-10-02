/* alertify-js v0.3.11 (modified)

Modified: 
The “keyup” event in the function was changed to “keydown” to ensure that when users are selecting characters using an input method editor (IME), accidentally pressing enter won’t submit the form.

Original JS: 
https://cdn.jsdelivr.net/npm/alertify-js@0.3.12/lib/alertify.min.js

Issue reported: 
https://github.com/MohammadYounes/AlertifyJS/issues/276
*/

 ! function(a, b) {
    "use strict";
    var c, d = a.document;
    c = function() {
        var c, e, f, g, h, i, j, k, l, m, n, o, p, q = {},
            r = {},
            s = !1,
            t = {
                ENTER: 13,
                ESC: 27,
                SPACE: 32
            },
            u = [];
        return r = {
            buttons: {
                holder: '<nav class="alertify-buttons">{{buttons}}</nav>',
                submit: '<button type="submit" class="alertify-button alertify-button-ok" id="alertify-ok">{{ok}}</button>',
                ok: '<button class="alertify-button alertify-button-ok" id="alertify-ok">{{ok}}</button>',
                cancel: '<button class="alertify-button alertify-button-cancel" id="alertify-cancel">{{cancel}}</button>'
            },
            input: '<div class="alertify-text-wrapper"><input type="text" class="alertify-text" id="alertify-text"></div>',
            message: '<p class="alertify-message">{{message}}</p>',
            log: '<article class="alertify-log{{class}}">{{message}}</article>'
        }, p = function() {
            var a, c, e = !1,
                f = d.createElement("fakeelement"),
                g = {
                    WebkitTransition: "webkitTransitionEnd",
                    MozTransition: "transitionend",
                    OTransition: "otransitionend",
                    transition: "transitionend"
                };
            for (a in g)
                if (f.style[a] !== b) {
                    c = g[a], e = !0;
                    break
                } return {
                type: c,
                supported: e
            }
        }, c = function(a) {
            return d.getElementById(a)
        }, q = {
            labels: {
                ok: "OK",
                cancel: "Cancel"
            },
            delay: 5e3,
            buttonReverse: !1,
            buttonFocus: "ok",
            transition: b,
            addListeners: function(a) {
                var b, c, i, j, k, l = "undefined" != typeof f,
                    m = "undefined" != typeof e,
                    n = "undefined" != typeof o,
                    p = "",
                    q = this;
                b = function(b) {
                    return "undefined" != typeof b.preventDefault && b.preventDefault(), i(b), "undefined" != typeof o && (p = o.value), "function" == typeof a && ("undefined" != typeof o ? a(!0, p) : a(!0)), !1
                }, c = function(b) {
                    return "undefined" != typeof b.preventDefault && b.preventDefault(), i(b), "function" == typeof a && a(!1), !1
                }, i = function(a) {
                    q.hide(), q.unbind(d.body, "keydown", j), q.unbind(g, "focus", k), l && q.unbind(f, "click", b), m && q.unbind(e, "click", c)
                }, j = function(a) {
                    var d = a.keyCode;
                    (d === t.SPACE && !n || n && d === t.ENTER) && b(a), d === t.ESC && m && c(a)
                }, k = function(a) {
                    n ? o.focus() : !m || q.buttonReverse ? f.focus() : e.focus()
                }, this.bind(g, "focus", k), this.bind(h, "focus", k), l && this.bind(f, "click", b), m && this.bind(e, "click", c), this.bind(d.body, "keydown", j), this.transition.supported || this.setFocus()
            },
            bind: function(a, b, c) {
                "function" == typeof a.addEventListener ? a.addEventListener(b, c, !1) : a.attachEvent && a.attachEvent("on" + b, c)
            },
            handleErrors: function() {
                if ("undefined" != typeof a.onerror) {
                    var b = this;
                    return a.onerror = function(a, c, d) {
                        b.error("[" + a + " on line " + d + " of " + c + "]", 0)
                    }, !0
                }
                return !1
            },
            appendButtons: function(a, b) {
                return this.buttonReverse ? b + a : a + b
            },
            build: function(a) {
                var b = "",
                    c = a.type,
                    d = a.message,
                    e = a.cssClass || "";
                switch (b += '<div class="alertify-dialog">', b += '<a id="alertify-resetFocusBack" class="alertify-resetFocus" href="#">Reset Focus</a>', "none" === q.buttonFocus && (b += '<a href="#" id="alertify-noneFocus" class="alertify-hidden"></a>'), "prompt" === c && (b += '<div id="alertify-form">'), b += '<article class="alertify-inner">', b += r.message.replace("{{message}}", d), "prompt" === c && (b += r.input), b += r.buttons.holder, b += "</article>", "prompt" === c && (b += "</div>"), b += '<a id="alertify-resetFocus" class="alertify-resetFocus" href="#">Reset Focus</a>', b += "</div>", c) {
                    case "confirm":
                        b = b.replace("{{buttons}}", this.appendButtons(r.buttons.cancel, r.buttons.ok)), b = b.replace("{{ok}}", this.labels.ok).replace("{{cancel}}", this.labels.cancel);
                        break;
                    case "prompt":
                        b = b.replace("{{buttons}}", this.appendButtons(r.buttons.cancel, r.buttons.submit)), b = b.replace("{{ok}}", this.labels.ok).replace("{{cancel}}", this.labels.cancel);
                        break;
                    case "alert":
                        b = b.replace("{{buttons}}", r.buttons.ok), b = b.replace("{{ok}}", this.labels.ok)
                }
                return l.className = "alertify alertify-" + c + " " + e, k.className = "alertify-cover", b
            },
            close: function(a, b) {
                var c, d, e = b && !isNaN(b) ? +b : this.delay,
                    f = this;
                this.bind(a, "click", function() {
                    c(a)
                }), d = function(a) {
                    a.stopPropagation(), f.unbind(this, f.transition.type, d), m.removeChild(this), m.hasChildNodes() || (m.className += " alertify-logs-hidden")
                }, c = function(a) {
                    "undefined" != typeof a && a.parentNode === m && (f.transition.supported ? (f.bind(a, f.transition.type, d), a.className += " alertify-log-hide") : (m.removeChild(a), m.hasChildNodes() || (m.className += " alertify-logs-hidden")))
                }, 0 !== b && setTimeout(function() {
                    c(a)
                }, e)
            },
            dialog: function(a, b, c, e, f) {
                j = d.activeElement;
                var g = function() {
                    m && null !== m.scrollTop && k && null !== k.scrollTop || g()
                };
                if ("string" != typeof a) throw new Error("message must be a string");
                if ("string" != typeof b) throw new Error("type must be a string");
                if ("undefined" != typeof c && "function" != typeof c) throw new Error("fn must be a function");
                return this.init(), g(), u.push({
                    type: b,
                    message: a,
                    callback: c,
                    placeholder: e,
                    cssClass: f
                }), s || this.setup(), this
            },
            extend: function(a) {
                if ("string" != typeof a) throw new Error("extend method must have exactly one parameter");
                return function(b, c) {
                    return this.log(b, a, c), this
                }
            },
            hide: function() {
                var a, b = this;
                u.splice(0, 1), u.length > 0 ? this.setup(!0) : (s = !1, a = function(c) {
                    c.stopPropagation(), b.unbind(l, b.transition.type, a)
                }, this.transition.supported ? (this.bind(l, this.transition.type, a), l.className = "alertify alertify-hide alertify-hidden") : l.className = "alertify alertify-hide alertify-hidden alertify-isHidden", k.className = "alertify-cover alertify-cover-hidden", j.focus())
            },
            init: function() {
                d.createElement("nav"), d.createElement("article"), d.createElement("section"), null == c("alertify-cover") && (k = d.createElement("div"), k.setAttribute("id", "alertify-cover"), k.className = "alertify-cover alertify-cover-hidden", d.body.appendChild(k)), null == c("alertify") && (s = !1, u = [], l = d.createElement("section"), l.setAttribute("id", "alertify"), l.className = "alertify alertify-hidden", d.body.appendChild(l)), null == c("alertify-logs") && (m = d.createElement("section"), m.setAttribute("id", "alertify-logs"), m.className = "alertify-logs alertify-logs-hidden", d.body.appendChild(m)), d.body.setAttribute("tabindex", "0"), this.transition = p()
            },
            log: function(a, b, c) {
                var d = function() {
                    m && null !== m.scrollTop || d()
                };
                return this.init(), d(), m.className = "alertify-logs", this.notify(a, b, c), this
            },
            notify: function(a, b, c) {
                var e = d.createElement("article");
                e.className = "alertify-log" + ("string" == typeof b && "" !== b ? " alertify-log-" + b : ""), e.innerHTML = a, m.appendChild(e), setTimeout(function() {
                    e.className = e.className + " alertify-log-show"
                }, 50), this.close(e, c)
            },
            set: function(a) {
                var b;
                if ("object" != typeof a && a instanceof Array) throw new Error("args must be an object");
                for (b in a) a.hasOwnProperty(b) && (this[b] = a[b])
            },
            setFocus: function() {
                o ? (o.focus(), o.select()) : i.focus()
            },
            setup: function(a) {
                var d, j = u[0],
                    k = this;
                s = !0, d = function(a) {
                    a.stopPropagation(), k.setFocus(), k.unbind(l, k.transition.type, d)
                }, this.transition.supported && !a && this.bind(l, this.transition.type, d), l.innerHTML = this.build(j), g = c("alertify-resetFocus"), h = c("alertify-resetFocusBack"), f = c("alertify-ok") || b, e = c("alertify-cancel") || b, i = "cancel" === q.buttonFocus ? e : "none" === q.buttonFocus ? c("alertify-noneFocus") : f, o = c("alertify-text") || b, n = c("alertify-form") || b, "string" == typeof j.placeholder && "" !== j.placeholder && (o.value = j.placeholder), a && this.setFocus(), this.addListeners(j.callback)
            },
            unbind: function(a, b, c) {
                "function" == typeof a.removeEventListener ? a.removeEventListener(b, c, !1) : a.detachEvent && a.detachEvent("on" + b, c)
            }
        }, {
            alert: function(a, b, c) {
                return q.dialog(a, "alert", b, "", c), this
            },
            confirm: function(a, b, c) {
                return q.dialog(a, "confirm", b, "", c), this
            },
            extend: q.extend,
            init: q.init,
            log: function(a, b, c) {
                return q.log(a, b, c), this
            },
            prompt: function(a, b, c, d) {
                return q.dialog(a, "prompt", b, c, d), this
            },
            success: function(a, b) {
                return q.log(a, "success", b), this
            },
            error: function(a, b) {
                return q.log(a, "error", b), this
            },
            set: function(a) {
                q.set(a)
            },
            labels: q.labels,
            debug: q.handleErrors
        }
    }, "function" == typeof define ? define([], function() {
        return new c
    }) : "undefined" == typeof a.alertify && (a.alertify = new c)
}(window);