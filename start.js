// ---- Scale the fixed 1280x832 stage to fit the viewport ----
(function () {
  var stage = document.querySelector(".stage");
  function fit() {
    var s = Math.min(window.innerWidth / 1280, window.innerHeight / 832);
    stage.style.transform = "scale(" + s + ")";
  }
  window.addEventListener("resize", fit);
  window.addEventListener("orientationchange", fit);
  fit();
})();

// ---- Weather (geolocation -> Open-Meteo) ----
(function () {
  var stage = document.querySelector(".stage");
  var tempEl = document.querySelector(".temp-value");

  // Map WMO weather codes to one of the three visual states.
  function codeToState(code) {
    if (code === 0 || code === 1) return "sunny"; // clear / mainly clear
    // drizzle, rain, freezing rain, showers, thunderstorm
    if (
      (code >= 51 && code <= 67) ||
      (code >= 80 && code <= 82) ||
      (code >= 95 && code <= 99)
    ) {
      return "rainy";
    }
    return "cloudy"; // partly cloudy, overcast, fog, snow (no snow asset)
  }

  function getGeo() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) return reject();
      navigator.geolocation.getCurrentPosition(
        function (p) { resolve({ lat: p.coords.latitude, lon: p.coords.longitude }); },
        function () { reject(); },
        { timeout: 8000, maximumAge: 600000 }
      );
    });
  }

  async function getIpLocation() {
    var r = await fetch("https://ipapi.co/json/");
    var j = await r.json();
    if (j && j.latitude != null) return { lat: j.latitude, lon: j.longitude };
    throw new Error("no ip location");
  }

  async function loadWeather() {
    var loc;
    try {
      loc = await getGeo();
    } catch (e) {
      try { loc = await getIpLocation(); } catch (e2) { return; } // keep default
    }

    var url =
      "https://api.open-meteo.com/v1/forecast?latitude=" + loc.lat +
      "&longitude=" + loc.lon + "&current=temperature_2m,weather_code";
    try {
      var r = await fetch(url);
      var j = await r.json();
      var t = Math.round(j.current.temperature_2m);
      tempEl.textContent = t + "°C";
      stage.dataset.weather = codeToState(j.current.weather_code);
    } catch (e) {
      /* keep default display */
    }
  }

  loadWeather();
})();
