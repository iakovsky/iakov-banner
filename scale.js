// Scale a fixed-size stage to fit the viewport, preserving aspect ratio.
// Two layouts: desktop banner (1280x832) and mobile portrait (402x874).
(function () {
  var DESKTOP = { w: 1280, h: 832 };
  var MOBILE = { w: 402, h: 874 };
  var stage = document.querySelector(".stage");

  function isMobile() {
    return window.innerWidth < 700 || window.innerHeight / window.innerWidth > 1.15;
  }

  function fit() {
    var mobile = isMobile();
    var dim = mobile ? MOBILE : DESKTOP;

    document.body.classList.toggle("mobile", mobile);
    stage.style.width = dim.w + "px";
    stage.style.height = dim.h + "px";

    var scale = Math.min(window.innerWidth / dim.w, window.innerHeight / dim.h);
    stage.style.transform = "scale(" + scale + ")";
  }

  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
  fit();
})();
