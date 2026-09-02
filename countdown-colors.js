/* Signature DJ Events — countdown ring colors
 * ---------------------------------------------------------------------------
 * WHERE THIS GOES: DJEP -> Website Tools -> Client Portal -> Custom Scripting.
 * It does NOT belong in portal.css. The countdown rings are painted into a
 * <canvas> by the `ringer` object in DJEP's javascript.asp, so CSS cannot
 * touch their color, numbers, or labels — only JS can.
 *
 * WHAT IT DOES: replaces ringer.unit() with the same math and geometry, drawn
 * in champagne gold and deep navy. Nothing else is altered — the timer, its
 * update interval, the event date, and DJEP's own init call are untouched.
 *
 * SAFE TO REMOVE: delete it and the clock reverts to DJEP's blue on grey.
 */

(function () {
  var TRACK  = "#F0E6D2";  /* unfilled ring   — pale gold  */
  var FILL   = "#C6A15B";  /* elapsed arc     — champagne  */
  var NUMBER = "#102A3A";  /* the digits      — deep navy  */
  var LABEL  = "#A8843F";  /* DAYS/HOURS/...  — deeper gold */
  var FACE   = "#FFFFFF";  /* ring interior   — white      */

  function patch() {
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

      /* full track */
      $r.ctx.strokeStyle = "#F0E6D2";
      $r.ctx.beginPath();
      $r.ctx.arc(0, 0, $r.r_size / 2, 0, 2 * Math.PI, 2);
      $r.ctx.lineWidth = $r.r_thickness;
      $r.ctx.stroke();

      /* elapsed arc */
      $r.ctx.strokeStyle = "#C6A15B";
      $r.ctx.beginPath();
      $r.ctx.arc(0, 0, $r.r_size / 2, 0, endAngle, 1);
      $r.ctx.lineWidth = $r.r_thickness;
      $r.ctx.lineCap = "round";
      $r.ctx.stroke();
      $r.ctx.lineCap = "butt";

      /* label — small, uppercase */
      $r.ctx.fillStyle = "#A8843F";
      $r.ctx.font = "600 13px Manrope, Helvetica, Arial, sans-serif";
      $r.ctx.fillText(String(label).toUpperCase(), 0, 26);

      /* number */
      $r.ctx.fillStyle = "#102A3A";
      $r.ctx.font = "700 40px Manrope, Helvetica, Arial, sans-serif";
      $r.ctx.fillText(Math.floor(value), 0, 2);

      $r.ctx.restore();
    };
    ringer.__sdeSkin = "1";
    return true;
  }

  /* ringer is defined in javascript.asp, which may load after this file.
     Try immediately, then poll briefly, then give up quietly. */
  if (!patch()) {
    var tries = 0;
    var t = setInterval(function () {
      if (patch() || ++tries > 40) { clearInterval(t); }
    }, 100);
  }
})();
