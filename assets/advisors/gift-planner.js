
/* ---- Charitable Gift Planner (ported, self-contained IIFE) ---- */

(function(){
  // ---------- 2026 constants (from the source tax reference; assumptions noted where the source is silent) ----------
  const STD = { single:16100, mfs:16100, hoh:24150, mfj:32200 };
  const BRACKETS = {
    single: [ [12400,.10],[50400,.12],[105700,.22],[201775,.24],[256225,.32],[640600,.35],[Infinity,.37] ],
    mfj:    [ [24800,.10],[100800,.12],[211400,.22],[403550,.24],[512450,.32],[768700,.35],[Infinity,.37] ],
    hoh:    [ [17700,.10],[67450,.12],[105700,.22],[201750,.24],[256200,.32],[640600,.35],[Infinity,.37] ]
  };
  const QCD_LIMIT = 111000;
  const CASH_AGI_CAP_PCT = 0.60;
  const STOCK_AGI_CAP_PCT = 0.30;
  const AGI_FLOOR_PCT = 0.005;
  const TOP_RATE_CAP = 0.35;
  const SUGGEST_PCT_OF_AGI = 0.05;

  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const $ = id => document.getElementById(id);

  const filingSelect = $('filingStatus');
  filingSelect.addEventListener('change', () => {
    $('spouseFields').style.display = filingSelect.value === 'mfj' ? 'flex' : 'none';
    calculate();
  });

  document.getElementById('plannerForm').addEventListener('input', calculate);
  document.getElementById('plannerForm').addEventListener('change', calculate);

  function bracketRate(filing, taxableIncome){
    const table = filing === 'mfs' ? BRACKETS.single : BRACKETS[filing];
    for (const [cap, rate] of table){ if (taxableIncome <= cap) return rate; }
    return table[table.length-1][1];
  }

  function calculate(){
    const filing = filingSelect.value;
    const isMFJ = filing === 'mfj';
    const clientAge = parseFloat($('clientAge').value) || 0;
    const spouseAge = isMFJ ? (parseFloat($('spouseAge').value) || 0) : 0;
    const agi = Math.max(0, parseFloat($('agi').value) || 0);
    const otherItemized = Math.max(0, parseFloat($('otherItemized').value) || 0);
    const highIncome = $('highIncome').checked;
    const ltcgRate = parseFloat($('ltcgRate').value) / 100;
    const niit = $('niit').checked;
    const cash = Math.max(0, parseFloat($('cash').value) || 0);
    const stock = Math.max(0, parseFloat($('stock').value) || 0);
    const stockGain = Math.min(stock, Math.max(0, parseFloat($('stockGain').value) || 0));
    const ira = Math.max(0, parseFloat($('ira').value) || 0);
    const hasDAF = $('hasDAF').value === 'yes';
    const consideringPF = $('consideringPF').checked;
    const targetRaw = parseFloat($('target').value);
    const target = isNaN(targetRaw) ? 0 : Math.max(0, targetRaw);

    if (agi <= 0) {
      $('results').innerHTML = '<div class="ledger-empty">Enter an AGI to see a recommendation.</div>';
      return;
    }

    const notes = [];

    const std = STD[filing];
    const seniorThreshold = isMFJ ? 150000 : 75000;
    const clientSenior = clientAge >= 65;
    const spouseSenior = isMFJ && spouseAge >= 65;
    let seniorAdd = 0;
    if (clientSenior || spouseSenior) {
      const count = (clientSenior?1:0) + (spouseSenior?1:0);
      if (agi <= seniorThreshold) {
        seniorAdd = 6000 * count;
      } else {
        notes.push({ text: `The $6,000/person senior deduction phases out above $${seniorThreshold.toLocaleString()} MAGI. Not included here — the exact phase-out isn't specified in the source guide.`, warn:false });
      }
    }
    const totalStd = std + seniorAdd;
    const gapToItemize = Math.max(0, totalStd - otherItemized);

    if (filing === 'mfs') {
      notes.push({ text: 'Married-filing-separately brackets aren\u2019t published in the source guide — using Single brackets as an approximation for tax-savings estimates.', warn:false });
    }
    const approxTaxableIncome = Math.max(0, agi - totalStd);
    const rate = bracketRate(filing, approxTaxableIncome);
    const benefitRate = rate >= 0.37 ? TOP_RATE_CAP : rate;

    const qcdEligible = clientAge >= 70.5 || (isMFJ && spouseAge >= 70.5);
    const rmdAge = clientAge >= 73 || (isMFJ && spouseAge >= 73);

    let recTotal, sizingNote;
    if (target > 0) {
      recTotal = target;
      sizingNote = 'Sized to the target gift you entered.';
    } else if (gapToItemize > 0) {
      recTotal = gapToItemize;
      sizingNote = 'No target entered — sized to just clear the itemizing threshold this year (a "bunching" amount). Any amount above this adds a dollar-for-dollar deduction at the marginal rate below.';
    } else {
      recTotal = Math.min(cash + stock, agi * SUGGEST_PCT_OF_AGI);
      sizingNote = `No target entered — since other deductions already clear the standard deduction, this shows an illustrative amount (${(SUGGEST_PCT_OF_AGI*100)}% of AGI, a common planning starting point, not a rule) capped by available cash and stock.`;
    }

    const qcdCapacity = qcdEligible ? Math.min(ira, QCD_LIMIT) : 0;
    const totalAvailable = cash + stock + qcdCapacity;
    let shortfall = 0;
    if (recTotal > totalAvailable) {
      shortfall = recTotal - totalAvailable;
    }

    let remaining = recTotal;
    let qcdPortion = 0, stockPortion = 0, cashPortion = 0;

    if (qcdCapacity > 0 && remaining > 0) {
      qcdPortion = Math.min(qcdCapacity, remaining);
      remaining -= qcdPortion;
    }
    const stockAgiCeiling = agi * STOCK_AGI_CAP_PCT;
    if (stock > 0 && remaining > 0) {
      stockPortion = Math.min(stock, stockAgiCeiling, remaining);
      remaining -= stockPortion;
    }
    const cashAgiCeiling = agi * CASH_AGI_CAP_PCT;
    if (cash > 0 && remaining > 0) {
      cashPortion = Math.min(cash, cashAgiCeiling, remaining);
      remaining -= cashPortion;
    }
    if (remaining > 0.5) {
      shortfall = Math.max(shortfall, remaining);
    }

    const nonQcdDeductible = stockPortion + cashPortion;
    const floorAmt = agi * AGI_FLOOR_PCT;
    const deductibleAfterFloor = Math.max(0, nonQcdDeductible - floorAmt);
    const willItemize = (otherItemized + nonQcdDeductible) > totalStd;
    const incomeTaxSavings = willItemize ? deductibleAfterFloor * benefitRate : 0;

    const gainRatio = stock > 0 ? (stockGain / stock) : 0;
    const gainInStockPortion = stockPortion * gainRatio;
    const capGainsTaxAvoided = gainInStockPortion * (ltcgRate + (niit ? 0.038 : 0));

    const nonItemizerDeduction = (!willItemize && nonQcdDeductible > 0)
      ? Math.min(nonQcdDeductible, isMFJ ? 2000 : 1000)
      : 0;
    const nonItemizerSavings = nonItemizerDeduction * rate;

    const totalEstBenefit = incomeTaxSavings + capGainsTaxAvoided + nonItemizerSavings;

    let html = '';

    html += `<div class="headline-card fade-in">
      <p class="card-eyebrow">Suggested charitable gift this year</p>
      <p class="card-stat">${money(recTotal)}</p>
      <div class="rationale">${sizingNote}</div>
    </div>`;

    html += `<div class="ledger-section"><h3>How to fund it</h3><ol class="fund-list">`;
    if (qcdPortion > 0) {
      html += fundItem('Qualified Charitable Distribution (IRA)', qcdPortion,
        `Direct transfer from the IRA to a public charity or a non-donor-advised fund — e.g. a designated or field-of-interest fund at a community foundation. Reduces AGI dollar-for-dollar and, if the client is 73+, counts toward the RMD. <strong>Cannot</strong> be directed to a donor-advised fund.`);
    }
    if (stockPortion > 0) {
      html += fundItem('Long-term appreciated stock', stockPortion,
        `Gifting the stock itself avoids capital gains tax on roughly ${money(gainInStockPortion)} of embedded gain (an estimated ${money(capGainsTaxAvoided)} in avoided tax), while still deducting full fair market value — subject to a ~${(STOCK_AGI_CAP_PCT*100)}% of AGI limit on non-cash gifts (approximate; confirm exact figure).`);
    }
    if (cashPortion > 0) {
      html += fundItem('Cash', cashPortion,
        `Deductible up to ${(CASH_AGI_CAP_PCT*100)}% of AGI when given to public charities or a donor-advised fund.`);
    }
    if (!qcdPortion && !stockPortion && !cashPortion) {
      html += `<li><div class="fl-body"><div class="fl-title">No funding sources available</div><div class="fl-detail">Add cash, stock, or IRA details to see an allocation.</div></div></li>`;
    }
    html += `</ol></div>`;

    html += `<div class="ledger-section"><h3>Where it should go</h3>`;
    if (qcdPortion > 0) {
      html += vehicleCard('Direct to charity, or a designated / field-of-interest fund', 'Required for the QCD portion — by law, QCDs cannot fund a donor-advised fund.');
    }
    if (stockPortion > 0 || cashPortion > 0) {
      const daf = hasDAF ? 'Continue funding the existing donor-advised fund' : 'A donor-advised fund';
      const bunchNote = gapToItemize > 0 && target === 0
        ? ' This reads as a bunching year: take the deduction now, then pace grants to favorite charities out over several years from the fund.'
        : '';
      html += vehicleCard(daf, `Handles the stock and/or cash portion above. Offers the maximum charitable-deduction ceiling (60% of AGI for cash) and no setup cost.${bunchNote}`);
    }
    if (consideringPF) {
      html += vehicleCard('Private foundation — comparison note',
        `A DAF allows up to 60% of AGI for cash gifts versus 30% for a private foundation, has no mandatory annual payout (a PF requires roughly 5% of assets/year), and no separate legal, administrative, or investment setup cost. A PF offers more direct control over grantmaking and staff/board involvement, at higher ongoing cost.`);
    }
    html += `</div>`;

    html += `<div class="ledger-section"><h3>Estimated tax impact</h3>`;
    html += lineItem('Itemized charitable deduction', nonQcdDeductible, willItemize ? null : 'Not itemizing this year at this gift size');
    if (nonQcdDeductible > 0) {
      html += lineItem('Less: 0.5% AGI floor (new for 2026)', -floorAmt);
    }
    if (willItemize) {
      html += lineItem(`Estimated income tax savings (~${Math.round(benefitRate*100)}% bracket benefit)`, incomeTaxSavings);
    } else if (nonItemizerDeduction > 0) {
      html += lineItem(`Non-itemizer cash deduction (new for 2026, up to ${isMFJ?'$2,000':'$1,000'})`, nonItemizerSavings, 'Available even while taking the standard deduction');
    }
    if (qcdPortion > 0) {
      html += lineItem('AGI reduction from QCD', qcdPortion, 'Excluded from income directly — not an itemized deduction');
    }
    if (capGainsTaxAvoided > 0) {
      html += lineItem('Capital gains tax avoided on gifted stock', capGainsTaxAvoided);
    }
    html += `<div class="line-item total"><div class="li-label">Total estimated benefit (excl. QCD's AGI reduction)</div><div class="li-value">${money(totalEstBenefit)}</div></div>`;
    html += `</div>`;

    const allNotes = notes.slice();
    if (shortfall > 0.5) {
      allNotes.push({ text: `The sized gift exceeds readily available cash, stock, and QCD capacity by about ${money(shortfall)}. Consider a multi-year pledge, additional funding sources, or scaling the target down.`, warn:true });
    }
    if (rmdAge && ira > 0 && qcdPortion === 0) {
      allNotes.push({ text: 'Client (or spouse) is in required-minimum-distribution territory. A QCD wasn\u2019t used above — consider whether directing part of the RMD as a QCD would help.', warn:false });
    }
    if (highIncome) {
      allNotes.push({ text: 'Flagged as an unusually high-income year — that strengthens the case for accelerating the deduction into this year rather than spreading gifts into lower-income future years.', warn:false });
    }
    allNotes.push({ text: 'The 30% AGI limit shown for non-cash gifts is a common convention for long-term appreciated property, not a figure stated in the source guide — verify before presenting to a client.', warn:false });
    allNotes.push({ text: 'State income tax treatment, multi-year carryover of unused deductions, and AMT are not modeled here.', warn:false });

    if (allNotes.length) {
      html += `<div class="ledger-section"><h3>Notes & assumptions</h3><ul class="notes-list">`;
      allNotes.forEach(n => { html += `<li class="${n.warn?'warn':''}">${n.text}</li>`; });
      html += `</ul></div>`;
    }

    html += `<div class="ledger-section" style="text-align:left;">
      <button class="gp-btn gp-btn-primary" id="copyBtn" type="button">Copy planning summary</button><span class="copy-status" id="copyStatus"></span>
      <textarea id="summaryBox" rows="6" class="hidden" readonly></textarea>
    </div>`;

    html += `<div class="footer-note">Figures reflect the 2026 federal parameters in the source tax reference guide (IRS.gov as of Jan. 1, 2026), plus a small number of standard conventions noted above where that source didn\u2019t specify an exact figure. This tool provides decision-support estimates only. It is not tax, legal, or investment advice, and nothing here should be treated as final until reviewed by the client's own CPA or tax attorney.</div>`;

    $('results').innerHTML = html;

    const summaryText = buildSummary({
      filing, clientAge, spouseAge, isMFJ, agi, recTotal, qcdPortion, stockPortion, cashPortion,
      incomeTaxSavings, capGainsTaxAvoided, willItemize, nonItemizerSavings, gapToItemize, hasDAF, consideringPF, shortfall
    });
    $('summaryBox').value = summaryText;
    $('copyBtn').addEventListener('click', () => copySummary(summaryText));

    function fundItem(title, amount, detail){
      return `<li><div class="fl-body">
        <div class="fl-title">${title} <span class="fl-amount">${money(amount)}</span></div>
        <div class="fl-detail">${detail}</div>
      </div></li>`;
    }
    function vehicleCard(title, detail){
      return `<div class="vehicle-card"><div class="v-title">${title}</div><div class="v-detail">${detail}</div></div>`;
    }
    function lineItem(label, value, sub){
      return `<div class="line-item"><div class="li-label">${label}${sub?`<small>${sub}</small>`:''}</div><div class="li-value">${money(value)}</div></div>`;
    }
  }

  function buildSummary(d){
    const filingLabel = { single:'Single', mfj:'Married filing jointly', hoh:'Head of household', mfs:'Married filing separately' }[d.filing];
    let lines = [];
    lines.push('CHARITABLE GIVING PLANNING SUMMARY (illustrative — confirm with tax/legal counsel)');
    lines.push(`Filing status: ${filingLabel}${d.isMFJ ? ` | Client age ${d.clientAge}, spouse age ${d.spouseAge}` : ` | Client age ${d.clientAge}`}`);
    lines.push(`AGI: ${money(d.agi)}`);
    lines.push(`Suggested gift this year: ${money(d.recTotal)}`);
    if (d.qcdPortion) lines.push(`  - QCD from IRA: ${money(d.qcdPortion)} (direct to charity / non-DAF fund)`);
    if (d.stockPortion) lines.push(`  - Appreciated stock: ${money(d.stockPortion)}`);
    if (d.cashPortion) lines.push(`  - Cash: ${money(d.cashPortion)}`);
    lines.push(d.willItemize ? `Itemizing this year (est. income tax savings: ${money(d.incomeTaxSavings)})` : `Not itemizing this year${d.nonItemizerSavings ? ` (non-itemizer deduction savings: ${money(d.nonItemizerSavings)})` : ''}`);
    if (d.capGainsTaxAvoided) lines.push(`Estimated capital gains tax avoided: ${money(d.capGainsTaxAvoided)}`);
    if (d.gapToItemize > 0) lines.push(`Bunching threshold to itemize this year: ${money(d.gapToItemize)}`);
    lines.push(`Existing DAF: ${d.hasDAF ? 'Yes' : 'No'}${d.consideringPF ? ' | Weighing a private foundation alternative' : ''}`);
    if (d.shortfall > 0.5) lines.push(`Note: target exceeds available funding sources by ~${money(d.shortfall)}`);
    return lines.join('\n');
  }

  function copySummary(text){
    const status = $('copyStatus');
    const box = $('summaryBox');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        status.textContent = 'Copied.';
        setTimeout(() => status.textContent = '', 2200);
      }).catch(() => {
        box.classList.remove('hidden');
        status.textContent = 'Copy manually below.';
      });
    } else {
      box.classList.remove('hidden');
      status.textContent = 'Copy manually below.';
    }
  }

  calculate();
})();

