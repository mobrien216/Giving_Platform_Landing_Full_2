/* ============================================================
   Impact Calculator (tools/impact-calculator.html)
   Pure client-side planning estimate — nothing is stored or sent.
   Two models:
     · growth   — future value of a monthly or one-time gift
     · endowment — the same dollars held as a fund that grants
                   PAYOUT % of its balance each year, over a fixed
                   ENDOWMENT_YEARS window
   ============================================================ */
(function () {
  // ---------- Constants ----------
  const ENDOWMENT_YEARS = 30;               // perpetuity view always projects this far
  const AXIS_TICKS = [0, 5, 10, 15, 20, 25, 30];

  // ---------- State ----------
  let giftType = 'monthly';

  // ---------- Elements ----------
  const btnMonthly = document.getElementById('btnMonthly');
  const btnOnetime = document.getElementById('btnOnetime');
  const giftAmountEl = document.getElementById('giftAmount');
  const amountSuffix = document.getElementById('amountSuffix');
  const presetBtns = Array.from(document.querySelectorAll('.preset-btn'));
  const yearsEl = document.getElementById('years');
  const yearsValue = document.getElementById('yearsValue');
  const returnEl = document.getElementById('returnRate');
  const returnValue = document.getElementById('returnValue');
  const peersEl = document.getElementById('peers');
  const payoutEl = document.getElementById('payoutRate');
  const payoutValue = document.getElementById('payoutValue');

  const individualTitle = document.getElementById('individualTitle');
  const individualContributed = document.getElementById('individualContributed');
  const individualFV = document.getElementById('individualFV');
  const collectiveTitle = document.getElementById('collectiveTitle');
  const collectiveContributed = document.getElementById('collectiveContributed');
  const collectiveFV = document.getElementById('collectiveFV');

  const perpetuityToggle = document.getElementById('perpetuityToggle');
  const perpetuitySection = document.getElementById('perpetuitySection');
  const chartWrap = document.getElementById('chartWrap');
  const growthChartWrap = document.getElementById('growthChartWrap');
  const totalImpact30 = document.getElementById('totalImpact30');
  const grantsBreak = document.getElementById('grantsBreak');
  const balanceBreak = document.getElementById('balanceBreak');
  const peersBreak = document.getElementById('peersBreak');
  const peersBreakWrap = document.getElementById('peersBreakWrap');

  // ---------- Collective giving (hidden feature) ----------
  const collectiveToggle = document.getElementById('collectiveToggle');
  const collectiveField = document.getElementById('collectiveField');
  const collectiveCard = document.getElementById('collectiveCard');
  const resultCardsEl = document.querySelector('.result-cards');
  let collectiveActive = false;

  collectiveToggle.addEventListener('click', function () {
    collectiveActive = !collectiveActive;
    collectiveField.classList.toggle('hidden', !collectiveActive);
    collectiveCard.classList.toggle('hidden', !collectiveActive);
    resultCardsEl.classList.toggle('solo', !collectiveActive);
    collectiveToggle.setAttribute('aria-expanded', String(collectiveActive));
    collectiveToggle.querySelector('span').textContent = collectiveActive
      ? 'Just show my own giving'
      : 'Add others giving alongside you';
    // Keep the peers value as entered: recalc() already treats it as 1 while
    // the feature is off, and re-opening it should show the last number.
    recalc();
  });

  // ---------- Helpers ----------
  function fmtUSD(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }
  function plural(n, one, many) {
    return n === 1 ? one : many;
  }
  // Round a chart's max value up to the next half-magnitude (e.g. 3,722 → 4,000).
  function niceCeiling(maxVal) {
    if (maxVal <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    return Math.ceil(maxVal / (magnitude / 2)) * (magnitude / 2);
  }
  function axisTick(tx, baseline, labelY, anchor, label) {
    return '<line x1="' + tx + '" y1="' + baseline + '" x2="' + tx + '" y2="' + (baseline + 4) + '" stroke="var(--ink-soft)" stroke-width="1"/>' +
      '<text x="' + tx + '" y="' + labelY + '" font-size="10" fill="var(--ink-soft)" text-anchor="' + anchor + '" font-family="var(--font-body)">' + label + '</text>';
  }
  function fvAnnuity(pmt, mRate, months) {
    if (mRate === 0) return pmt * months;
    return pmt * ((Math.pow(1 + mRate, months) - 1) / mRate);
  }
  function fvLumpSum(pv, mRate, months) {
    return pv * Math.pow(1 + mRate, months);
  }
  function simulateEndowment(type, periodicAgg, contribYears, annualReturnPct, payoutPct, totalYears) {
    const mRate = annualReturnPct / 100 / 12;
    const contribMonths = Math.min(contribYears, totalYears) * 12;
    let balance = 0, cumContributed = 0, cumGranted = 0;
    const yearly = [{ year: 0, contributed: 0, granted: 0, balance: 0 }];
    for (let m = 1; m <= totalYears * 12; m++) {
      if (type === 'monthly') {
        if (m <= contribMonths) { balance += periodicAgg; cumContributed += periodicAgg; }
      } else {
        if (m === 1) { balance += periodicAgg; cumContributed += periodicAgg; }
      }
      balance *= (1 + mRate);
      if (m % 12 === 0) {
        const grant = balance * (payoutPct / 100);
        balance -= grant;
        cumGranted += grant;
        yearly.push({ year: m / 12, contributed: cumContributed, granted: cumGranted, balance: balance });
      }
    }
    return yearly;
  }
  function growthSeries(type, amount, years, annualReturnPct) {
    const mRate = annualReturnPct / 100 / 12;
    const series = [{ year: 0, contributed: 0, total: 0 }];
    for (let yr = 1; yr <= years; yr++) {
      const m = yr * 12;
      let contributed, total;
      if (type === 'monthly') {
        contributed = amount * m;
        total = fvAnnuity(amount, mRate, m);
      } else {
        contributed = amount;
        total = fvLumpSum(amount, mRate, m);
      }
      series.push({ year: yr, contributed: contributed, total: total });
    }
    return series;
  }

  // ---------- Tick marks for time horizon (every 5 years) ----------
  const yearTicks = document.getElementById('yearTicks');
  [1, 5, 10, 15, 20, 25, 30].forEach(function (t) {
    const s = document.createElement('span');
    s.textContent = t === 1 ? '1 yr' : t + ' yrs';
    yearTicks.appendChild(s);
  });

  // ---------- Toggle ----------
  function setGiftType(type) {
    giftType = type;
    btnMonthly.classList.toggle('active', type === 'monthly');
    btnOnetime.classList.toggle('active', type === 'onetime');
    btnMonthly.setAttribute('aria-pressed', String(type === 'monthly'));
    btnOnetime.setAttribute('aria-pressed', String(type === 'onetime'));
    amountSuffix.textContent = type === 'monthly' ? '/ month' : 'one-time';
    recalc();
  }
  btnMonthly.addEventListener('click', function () { setGiftType('monthly'); });
  btnOnetime.addEventListener('click', function () { setGiftType('onetime'); });

  // ---------- Amount presets ----------
  function syncPresetActive() {
    const val = String(parseFloat(giftAmountEl.value) || 0);
    presetBtns.forEach(function (b) {
      const on = b.dataset.amount === val;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }
  presetBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      giftAmountEl.value = b.dataset.amount;
      syncPresetActive();
      recalc();
    });
  });
  giftAmountEl.addEventListener('input', function () {
    syncPresetActive();
    recalc();
  });

  // ---------- Sliders ----------
  yearsEl.addEventListener('input', function () {
    const yrs = parseInt(yearsEl.value, 10);
    yearsValue.textContent = yrs + plural(yrs, ' year', ' years');
    recalc();
  });
  returnEl.addEventListener('input', function () {
    returnValue.textContent = parseFloat(returnEl.value).toFixed(1) + '%';
    recalc();
  });
  payoutEl.addEventListener('input', function () {
    payoutValue.textContent = parseFloat(payoutEl.value).toFixed(1) + '%';
    recalc();
  });
  peersEl.addEventListener('input', recalc);

  // ---------- Perpetuity toggle ----------
  perpetuityToggle.addEventListener('click', function () {
    const isHidden = perpetuitySection.classList.contains('hidden');
    if (isHidden) {
      perpetuitySection.classList.remove('hidden');
      perpetuityToggle.setAttribute('aria-expanded', 'true');
      perpetuityToggle.querySelector('span').textContent = 'Hide the endowment view';
      recalc();
      perpetuitySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      perpetuitySection.classList.add('hidden');
      perpetuityToggle.setAttribute('aria-expanded', 'false');
      perpetuityToggle.querySelector('span').textContent = 'Make this an endowment';
    }
  });

  // ---------- Chart rendering ----------
  function renderChart(yearly) {
    const W = 760, H = 220, padL = 4, padR = 4, padT = 10, padB = 22;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    let maxVal = 0;
    yearly.forEach(function (y) {
      maxVal = Math.max(maxVal, y.contributed, y.granted + y.balance);
    });
    maxVal = niceCeiling(maxVal);

    function x(year) { return padL + (year / ENDOWMENT_YEARS) * chartW; }
    function y(val) { return padT + chartH - (val / maxVal) * chartH; }

    const baseline = padT + chartH;

    // Balance area (bottom stack)
    let balancePts = yearly.map(function (d) { return x(d.year) + ',' + y(d.balance); });
    let balancePath = 'M' + x(0) + ',' + baseline + ' L' + balancePts.join(' L') + ' L' + x(ENDOWMENT_YEARS) + ',' + baseline + ' Z';

    // Granted area (stacked on top of balance)
    let grantedTopPts = yearly.map(function (d) { return x(d.year) + ',' + y(d.granted + d.balance); });
    let grantedBottomPts = yearly.slice().reverse().map(function (d) { return x(d.year) + ',' + y(d.balance); });
    let grantedPath = 'M' + grantedTopPts.join(' L') + ' L' + grantedBottomPts.join(' L') + ' Z';

    // Contributed line
    let contribPts = yearly.map(function (d) { return x(d.year) + ',' + y(d.contributed); });
    let contribPath = 'M' + contribPts.join(' L');

    // Axis ticks every 5 years
    let axisTicks = '';
    AXIS_TICKS.forEach(function (t) {
      const anchor = t === 0 ? 'start' : (t === ENDOWMENT_YEARS ? 'end' : 'middle');
      axisTicks += axisTick(x(t), baseline, baseline + 16, anchor, t === 0 ? 'Start' : 'Yr ' + t);
    });

    const last = yearly[yearly.length - 1];
    const label = 'Endowment over ' + ENDOWMENT_YEARS + ' years: ' + fmtUSD(last.granted) +
      ' granted out and ' + fmtUSD(last.balance) + ' still in the fund.';
    const svg =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '">' +
        '<line x1="' + padL + '" y1="' + baseline + '" x2="' + (padL + chartW) + '" y2="' + baseline + '" stroke="var(--line)" stroke-width="1"/>' +
        '<path d="' + balancePath + '" fill="var(--tcf-green-dark)" fill-opacity="0.85"/>' +
        '<path d="' + grantedPath + '" fill="var(--tcf-aqua)" fill-opacity="0.9"/>' +
        '<path d="' + contribPath + '" fill="none" stroke="var(--tcf-blue)" stroke-width="2" stroke-dasharray="5,4"/>' +
        axisTicks +
      '</svg>';

    chartWrap.innerHTML = svg;
  }

  function renderGrowthChart(series) {
    const W = 560, H = 170, padL = 4, padR = 4, padT = 10, padB = 20;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const years = series[series.length - 1].year;

    let maxVal = 0;
    series.forEach(function (d) { maxVal = Math.max(maxVal, d.total); });
    maxVal = niceCeiling(maxVal);

    function x(year) { return padL + (years === 0 ? 0 : (year / years) * chartW); }
    function y(val) { return padT + chartH - (val / maxVal) * chartH; }
    const baseline = padT + chartH;

    // Contributed area (bottom stack, dark green)
    let contribPts = series.map(function (d) { return x(d.year) + ',' + y(d.contributed); });
    let contribPath = 'M' + x(0) + ',' + baseline + ' L' + contribPts.join(' L') + ' L' + x(years) + ',' + baseline + ' Z';

    // Growth area (stacked on top, light green) = total - contributed
    let growthTopPts = series.map(function (d) { return x(d.year) + ',' + y(d.total); });
    let growthBottomPts = series.slice().reverse().map(function (d) { return x(d.year) + ',' + y(d.contributed); });
    let growthPath = 'M' + growthTopPts.join(' L') + ' L' + growthBottomPts.join(' L') + ' Z';

    // Tick step: keep to ~6 labels max
    let step = 1;
    if (years > 6) step = Math.ceil(years / 6);
    const niceSteps = [1, 2, 5, 10];
    step = niceSteps.find(function (s) { return s >= step; }) || 10;

    let axisTicks = '';
    for (let t = 0; t <= years; t += step) {
      const anchor = t === 0 ? 'start' : (t === years ? 'end' : 'middle');
      axisTicks += axisTick(x(t), baseline, baseline + 15, anchor, t === 0 ? 'Start' : 'Yr ' + t);
    }
    // always label the final year if it wasn't hit by the step loop
    if ((years % step) !== 0) {
      axisTicks += axisTick(x(years), baseline, baseline + 15, 'end', 'Yr ' + years);
    }

    const end = series[series.length - 1];
    const label = 'Growth over ' + years + plural(years, ' year', ' years') + ': ' + fmtUSD(end.contributed) +
      ' contributed grows to ' + fmtUSD(end.total) + '.';
    const svg =
      '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="170" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + label + '">' +
        '<line x1="' + padL + '" y1="' + baseline + '" x2="' + (padL + chartW) + '" y2="' + baseline + '" stroke="var(--line)" stroke-width="1"/>' +
        '<path d="' + contribPath + '" fill="var(--tcf-green-dark)" fill-opacity="0.9"/>' +
        '<path d="' + growthPath + '" fill="var(--tcf-green-light)" fill-opacity="0.85"/>' +
        axisTicks +
      '</svg>';

    growthChartWrap.innerHTML = svg;
  }

  // ---------- Main recalculation ----------
  function recalc() {
    const amount = Math.max(0, parseFloat(giftAmountEl.value) || 0);
    const years = parseInt(yearsEl.value, 10);
    const returnPct = parseFloat(returnEl.value);
    const payoutPct = parseFloat(payoutEl.value);
    const peers = collectiveActive ? Math.max(1, parseInt(peersEl.value, 10) || 1) : 1;
    const months = years * 12;
    const mRate = returnPct / 100 / 12;

    let indivContrib, indivFV;
    if (giftType === 'monthly') {
      indivContrib = amount * months;
      indivFV = fvAnnuity(amount, mRate, months);
    } else {
      indivContrib = amount;
      indivFV = fvLumpSum(amount, mRate, months);
    }

    const collContrib = indivContrib * peers;
    const collFV = indivFV * peers;

    individualTitle.textContent = giftType === 'monthly'
      ? 'If you give for ' + years + plural(years, ' year', ' years')
      : 'If you give once, over ' + years + plural(years, ' year', ' years');
    individualContributed.textContent = fmtUSD(indivContrib);
    individualFV.textContent = fmtUSD(indivFV);

    renderGrowthChart(growthSeries(giftType, amount, years, returnPct));

    collectiveTitle.textContent = 'With ' + peers.toLocaleString('en-US') + plural(peers, ' person', ' people') + ' giving like you';
    collectiveContributed.textContent = fmtUSD(collContrib);
    collectiveFV.textContent = fmtUSD(collFV);
    peersBreak.textContent = peers.toLocaleString('en-US');

    // Perpetuity simulation — collective basis, fixed ENDOWMENT_YEARS window
    const periodicAgg = amount * peers;
    const yearly = simulateEndowment(giftType, periodicAgg, years, returnPct, payoutPct, ENDOWMENT_YEARS);
    const last = yearly[yearly.length - 1];
    const totalImpact = last.granted + last.balance;

    totalImpact30.textContent = fmtUSD(totalImpact);
    grantsBreak.textContent = fmtUSD(last.granted);
    balanceBreak.textContent = fmtUSD(last.balance);
    peersBreakWrap.classList.toggle('hidden', !collectiveActive);

    // Always render, even while the section is hidden, so it is ready the moment it opens.
    renderChart(yearly);
  }

  // ---------- Init ----------
  syncPresetActive();
  recalc();
})();
