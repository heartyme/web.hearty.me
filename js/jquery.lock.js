if(!window.jQuery){
  alert("Please disable Adblock & clean caches\n請停用 Adblock 及清除快取");
  window.open("https://nien.co/caches", "_blank");
  throw new Error("jQuery not loaded");
}

Object.defineProperty(window, 'jQuery', {value: jQuery, writable: !1, configurable: !1});
Object.defineProperty(window, '$', {value: jQuery, writable: !1, configurable: !1});