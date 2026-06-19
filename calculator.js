// All constants verified against the member's May 2026 LES,
// the 2026 DFAS basic pay table, and the 2026 BAH-without-dependents table.
//
// CZTE departure-month rule: a month in which the member departs the zone
// under orders still qualifies for CZTE on base pay, UNLESS the absence
// spans that entire calendar month. COLA/HDP/IDP still require physical
// presence and stop the day the member leaves, independent of tax status.
//
// Leave sellback: leave earned WHILE PHYSICALLY IN the combat zone is
// federal-tax-exempt when sold, per IRS Publication 3 / DoD FMR. FICA
// still applies regardless. The member's May 2026 LES shows a running
// "TAX EXEMPT LV BAL" field (12.5 days as of end of May, against a 37.0
// day total balance) — DFAS is already tracking this split day-by-day,
// so this calculator projects that exact field forward instead of
// guessing a percentage.

const BASE_PAY = 7654.33;
const BAS = 328.48;
const BAH_BAHRAIN = 2939.54;
const BAH_CLT = 2433.00;
const COLA_HDP_IDP = 1086.12 + 100.00 + 225.00;
const MIE_JAX = 68.00;

const SGLI = 26.00;
const FICA_RATE = 0.062 + 0.0145;
const EFF_FED_RATE = 0.124; // derived from 2026 single-filer brackets applied to base pay alone

const DAILY_SELLBACK_RATE = (BASE_PAY * 12) / 360; // official DoD formula
const SELLBACK_LIFETIME_CAP = 60;

// May 2026 LES snapshot
const MAY_TOTAL_BAL = 37.0;
const MAY_TAX_EXEMPT_BAL = 12.5;
const MAY_NONEXEMPT_BAL = MAY_TOTAL_BAL - MAY_TAX_EXEMPT_BAL; // 24.5, fixed - earned before this tour
const MONTHLY_ACCRUAL = 2.5;

function fmt(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function bahrainMonthNet() {
  const gross = BASE_PAY + BAS + BAH_BAHRAIN + COLA_HDP_IDP;
  const fica = BASE_PAY * FICA_RATE;
  return gross - fica - SGLI;
}

function departureMonthNet(jaxDays) {
  const perDiem = MIE_JAX * jaxDays;
  const gross = BASE_PAY + BAS + BAH_BAHRAIN + perDiem;
  const fica = BASE_PAY * FICA_RATE;
  return gross - fica - SGLI; // no federal tax - departure-month rule
}

function fullAbsentMonthNet_NC() {
  const gross = BASE_PAY + BAS + BAH_CLT;
  const fed = BASE_PAY * EFF_FED_RATE;
  const fica = BASE_PAY * FICA_RATE;
  return gross - fed - fica - SGLI;
}

function sellbackNet(days, czteEarned) {
  const gross = days * DAILY_SELLBACK_RATE;
  const fica = gross * FICA_RATE;
  const fed = czteEarned ? 0 : gross * EFF_FED_RATE;
  return gross - fica - fed;
}

// Projects total balance and tax-exempt balance forward from the May LES
// to each separation date. Months counted from June onward.
function leaveAtSeparation(monthsFromMayToSep, czteQualifyingMonths) {
  const total = MAY_TOTAL_BAL + MONTHLY_ACCRUAL * monthsFromMayToSep;
  const exempt = MAY_TAX_EXEMPT_BAL + MONTHLY_ACCRUAL * czteQualifyingMonths;
  return { total, exempt, nonexempt: total - exempt };
}

// Option 1: separate Aug 31. 3 months accrued (Jun, Jul, Aug), all CZTE-qualifying (still in Bahrain).
const leave_opt1 = leaveAtSeparation(3, 3);
// Option 2: separate Sep 30. 4 months accrued (Jun-Sep), Sept counts via departure-month rule.
const leave_opt2 = leaveAtSeparation(4, 4);
// Option 3: separate Oct 31. 5 months accrued (Jun-Oct), Oct does NOT count (full month absent).
const leave_opt3 = leaveAtSeparation(5, 4);

const BAHRAIN_NET = bahrainMonthNet();
const NC_NET_FULL_MONTH = fullAbsentMonthNet_NC();

const root = document.getElementById('calculator-root');

root.innerHTML = `
  <div class="calc-row">
    <label for="sl-sellback">Leave days sold back</label>
    <input type="range" id="sl-sellback" min="0" max="49.5" step="0.5" value="44.5">
    <span class="calc-val" id="out-sellback">44.5</span>
  </div>
  <div class="calc-row">
    <label for="sl-jaxdays">Days in Jacksonville TAD during the departure month</label>
    <input type="range" id="sl-jaxdays" min="0" max="29" step="1" value="29">
    <span class="calc-val" id="out-jaxdays">29</span>
  </div>
  <hr class="calc-divider">
  <div class="calc-results">
    <div class="calc-result-card">
      <div class="calc-result-label">Option 1 · Aug 31</div>
      <div class="calc-result-value" id="res-1">—</div>
      <div class="calc-result-sub" id="res-1-leave"></div>
    </div>
    <div class="calc-result-card">
      <div class="calc-result-label">Option 2 · Sep 30</div>
      <div class="calc-result-value" id="res-2">—</div>
      <div class="calc-result-sub" id="res-2-leave"></div>
    </div>
    <div class="calc-result-card">
      <div class="calc-result-label">Option 3 · Oct 31</div>
      <div class="calc-result-value" id="res-3">—</div>
      <div class="calc-result-sub" id="res-3-leave"></div>
    </div>
  </div>
  <p class="calc-note" id="calc-note"></p>
  <p class="calc-note">Tax-exempt/non-exempt split is projected directly from the member's May 2026 LES ("TAX EXEMPT LV BAL" field: 12.5 of 37.0 days). The non-exempt 24.5 days were earned before this field started tracking and stay fixed in every option; only the exempt portion grows, and only for months that qualify for CZTE.</p>
  <p class="calc-note">Sellback days above this option's projected total balance are capped automatically. Lifetime sellback cap is 60 days — check your running total with your admin.</p>
`;

const slSellback = document.getElementById('sl-sellback');
const slJaxdays = document.getElementById('sl-jaxdays');

function update() {
  let sellDays = parseFloat(slSellback.value);
  const jaxDays = parseFloat(slJaxdays.value);

  document.getElementById('out-sellback').textContent = sellDays;
  document.getElementById('out-jaxdays').textContent = jaxDays;

  function sellbackForOption(leaveInfo) {
    const cappedSell = Math.min(sellDays, leaveInfo.total);
    // Sell exempt days first (favorable order doesn't change DFAS rules, but
    // matches how the balance is actually drawn down day-by-day in practice)
    const exemptUsed = Math.min(cappedSell, leaveInfo.exempt);
    const nonexemptUsed = cappedSell - exemptUsed;
    const net = sellbackNet(exemptUsed, true) + sellbackNet(nonexemptUsed, false);
    return { net, cappedSell, exemptUsed, nonexemptUsed };
  }

  const sb1 = sellbackForOption(leave_opt1);
  const sb2 = sellbackForOption(leave_opt2);
  const sb3 = sellbackForOption(leave_opt3);

  const opt1 = BAHRAIN_NET * 3 + sb1.net;
  const opt2 = BAHRAIN_NET * 3 + departureMonthNet(jaxDays) + sb2.net;
  const opt3 = BAHRAIN_NET * 3 + departureMonthNet(jaxDays) + NC_NET_FULL_MONTH + sb3.net;

  document.getElementById('res-1').textContent = fmt(opt1);
  document.getElementById('res-2').textContent = fmt(opt2);
  document.getElementById('res-3').textContent = fmt(opt3);

  document.getElementById('res-1-leave').textContent = `${leave_opt1.total.toFixed(1)}d balance, ${leave_opt1.exempt.toFixed(1)}d exempt`;
  document.getElementById('res-2-leave').textContent = `${leave_opt2.total.toFixed(1)}d balance, ${leave_opt2.exempt.toFixed(1)}d exempt`;
  document.getElementById('res-3-leave').textContent = `${leave_opt3.total.toFixed(1)}d balance, ${leave_opt3.exempt.toFixed(1)}d exempt`;

  const cards = document.querySelectorAll('.calc-result-card');
  cards.forEach(c => c.classList.remove('best'));
  const vals = [opt1, opt2, opt3];
  const maxIdx = vals.indexOf(Math.max(...vals));
  cards[maxIdx].classList.add('best');

  if (sellDays > SELLBACK_LIFETIME_CAP) {
    document.getElementById('calc-note').textContent =
      `Note: ${sellDays} days exceeds the 60-day lifetime sellback cap. Verify your remaining cap with your admin before counting on this figure.`;
  } else {
    document.getElementById('calc-note').textContent =
      `These totals are pay only — they don't include the value of your time, the quality of your medical/VA outprocessing, or the risk to your relief if the handoff is rushed.`;
  }
}

slSellback.addEventListener('input', update);
slJaxdays.addEventListener('input', update);
update();

