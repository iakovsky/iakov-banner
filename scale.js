// Scale fixed 1280x832 stage to fit viewport, preserving aspect ratio.
(function () {
  var W = 1280, H = 832;
  var stage = document.querySelector(".stage");

  function fit() {
    var scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    stage.style.transform = "scale(" + scale + ")";
  }

  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
  fit();
})();
