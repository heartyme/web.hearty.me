(w => {
  const j = w.jQuery;
  if (!j) {
    alert("Please disable Adblock & clean caches\n請停用 Adblock 及清除快取");
    w.open("https://nien.co/caches", "_blank");
    throw new Error("jQuery not loaded");
  }

  // 須明確指定 writable/configurable：屬性已存在時，未指定的屬性會沿用原值（true）
  const d = {value: j, writable: false, configurable: false};
  Object.defineProperties(w, {jQuery: d, $: d});
})(window);
