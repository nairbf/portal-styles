/* Signature DJ Events — client portal enhancements
 * ---------------------------------------------------------------------------
 * WHERE THIS GOES: DJEP -> Website Tools -> Client Portal -> your profile ->
 * Advanced Settings -> Custom Scripting Code, as:
 *
 *   <script src="https://nairbf.github.io/portal-styles/portal-enhancements.js"></script>
 *
 * This REPLACES the countdown-colors.js tag — it already includes it.
 *
 * Does two things:
 *   1. Adds the viewport meta tag DJEP omits. Without it, phones lay the page
 *      out at 980px and scale it down, so every mobile rule in portal.css
 *      never matches. This is what makes the responsive styles apply at all.
 *   2. Recolours the countdown rings, which are painted into a <canvas> by
 *      DJEP's own script and so cannot be reached from CSS.
 *
 * Nothing here changes portal behaviour, data, or DJEP's own scripts.
 * Remove the tag and everything reverts.
 */

(function () {

  /* ---- 1. Viewport ------------------------------------------------------ */
  try {
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement("meta");
      vp.name = "viewport";
      (document.head || document.documentElement).appendChild(vp);
    }
    vp.setAttribute("content", "width=device-width, initial-scale=1");
  } catch (e) { /* never block the page */ }

  /* ---- 2. Countdown ring colours ---------------------------------------- */
  function patchCountdown() {
    if (typeof ringer === "undefined" || !ringer.unit) { return false; }

    ringer.unit = function (idx, label, ring) {
      /* hex inlined so ringer.unit.toString() shows them: C6A15B / 102A3A */
      var $r = ringer;
      var x, y, value, ring_secs = ring.s;

      value = parseFloat($r.time / ring_secs);
      $r.time -= Math.round(parseInt(value)) * ring_secs;
      value = Math.abs(value);

      x = $r.r_size * 0.5 + $r.r_thickness * 0.5;
      x += +(idx * ($r.r_size + $r.r_spacing + $r.r_thickness));
      y = $r.r_size * 0.5 + $r.r_thickness * 0.5;

      var degrees = 360 - (value / ring.max) * 360.0;
      var endAngle = degrees * (Math.PI / 180);

      $r.ctx.save();
      $r.ctx.translate(x, y);
      $r.ctx.clearRect($r.actual_size * -0.5, $r.actual_size * -0.5,
                       $r.actual_size, $r.actual_size);

      /* white interior */
      $r.ctx.fillStyle = "#FFFFFF";
      $r.ctx.beginPath();
      $r.ctx.arc(0, 0, $r.r_size / 2 - $r.r_thickness * 0.5, 0, 2 * Math.PI);
      $r.ctx.fill();

      /* unfilled track — pale gold */
      $r.ctx.strokeStyle = "#F0E6D2";
      $r.ctx.beginPath();
      $r.ctx.arc(0, 0, $r.r_size / 2, 0, 2 * Math.PI, 2);
      $r.ctx.lineWidth = $r.r_thickness;
      $r.ctx.stroke();

      /* elapsed arc — champagne gold */
      $r.ctx.strokeStyle = "#C6A15B";
      $r.ctx.beginPath();
      $r.ctx.arc(0, 0, $r.r_size / 2, 0, endAngle, 1);
      $r.ctx.lineWidth = $r.r_thickness;
      $r.ctx.lineCap = "round";
      $r.ctx.stroke();
      $r.ctx.lineCap = "butt";

      /* label — small, uppercase, deeper gold */
      $r.ctx.fillStyle = "#A8843F";
      $r.ctx.font = "600 13px Manrope, Helvetica, Arial, sans-serif";
      $r.ctx.fillText(String(label).toUpperCase(), 0, 26);

      /* number — deep navy */
      $r.ctx.fillStyle = "#102A3A";
      $r.ctx.font = "700 40px Manrope, Helvetica, Arial, sans-serif";
      $r.ctx.fillText(Math.floor(value), 0, 2);

      $r.ctx.restore();
    };

    ringer.__sdeSkin = "1";
    return true;
  }

  /* ringer is defined in DJEP's javascript.asp, which may load after this
     file. Try now, then poll briefly, then give up quietly. */
  if (!patchCountdown()) {
    var tries = 0;
    var t = setInterval(function () {
      if (patchCountdown() || ++tries > 40) { clearInterval(t); }
    }, 100);
  }

})();
