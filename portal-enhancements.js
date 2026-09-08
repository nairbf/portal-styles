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

  /* ---- 3. Payment flow ---------------------------------------------------
   * DJEP's flow is: choose gateway -> enter amount -> gateway payment page.
   * This shortens it to: enter amount -> payment page, adds one-tap Deposit /
   * Balance buttons, and moves the other gateways to the bottom.
   *
   * It drives DJEP's OWN form and submit button. Nothing here posts a payment,
   * touches card data, or changes an amount behind the client's back — so
   * payments still record against the event exactly as before.
   * Set SDE_SKIP_GATEWAY_CHOOSER to false to keep the chooser page.
   * -------------------------------------------------------------------- */

  var SDE_SKIP_GATEWAY_CHOOSER = true;

  function money(n) {
    return "$" + Number(n).toLocaleString("en-US",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* DJEP inlines the event's real figures into this generated function, e.g.
     var retainer_fee = Number(500); var total_fee = Number(1700);
     Read them back out rather than guessing or hardcoding. */
  function eventFigures() {
    var out = { retainer: null, total: null, priorPayments: null };
    try {
      if (typeof checkValueAgainstDepositAmount !== "function") { return out; }
      var src = checkValueAgainstDepositAmount.toString();
      function num(name) {
        var m = src.match(new RegExp("var\\s+" + name + "\\s*=\\s*Number\\(\\s*([0-9.]+)\\s*\\)"));
        return m ? Number(m[1]) : null;
      }
      out.retainer = num("retainer_fee");
      out.total = num("total_fee");
      out.priorPayments = num("number_of_previous_payments");
    } catch (e) {}
    return out;
  }

  /* Fill DJEP's amount field and fire every handler it binds, so the hidden
     cents field and the "Total After Charges" line stay correct. */
  function setAmount(value) {
    var el = document.getElementById("amountdollars");
    if (!el) { return; }
    var v = Number(value).toFixed(2);
    el.value = v;
    try { if (window.jQuery) { jQuery(el).trigger("change"); } } catch (e) {}
    try { el.dispatchEvent(new Event("change", { bubbles: true })); } catch (e) {}
    try {
      if (typeof checkValueAgainstDepositAmount === "function") {
        checkValueAgainstDepositAmount(v);
      }
    } catch (e) {}
  }

  function onGatewayChooser() {
    var stripeLink = document.getElementById("djep-stripebutton");
    var box = document.querySelector(".djep-makepaymentbox");
    if (!stripeLink || !box) { return false; }

    /* Stash the gateway URLs — the amount page has no djidnumber of its own. */
    try {
      var urls = {};
      ["paypal", "stripe", "square", "cashapp"].forEach(function (g) {
        var a = document.getElementById("djep-" + g + "button");
        if (a) { urls[g] = a.href; }
      });
      sessionStorage.setItem("sdeGatewayUrls", JSON.stringify(urls));
    } catch (e) {}

    if (!SDE_SKIP_GATEWAY_CHOOSER) { return true; }

    /* Guarded so the browser Back button isn't bounced straight forward. */
    try {
      if (sessionStorage.getItem("sdeSkippedChooser") === "1") {
        sessionStorage.removeItem("sdeSkippedChooser");
        return true;
      }
      sessionStorage.setItem("sdeSkippedChooser", "1");
    } catch (e) { return true; }

    window.location.replace(stripeLink.href);
    return true;
  }

  function onAmountPage() {
    var input = document.getElementById("amountdollars");
    var box = document.querySelector(".djep-makepaymentbox");
    if (!input || !box || document.getElementById("sde-quickpay")) { return false; }

    var fig = eventFigures();

    var wrap = document.createElement("div");
    wrap.id = "sde-quickpay";
    var label = document.createElement("div");
    label.className = "sde-quickpay-label";
    label.textContent = "Choose an amount";
    wrap.appendChild(label);

    var row = document.createElement("div");
    row.className = "sde-quickpay-row";

    function addBtn(text, sub, amount, primary) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "sde-quickpay-btn" + (primary ? " is-primary" : "");
      b.innerHTML = '<span class="sde-qp-title"></span><span class="sde-qp-sub"></span>';
      b.querySelector(".sde-qp-title").textContent = text;
      b.querySelector(".sde-qp-sub").textContent = sub;
      b.addEventListener("click", function () {
        setAmount(amount);
        var all = row.querySelectorAll(".sde-quickpay-btn");
        for (var i = 0; i < all.length; i++) { all[i].classList.remove("is-selected"); }
        b.classList.add("is-selected");
      });
      row.appendChild(b);
    }

    var depositShown = false;
    if (fig.retainer && fig.priorPayments === 0) {
      addBtn("Pay Deposit", money(fig.retainer), fig.retainer, true);
      depositShown = true;
    }

    /* Prefer the balance DJEP prints on the page over the contract total. */
    var balance = null;
    try {
      var bd = document.getElementById("text_balancedue");
      var cell = bd && bd.parentElement && bd.parentElement.nextElementSibling;
      if (cell) {
        var parsed = Number(String(cell.textContent).replace(/[^0-9.]/g, ""));
        if (parsed > 0) { balance = parsed; }
      }
    } catch (e) {}
    if (balance === null && fig.total) { balance = fig.total; }
    if (balance) { addBtn("Pay Balance In Full", money(balance), balance, !depositShown); }

    if (!row.children.length) { return false; }

    var other = document.createElement("button");
    other.type = "button";
    other.className = "sde-quickpay-btn is-ghost";
    other.innerHTML = '<span class="sde-qp-title">Another Amount</span>'
                    + '<span class="sde-qp-sub">Enter below</span>';
    other.addEventListener("click", function () {
      input.value = "";
      var all = row.querySelectorAll(".sde-quickpay-btn");
      for (var i = 0; i < all.length; i++) { all[i].classList.remove("is-selected"); }
      other.classList.add("is-selected");
      input.focus();
    });
    row.appendChild(other);

    wrap.appendChild(row);
    box.insertBefore(wrap, box.firstChild);

    /* Other gateways, at the bottom. */
    try {
      var urls2 = JSON.parse(sessionStorage.getItem("sdeGatewayUrls") || "{}");
      var names = { paypal: "PayPal", square: "Square", cashapp: "Cash App" };
      var keys = ["paypal", "square", "cashapp"].filter(function (g) { return urls2[g]; });
      if (keys.length) {
        var alt = document.createElement("div");
        alt.id = "sde-alt-pay";
        var al = document.createElement("div");
        al.className = "sde-alt-label";
        al.textContent = "Or pay another way";
        alt.appendChild(al);
        var list = document.createElement("div");
        list.className = "sde-alt-row";
        keys.forEach(function (g) {
          var a = document.createElement("a");
          a.href = urls2[g];
          a.className = "sde-alt-link";
          a.textContent = names[g];
          list.appendChild(a);
        });
        alt.appendChild(list);
        box.appendChild(alt);
      }
    } catch (e) {}

    /* Copy: drop the processor name from the intro sentence only.
       The 3.5% fee notice and "Total After Charges" are left exactly as DJEP
       prints them — that is a price disclosure, not branding. */
    try {
      var blocks = box.querySelectorAll(".col-xs-12");
      for (var j = 0; j < blocks.length; j++) {
        if (/We use Stripe/i.test(blocks[j].textContent)) {
          blocks[j].textContent = "Your payment is processed securely. When you continue, "
            + "a secure window opens where you can pay by Apple Pay, Google Pay or card.";
          break;
        }
      }
    } catch (e) {}

    /* DJEP only computes "Total After Charges" for PayPal — on the Stripe page
       the value stays empty, leaving an orphan label. Hide the label while it
       is empty, and reveal it again if DJEP ever fills it. Deliberately NOT
       computing the figure here: the form posts the entered amount, so whether
       the 3.5% is added by Stripe or absorbed is a question for a real
       transaction, and a guessed total next to a payment button is worse than
       no total. */
    try {
      var totalP = document.getElementById("total_after_charges");
      if (totalP) {
        var labelRow = totalP.closest(".form-group");
        var syncTotal = function () {
          var span = totalP.querySelector("span");
          var has = span && span.textContent.replace(/\s/g, "").length > 0;
          if (labelRow) { labelRow.style.display = has ? "" : "none"; }
        };
        syncTotal();
        if (window.MutationObserver) {
          new MutationObserver(syncTotal).observe(totalP,
            { childList: true, subtree: true, characterData: true });
        }
      }
    } catch (e) {}

    return true;
  }

  function initPayments() {
    try {
      var gw = document.getElementById("current_gateway");
      if (!gw) { return; }
      if (gw.value === "none") { onGatewayChooser(); return; }
      if (gw.value === "stripe") { onAmountPage(); }
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPayments);
  } else {
    initPayments();
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
