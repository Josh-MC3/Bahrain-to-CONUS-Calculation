// All constants verified against the member's May 2026 LES,
// the 2026 DFAS basic pay table, and the 2026 BAH-without-dependents table.
// No invented exemptions. Leave sellback is taxable regardless of CZTE status.

const BASE_PAY = 7654.33;
const BAS = 328.48;
const BAH_BAHRAIN = 2939.54;
const BAH_CLT = 2433.00;
const COLA = 100.00 + 225.00 + 1086.12; // HDP + IDP + COLA
const MIE_JAX = 68.00;

const SGLI = 26.00;
const FICA_RATE = 0.062 + 0.0145;
const EFF_FED_RATE = 0.124; // derived from 2026 single-filer brackets applied to base pay alone

const DAILY_SELLBACK_RATE = (BASE_PAY * 12) / 360; // official DoD formula
const SELLBACK_LIFETIME_CAP = 60;

function fmt(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function bahrainMonthNet() {
  const gross = BASE_PAY + BAS + BAH_BAHRAIN + COLA;
  const fica = BASE_PAY * FICA_RATE;
  return gross - fica - SGLI; // CZTE: no federal tax
}

function jaxMonthNet(perDiemDays) {
  const perDiem = MIE_JAX * perDiemDays;
  const gross = BASE_PAY + BAS + BAH_BAHRAIN + perDiem;
  const fed = BASE_PAY * EFF_FED_RATE;
  const fica = BASE_PAY * FICA_RATE;
  return gross - fed - fica - SGLI;
}

function ncMonthNet() {
  const gross = BASE_PAY + BAS + BAH_CLT;
  const fed = BASE_PAY * EFF_FED_RATE;
  const fica = BASE_PAY * FICA_RATE;
  return gross - fed - fica - SGLI;
}

const BAHRAIN_NET = bahrainMonthNet();
const JAX_NET_FULL_MONTH = jaxMonthNet(30);
const NC_NET_FULL_MONTH = ncMonthNet();

const root = document.getElementById('calculator-root');

root.innerHTML = `
  <div class="calc-row">
    <label for="sl-sellback">Leave days sold back (of 44.5)</label>
    <input type="range" id="sl-sellback" min="0" max="44.5" step="0.5" value="20">
    <span class="calc-val" id="out-sellback">20</span>
  </div>
  <div class="calc-row">
    <label for="sl-jaxdays">Days in Jacksonville TAD (Option 2/3)</label>
    <input type="range" id="sl-jaxdays" min="0" max="30" step="1" value="21">
    <span class="calc-val" id="out-jaxdays">21</span>
  </div>
  <hr class="calc-divider">
  <div class="calc-results">
    <div class="calc-result-card">
      <div class="calc-result-label">Option 1 · Aug 31</div>
      <div class="calc-result-value" id="res-1">—</div>
    </div>
    <div class="calc-result-card">
      <div class="calc-result-label">Option 2 · Sep 30</div>
      <div class="calc-result-value" id="res-2">—</div>
    </div>
    <div class="calc-result-card">
      <div class="calc-result-label">Option 3 · Oct 31</div>
      <div class="calc-result-value" id="res-3">—</div>
    </div>
  </div>
  <p class="calc-note" id="calc-note"></p>
  <p class="calc-note">Sellback shown is taxable income, paid as a lump sum at separation, at the standard rate of annual base pay ÷ 360 (<span class="mono">${fmt(DAILY_SELLBACK_RATE)}</span>/day). Lifetime sellback cap is 60 days — check your running total with your admin before counting on a full payout.</p>
`;

const slSellback = document.getElementById('sl-sellback');
const slJaxdays = document.getElementById('sl-jaxdays');

function update() {
  const sellDays = parseFloat(slSellback.value);
  const jaxDays = parseFloat(slJaxdays.value);

  document.getElementById('out-sellback').textContent = sellDays;
  document.getElementById('out-jaxdays').textContent = jaxDays;

  const sellbackValue = sellDays * DAILY_SELLBACK_RATE;

  const opt1 = BAHRAIN_NET * 3 + sellbackValue;
  const opt2 = BAHRAIN_NET * 3 + jaxMonthNet(jaxDays) + sellbackValue;
  const opt3 = BAHRAIN_NET * 3 + jaxMonthNet(jaxDays) + NC_NET_FULL_MONTH + sellbackValue;

  document.getElementById('res-1').textContent = fmt(opt1);
  document.getElementById('res-2').textContent = fmt(opt2);
  document.getElementById('res-3').textContent = fmt(opt3);

  const cards = document.querySelectorAll('.calc-result-card');
  cards.forEach(c => c.classList.remove('best'));
  const vals = [opt1, opt2, opt3];
  const maxIdx = vals.indexOf(Math.max(...vals));
  cards[maxIdx].classList.add('best');

  if (sellDays > SELLBACK_LIFETIME_CAP) {
    document.getElementById('calc-note').textContent =
      `Note: ${sellDays} days exceeds the 60-day lifetime sellback cap. Figures above assume the full amount is payable — verify your remaining cap with your admin.`;
  } else {
    document.getElementById('calc-note').textContent =
      `These totals are pay only — they don't include the value of your time, the quality of your medical/VA outprocessing, or the risk to your relief if the handoff is rushed.`;
  }
}

slSellback.addEventListener('input', update);
slJaxdays.addEventListener('input', update);
update();
