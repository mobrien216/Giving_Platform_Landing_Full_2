
/* ============================================================
   ESTATE PLANNING CHECKLIST
   ============================================================ */
var initEstateView = (function(){
const DATA = [
{ id:"docs", tab:"Documents", title:"Core documents", blurb:"The instructions that speak for you when you can't — while you're living, and after.", items:[
  {id:"will", t:"Last will and testament", d:"Directs everything that passes through probate and names the executor who carries it out. Without a valid will, state law decides who receives what, and a court picks the person in charge.",
   g:"A will is where most legacy gifts begin. Charitable language can be a fixed dollar amount, a percentage of the estate, a specific asset, or whatever remains after family is provided for. A percentage or residuary gift keeps its proportion as your estate grows or shrinks, so you don't have to revisit the number every few years."},
  {id:"trust", t:"Revocable living trust", d:"Holds assets during your life and distributes them after, outside of probate. Worth the cost if you own property in more than one state, want privacy, or want a smooth handoff if you become incapacitated."},
  {id:"funding", t:"Trust funding confirmed", d:"An unfunded trust does nothing. Check that deeds, brokerage accounts, and business interests have actually been retitled into the trust's name — this is the step most often left half-done."},
  {id:"dpoa", t:"Durable power of attorney for finances", d:"Names who can pay bills, manage accounts, and sign on your behalf if you cannot. Durable means it survives your incapacity, which is the entire point."},
  {id:"hcpoa", t:"Health care power of attorney", d:"Names the person who makes medical decisions for you. Name a backup, and tell both people you've named them."},
  {id:"livingwill", t:"Living will or advance directive", d:"States your wishes about life-sustaining treatment so your agent is confirming your decision rather than making one under pressure."},
  {id:"hipaa", t:"HIPAA authorization", d:"Lets named people receive your medical information. Without it, providers can refuse to speak to the person you appointed."},
  {id:"guardian", t:"Guardian nominations for minor children or dependents", d:"Names who raises your children and who manages money for them — often deliberately two different people. Include a backup.",
   g:"If you set up a trust for children or a dependent with special needs, you can name a charitable remainder: whatever is left when the trust's purpose ends passes to causes you chose rather than defaulting to distant relatives."}
]},

{ id:"own", tab:"What you own", title:"What you own", blurb:"Your plan can only direct what your executor can find. This section is the map.", items:[
  {id:"inventory", t:"Master asset inventory", d:"One list: accounts with institutions, real property, insurance, retirement plans, business interests, and where statements arrive. Date it, and keep it with your documents."},
  {id:"deeds", t:"Real property deeds and titling reviewed", d:"How a property is titled beats what your will says. Joint tenancy with right of survivorship, tenancy by the entirety, and life estates all pass outside the will. Out-of-state property may trigger a second probate.",
   g:"Appreciated real estate is often among the most tax-efficient things to give. Given during life to a qualified charity, neither you nor the charity pays capital gains on the transfer — but mortgaged property, environmental exposure, and carrying costs mean the charity has to review it first, so start that conversation early."},
  {id:"registration", t:"Account registrations reviewed", d:"Check every bank and brokerage account for joint ownership and for transfer-on-death or payable-on-death instructions. These override your will."},
  {id:"business", t:"Business interests and agreements documented", d:"Operating agreements, buy-sell agreements, partnership terms, and any transfer restrictions. Know what your heirs would actually be able to sell."},
  {id:"valuables", t:"Personal property of value catalogued", d:"Art, collections, jewelry, vehicles, firearms, instruments. Photograph them, note appraisals, and say in writing who receives what — this is where families most often fall out.",
   g:"Collections and art can be given outright or through your estate, but the deduction depends on whether the charity can use the item for its exempt purpose. Confirm appraisal requirements and whether the organization accepts the asset at all before you name it in a document."},
  {id:"debts", t:"Debts and liabilities listed", d:"Mortgages, lines of credit, loans you've guaranteed, and anything secured by an asset you plan to leave to someone."}
]},

{ id:"beneficiary", tab:"Beneficiaries", title:"Beneficiary designations", blurb:"These control more wealth than most wills do, and they beat your will every time. Outdated forms are the single most common failure in an otherwise good plan.", items:[
  {id:"retirement", t:"Retirement accounts reviewed", d:"401(k), 403(b), IRA, and similar plans pass by the form on file with the plan, not by your will. Check primary and contingent named on each one.",
   g:"Retirement assets are usually the most expensive thing to leave to heirs and the cheapest to leave to charity. A qualified charity pays no income tax when it receives them; most non-spouse heirs owe income tax as they draw the account down within ten years. Many families deliberately route retirement dollars to charity and leave other assets — which generally receive a step-up in basis — to family. A beneficiary form costs nothing to change."},
  {id:"lifeins", t:"Life insurance policies reviewed", d:"Confirm the beneficiary on each policy, including any group coverage through an employer, and whether the policy is still needed for the purpose it was bought for.",
   g:"A paid-up policy you no longer need can be given outright, or a charity can be named as beneficiary for all or part of the death benefit. Either route turns a dormant asset into a gift larger than most people expect to make."},
  {id:"contracts", t:"Annuities, HSAs, and other contract assets", d:"These also pass by designation. Health savings accounts in particular have unfavorable rules for non-spouse heirs."},
  {id:"todpod", t:"Transfer-on-death and payable-on-death registrations", d:"Convenient, but they bypass your trust and can unbalance a plan that assumed those dollars would fund something else."},
  {id:"contingent", t:"Contingent beneficiaries named on everything", d:"If your primary beneficiary dies before you and no one is next in line, the asset falls back into probate — which is usually the outcome the plan was built to avoid."},
  {id:"conflicts", t:"Designations checked against your will and trust", d:"Read them side by side once. Contradictions between a beneficiary form and a will are a leading cause of litigation between family members."}
]},

{ id:"tax", tab:"Tax", title:"Tax and transfer planning", blurb:"What passes to heirs, what passes to charity, and what goes to taxes and settlement costs — priced before you commit, not after.", items:[
  {id:"exemption", t:"Federal estate and gift tax position reviewed", d:"Confirm the current exemption amount and where your estate sits against it, counting life insurance you own and business value. Exemption levels change with legislation, so revisit this rather than relying on what was true a few years ago."},
  {id:"portability", t:"Portability understood, if married", d:"A surviving spouse can carry over an unused federal exemption, but only if an estate tax return is filed after the first death. Missing that filing forfeits it."},
  {id:"state", t:"State estate or inheritance tax exposure checked", d:"Several states levy their own estate or inheritance tax at thresholds well below the federal one, and property in another state can pull you into its rules."},
  {id:"gifting", t:"Lifetime gifting plan set", d:"Annual exclusion gifts, 529 contributions, and tuition or medical bills paid directly to the institution all move value out of the estate without using exemption.",
   g:"Concentrating several years of charitable giving into one high-income year — often through a donor-advised fund — can lift you above the standard deduction in the year you need the deduction, while you grant the money out to charities steadily over the years that follow."},
  {id:"basis", t:"Cost basis considered before transferring assets", d:"Assets held until death generally receive a step-up in basis; assets given away during life usually carry your original basis to the recipient. Which asset you give, and when, changes the tax bill materially.",
   g:"For a low-basis asset you'd like to sell, a charitable remainder trust can spread the gain, pay you or a beneficiary income for life or a term of years, and leave the remainder to charity. It's a substantial commitment and irrevocable — model it with your advisor before signing."},
  {id:"inherited", t:"Inherited account rules discussed with heirs", d:"Most non-spouse beneficiaries must empty an inherited retirement account within ten years, and some must take annual distributions along the way. Heirs who don't know this get surprised by the tax."},
  {id:"liquidity", t:"Liquidity for taxes, debts, and settlement costs", d:"If most of your estate is a business, a farm, or real estate, make sure there's cash to cover what's owed so heirs aren't forced into a quick sale."}
]},

{ id:"giving", tab:"Your giving plan", title:"Your giving plan", blurb:"The part of an estate plan people most often leave as a note in the margin. Treated deliberately, it's also the part your family is most likely to talk about for decades.", items:[
  {id:"intent", t:"Statement of charitable intent written", g:1, d:"One page in your own words: what you care about, why it matters to you, and how much latitude your successors have to adapt as the world changes. Of everything in this list, this is the document families report finding most useful — it turns a set of instructions into something they understand."},
  {id:"split", t:"Lifetime versus legacy split decided", g:1, d:"How much you intend to give while you're alive, and how much at the end. Giving during life lets you see the result and adjust; giving at the end preserves flexibility if your own needs change."},
  {id:"vehicle", t:"Giving vehicle chosen", g:1, d:"A donor-advised fund is simple, low-cost, and lets you recommend grants over time. A designated fund supports named organizations permanently. A field-of-interest fund supports a cause even as the organizations working on it change. A private foundation gives maximum control with real administrative and reporting obligations. A supporting organization sits between the last two. Match the vehicle to how much involvement you actually want."},
  {id:"route", t:"A route chosen for each gift", g:1, d:"A bequest in the will or trust, a beneficiary designation on a retirement account or policy, or an outright transfer during life. The route determines the tax result far more than the amount does."},
  {id:"qcd", t:"Qualified charitable distributions considered", g:1, d:"From age 70 and a half, you can direct money from an IRA straight to a qualified charity. It's excluded from income rather than deducted, which helps even if you don't itemize, and it can count toward a required minimum distribution. There's an annual limit that adjusts for inflation, and donor-advised funds are not eligible recipients — confirm the current figure and the rules before you direct one."},
  {id:"lifeincome", t:"Life-income gifts explored", g:1, d:"A charitable gift annuity pays a fixed amount for life in exchange for a gift, with a portion deductible now. A charitable remainder trust pays you or a beneficiary first and leaves the remainder to charity. A charitable lead trust reverses the order, paying charity for a term and returning the asset to family, which can be effective for transferring appreciating assets."},
  {id:"successors", t:"Successors named on your fund", g:1, d:"If you hold a donor-advised fund or a named fund, decide what happens to it: children as successor advisors, a spend-down over a set number of years, conversion to an endowment, or distribution to named organizations. Left unsaid, the sponsoring organization's default policy decides for you."},
  {id:"legalnames", t:"Exact legal name, EIN, and gift terms confirmed", g:1, d:"Confirm each charity's precise legal name, tax identification number, and address directly with the organization, and ask whether it can accept what you intend to give. Naming a chapter instead of a national body, or an organization that has since merged or dissolved, is among the most common and most expensive bequest errors — and one nobody is around to correct."},
  {id:"familymeeting", t:"Family giving conversation held", g:1, d:"Tell the people who will carry it out what you decided and why. Families that discuss charitable intent in advance rarely litigate it later; families that discover it in a document sometimes do."}
]},

{ id:"business", tab:"Business", title:"Business and special assets", blurb:"Skip anything here that doesn't apply — mark it not applicable and it drops out of your count.", items:[
  {id:"succession", t:"Succession plan documented", d:"Who runs it, who owns it, and on what timeline. Include what happens on death, disability, and a decision to leave."},
  {id:"buysell", t:"Buy-sell agreement in place and funded", d:"An agreement without funding is a wish. Confirm the insurance or reserve behind it still matches the company's current value."},
  {id:"valuation", t:"Current valuation on file", d:"A defensible, recent valuation drives estate tax exposure, buyout pricing, and the deduction on any charitable transfer of shares."},
  {id:"presale", t:"Charitable planning done before any sale", d:"If a sale or liquidity event is coming, this is the highest-leverage timing decision in the whole plan.",
   g:"Giving shares or property to charity before a sale becomes a binding commitment can avoid capital gains tax on the gifted portion, while the deduction is generally based on fair market value. Once the deal is signed, the IRS may treat the gain as yours regardless of who holds the asset at closing. Bring your attorney, tax advisor, and gift planner into the same conversation months ahead, not days."}
]},

{ id:"digital", tab:"Digital", title:"Digital life and records", blurb:"Accounts your executor cannot reach may as well not exist. Some are worth money; others hold decades of family photographs.", items:[
  {id:"digitalinv", t:"Digital asset inventory made", d:"Email, cloud storage, photo libraries, domains, loyalty and reward balances, subscriptions, social accounts, and anything generating income."},
  {id:"passwords", t:"Password manager with emergency access set up", d:"Most password managers offer a legacy or emergency contact feature. Turning it on is faster and safer than leaving a list in a drawer."},
  {id:"crypto", t:"Cryptocurrency and private keys addressed", d:"Self-custodied assets are permanently lost without the keys. Document access separately from the assets themselves, and say plainly what exists."},
  {id:"originals", t:"Original documents located and access arranged", d:"Note where originals are kept and who can physically reach them. A safe deposit box nobody can open delays everything."}
]},

{ id:"people", tab:"People &amp; wishes", title:"People and wishes", blurb:"The instructions that aren't legal instruments, and the conversations that prevent most disputes.", items:[
  {id:"fiduciaries", t:"Executor, trustee, and agents named — and asked", d:"Confirm each person is willing and able, and name a successor for each role. An institution can serve as trustee where the job is long, complex, or contentious."},
  {id:"letter", t:"Letter of intent written", d:"Not legally binding, but it explains reasoning your documents can't: why an asset went to one child, what a possession meant, what you hope the money makes possible."},
  {id:"funeral", t:"Funeral and memorial wishes recorded", d:"Burial or cremation, service preferences, and whether arrangements are prepaid. Keep this outside the will, which is often not read until after the service.",
   g:"If you want memorial gifts directed somewhere, name the organization and fund here in full. Families usually have hours, not days, to decide what the notice says, and a vague instruction sends money somewhere you didn't intend."},
  {id:"pets", t:"Care for pets and dependents arranged", d:"Name a caregiver and, if the need is long-term or costly, set aside funds for it in the trust."},
  {id:"conversation", t:"Family conversation held", d:"Cover the shape of the plan, where the documents live, and who holds which role. You don't have to disclose amounts to prevent most surprises."}
]},

{ id:"maintain", tab:"Upkeep", title:"Keeping it current", blurb:"A plan written once and never revisited tends to describe a family that no longer exists.", items:[
  {id:"cycle", t:"Review scheduled every three to five years", d:"Put a date on the calendar rather than waiting to remember. Tax law and family circumstances both move."},
  {id:"triggers", t:"Life-event triggers noted", d:"Marriage, divorce, birth, death, a move to another state, a business sale, a large inheritance, or a serious diagnosis. Any of these should prompt a review immediately, not at the next scheduled one."},
  {id:"team", t:"Advisor roster written down", d:"Attorney, tax advisor, financial advisor, insurance agent, and gift planner — with current contact details, in one place your family can find."},
  {id:"card", t:"Document location card given to your agents", d:"A single card listing what exists and where it is. Hand it to your executor and your health care agent now, while explaining it takes thirty seconds."}
]}
];

  var KEY = 'tcf-estate-checklist-v1';
  var state = { items:{}, notes:{}, tab:null };
  var built = false, allItems = [], root, tabsHost, panelHost, tickHost;

  function load(){
    try{
      var raw = localStorage.getItem(KEY);
      if (raw){
        var p = JSON.parse(raw);
        if (p && typeof p === 'object'){
          state.items = p.items || {};
          state.notes = p.notes || {};
          state.tab = p.tab || null;
        }
      }
    } catch(e){ /* storage unavailable — run without persistence */ }
  }
  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(state)); }
    catch(e){ /* quota or private mode — carry on */ }
  }
  function esc(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c];
    });
  }

  function build(){
    root = document.getElementById('view-estate');
    tabsHost = document.getElementById('ecTabs');
    panelHost = document.getElementById('ecPanels');
    tickHost = document.getElementById('ecTicks');
    if (!root || !tabsHost) return;

    DATA.forEach(function(sec){
      var hasGive = sec.items.some(function(i){ return !!i.g; });

      var tab = document.createElement('button');
      tab.className = 'ec-tab' + (hasGive ? '' : ' nogive');
      tab.type = 'button';
      tab.setAttribute('role','tab');
      tab.setAttribute('aria-selected','false');
      tab.setAttribute('aria-controls','ecp-' + sec.id);
      tab.tabIndex = -1;
      tab.dataset.sec = sec.id;
      tab.innerHTML = '<span class="ec-gdot" aria-hidden="true"></span><span>' + sec.tab + '</span><span class="ec-frac"></span>';
      tabsHost.appendChild(tab);

      var panel = document.createElement('div');
      panel.className = 'ec-panel';
      panel.id = 'ecp-' + sec.id;
      panel.setAttribute('role','tabpanel');

      var head = document.createElement('div');
      head.className = 'ec-phead';
      head.innerHTML = '<h2>' + esc(sec.title) + '</h2><p>' + esc(sec.blurb) + '</p>';
      panel.appendChild(head);

      var list = document.createElement('div');
      list.className = 'ec-list' + (hasGive ? '' : ' nogive');

      sec.items.forEach(function(it){
        var key = sec.id + '.' + it.id;
        var isGive = !!it.g;
        allItems.push({ key:key, sec:sec.id, title:it.t, give:isGive });

        var art = document.createElement('div');
        art.className = 'ec-item';
        art.dataset.key = key;
        art.dataset.state = state.items[key] || 'todo';
        art.dataset.open = 'false';
        if (isGive) art.dataset.give = '1';

        var giveHTML = (typeof it.g === 'string')
          ? '<div class="ec-callout"><span class="ch">Giving opportunity</span><p>' + esc(it.g) + '</p></div>'
          : '';

        art.innerHTML =
          '<div class="ec-row">' +
            '<button class="ec-check" type="button" data-act="toggle" aria-label="Mark complete: ' + esc(it.t) + '">' +
              '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2 7.4 5.3 10.7 12 4"/></svg>' +
            '</button>' +
            '<button class="ec-title" type="button" data-act="open" aria-expanded="false">' +
              '<span class="t">' + esc(it.t) + '</span>' +
              '<span class="ec-meta">' +
                (isGive ? '<span class="ec-gtag">giving</span>' : '') +
                '<svg class="ec-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4.2 6 8.2 10 4.2"/></svg>' +
              '</span>' +
            '</button>' +
          '</div>' +
          '<div class="ec-detail">' +
            '<p>' + esc(it.d) + '</p>' + giveHTML +
            '<textarea class="ec-note" rows="1" placeholder="Note for the client file — a name, a question, a date"></textarea>' +
            '<div><button class="ec-na" type="button" data-act="na"></button></div>' +
          '</div>';

        var ta = art.querySelector('.ec-note');
        if (state.notes[key]) ta.value = state.notes[key];
        ta.addEventListener('input', function(){
          state.notes[key] = ta.value;
          if (!ta.value) delete state.notes[key];
          save();
        });

        list.appendChild(art);
      });

      var empty = document.createElement('p');
      empty.className = 'ec-empty';
      empty.textContent = 'No charitable decisions live in this section. Turn the filter off to see its items.';
      list.appendChild(empty);

      panel.appendChild(list);
      panelHost.appendChild(panel);
    });

    allItems.forEach(function(it, i){
      var b = document.createElement('button');
      b.className = 'ec-tick';
      b.type = 'button';
      b.dataset.key = it.key;
      b.dataset.sec = it.sec;
      b.title = it.title;
      b.setAttribute('aria-label', 'Go to: ' + it.title);
      var next = allItems[i + 1];
      if (next && next.sec !== it.sec) b.className += ' gap';
      tickHost.appendChild(b);
    });

    document.getElementById('ecGiveCount').textContent =
      allItems.filter(function(i){ return i.give; }).length;

    wire();
    selectTab(state.tab && DATA.some(function(s){ return s.id === state.tab; }) ? state.tab : DATA[0].id);
    refresh();
  }

  function selectTab(secId, focusIt){
    var tabs = Array.prototype.slice.call(tabsHost.querySelectorAll('.ec-tab'));
    tabs.forEach(function(t){
      var on = t.dataset.sec === secId;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on){
        t.scrollIntoView({ block:'nearest', inline:'nearest' });
        if (focusIt) t.focus();
      }
    });
    panelHost.querySelectorAll('.ec-panel').forEach(function(p){
      p.classList.toggle('on', p.id === 'ecp-' + secId);
    });
    state.tab = secId;
    save();
  }

  function refresh(){
    var done = 0, na = 0, bySec = {};
    DATA.forEach(function(s){ bySec[s.id] = { done:0, total:0, na:0 }; });

    allItems.forEach(function(it){
      var st = state.items[it.key] || 'todo';
      var b = bySec[it.sec];
      b.total++;
      if (st === 'done'){ done++; b.done++; }
      if (st === 'na'){ na++; b.na++; }

      var el = panelHost.querySelector('.ec-item[data-key="' + it.key + '"]');
      if (el){
        el.dataset.state = st;
        el.querySelector('[data-act="na"]').textContent =
          st === 'na' ? 'This does apply — put it back' : 'Doesn\u2019t apply to this client';
      }
      var tk = tickHost.querySelector('.ec-tick[data-key="' + it.key + '"]');
      if (tk) tk.dataset.s = st;
    });

    document.getElementById('ecDone').textContent = done;
    document.getElementById('ecTotal').textContent = allItems.length - na;
    document.getElementById('ecNaNote').textContent =
      na ? ('items complete · ' + na + ' not applicable') : 'items complete';

    DATA.forEach(function(s){
      var b = bySec[s.id], rel = b.total - b.na;
      var tab = tabsHost.querySelector('[data-sec="' + s.id + '"]');
      tab.querySelector('.ec-frac').textContent = b.done + '/' + rel;
      tab.classList.toggle('done', rel > 0 && b.done === rel);
    });
  }

  function wire(){
    tabsHost.addEventListener('click', function(e){
      var t = e.target.closest('.ec-tab');
      if (t) selectTab(t.dataset.sec);
    });
    tabsHost.addEventListener('keydown', function(e){
      var tabs = Array.prototype.slice.call(tabsHost.querySelectorAll('.ec-tab'));
      var i = tabs.findIndex(function(t){ return t.getAttribute('aria-selected') === 'true'; });
      var n = -1;
      if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = tabs.length - 1;
      if (n >= 0){ e.preventDefault(); selectTab(tabs[n].dataset.sec, true); }
    });

    panelHost.addEventListener('click', function(e){
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var item = btn.closest('.ec-item');
      var key = item.dataset.key;
      var act = btn.dataset.act;

      if (act === 'toggle'){
        state.items[key] = (state.items[key] === 'done') ? 'todo' : 'done';
        if (state.items[key] === 'todo') delete state.items[key];
        save(); refresh();
      }
      if (act === 'open'){
        var open = item.dataset.open === 'true';
        item.dataset.open = open ? 'false' : 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      }
      if (act === 'na'){
        state.items[key] = (state.items[key] === 'na') ? 'todo' : 'na';
        if (state.items[key] === 'todo') delete state.items[key];
        if (state.items[key] === 'na') item.dataset.open = 'false';
        save(); refresh();
      }
    });

    tickHost.addEventListener('click', function(e){
      var tk = e.target.closest('.ec-tick');
      if (!tk) return;
      selectTab(tk.dataset.sec);
      var el = panelHost.querySelector('.ec-item[data-key="' + tk.dataset.key + '"]');
      if (el){
        el.dataset.open = 'true';
        el.querySelector('[data-act="open"]').setAttribute('aria-expanded','true');
        el.scrollIntoView({ behavior:'smooth', block:'center' });
      }
    });

    document.getElementById('ecGiveToggle').addEventListener('change', function(e){
      root.classList.toggle('give-only', e.target.checked);
    });

    document.getElementById('ecCopy').addEventListener('click', function(){
      var lines = ['Estate planning — still outstanding', ''];
      DATA.forEach(function(s){
        var open = s.items.filter(function(it){
          var st = state.items[s.id + '.' + it.id];
          return st !== 'done' && st !== 'na';
        });
        if (!open.length) return;
        lines.push(s.title.toUpperCase());
        open.forEach(function(it){
          var key = s.id + '.' + it.id;
          lines.push('  - ' + it.t + (it.g ? '  [giving]' : ''));
          if (state.notes[key]) lines.push('      note: ' + state.notes[key]);
        });
        lines.push('');
      });
      if (lines.length === 2) lines.push('Nothing outstanding.');
      var text = lines.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(ecToast).catch(function(){ ecFallback(text); });
      } else { ecFallback(text); }
    });

    document.getElementById('ecReset').addEventListener('click', function(){
      if (!confirm('Clear every check and note on this checklist?')) return;
      state.items = {}; state.notes = {};
      panelHost.querySelectorAll('.ec-note').forEach(function(n){ n.value = ''; });
      save(); refresh();
    });
  }

  function ecToast(){
    var b = document.getElementById('ecCopy');
    var t = b.textContent;
    b.textContent = 'Copied to clipboard';
    setTimeout(function(){ b.textContent = t; }, 2200);
  }
  function ecFallback(text){
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); ecToast(); } catch(e){ /* nothing to do */ }
    document.body.removeChild(ta);
  }

  return function(){
    if (built) return;
    built = true;
    load();
    build();
  };
})();

/* ============================================================
   ADVISOR FAQ
   ============================================================ */
var initFaqView = (function(){
  var FAQS = [
    { c:'Working together',
      q:'Can I, as an advisor, remain involved in managing the investments?',
      a:'Yes. You can maintain your advisor relationship and your investment role. Alternatively, the foundation offers its own investment options and local bank and broker-managed pools.' },
    { c:'Working together',
      q:'How does the Cleveland Foundation collaborate with advisors to ensure a seamless experience?',
      a:'The foundation coordinates directly with advisors — preserving your role, providing gift documents, offering joint meetings, respecting advisor referrals, and supporting advisor-led investment options.' },
    { c:'Granting',
      q:'Can my client give to organizations outside Greater Cleveland — or even outside the U.S.?',
      a:'Yes. Domestic grants are allowed nationwide to any I.R.C. 501(c)(3) public charity. International grants can be made through U.S.-based fiscal agents or affiliates.' },
    { c:'Granting',
      q:'How does the Cleveland Foundation ensure due diligence on nonprofits before donor advised fund grants are made?',
      a:'Cleveland Foundation staff review all recommended recipients and verify I.R.C. 501(c)(3) public charity status. Grant approvals are ratified by the foundation&rsquo;s board of directors.' },
    { c:'Gifts &amp; assets',
      q:'How can my client donate appreciated stock or other non-cash assets?',
      a:'The Cleveland Foundation accepts publicly traded and closely held stock, real estate, life insurance, and personal property such as art or jewelry.' },
    { c:'Gifts &amp; assets',
      q:'Can the Cleveland Foundation accept complex gifts like real estate or closely held business interests?',
      a:'Yes. The foundation reviews complex, non-cash gift proposals and works closely with legal counsel to ensure proper documentation and valuation.' },
    { c:'Gifts &amp; assets',
      q:'What are the tax benefits of giving through the Cleveland Foundation?',
      a:'Because the Cleveland Foundation is a public charity, donors are eligible for the highest income tax deduction available: up to 60% of AGI for cash and 30% for appreciated assets. IRA-qualified charitable distributions are also available to those who are 70&frac12; and older.' },
    { c:'Funds &amp; legacy',
      q:'What happens to a fund when the original donor passes away?',
      a:'If successor advisors are named, they become the advisors of the fund. If not, the Cleveland Foundation continues making grants aligned with donor intent.' },
    { c:'Funds &amp; legacy',
      q:'Can my client remain anonymous in their giving?',
      a:'Yes. The foundation can accept gifts, establish funds, and issue grants anonymously on request.' },
    { c:'Funds &amp; legacy',
      q:'Can the Cleveland Foundation help my client define their philanthropic goals?',
      a:'Yes. The foundation offers customized giving strategies and philanthropic planning consultations, including priority-setting and mission alignment.' }
  ];

  var built = false, activeCat = 'All', term = '';

  function render(){
    var grid = document.getElementById('faqGrid');
    var none = document.getElementById('faqNone');
    var t = term.trim().toLowerCase();
    var shown = 0;

    grid.querySelectorAll('.faq-item').forEach(function(el){
      var i = FAQS[+el.dataset.i];
      var catOK = (activeCat === 'All') || (i.c === activeCat);
      var txtOK = !t || (i.q + ' ' + i.a).toLowerCase().indexOf(t) > -1;
      var on = catOK && txtOK;
      el.style.display = on ? '' : 'none';
      if (on) shown++;
    });
    none.style.display = shown ? 'none' : 'block';
  }

  function build(){
    var grid = document.getElementById('faqGrid');
    var chips = document.getElementById('faqChips');
    if (!grid) return;

    var cats = ['All'];
    FAQS.forEach(function(f){ if (cats.indexOf(f.c) < 0) cats.push(f.c); });
    cats.forEach(function(c){
      var b = document.createElement('button');
      b.className = 'faq-chip';
      b.type = 'button';
      b.innerHTML = c;
      b.setAttribute('aria-pressed', c === 'All' ? 'true' : 'false');
      b.addEventListener('click', function(){
        activeCat = c;
        chips.querySelectorAll('.faq-chip').forEach(function(x){ x.setAttribute('aria-pressed','false'); });
        b.setAttribute('aria-pressed','true');
        render();
      });
      chips.appendChild(b);
    });

    FAQS.forEach(function(f, i){
      var d = document.createElement('div');
      d.className = 'faq-item';
      d.dataset.i = i;
      d.dataset.open = 'false';
      d.innerHTML =
        '<button class="faq-q" type="button" aria-expanded="false">' +
          '<span class="qt">' + f.q + '</span>' +
          '<svg class="faq-plus" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2v14M2 9h14"/></svg>' +
        '</button>' +
        '<div class="faq-a"><p>' + f.a + '</p><span class="faq-cat">' + f.c + '</span></div>';
      d.querySelector('.faq-q').addEventListener('click', function(){
        var open = d.dataset.open === 'true';
        d.dataset.open = open ? 'false' : 'true';
        this.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
      grid.appendChild(d);
    });

    document.getElementById('faqSearch').addEventListener('input', function(e){
      term = e.target.value;
      render();
    });
  }

  return function(){
    if (built) return;
    built = true;
    build();
    render();
  };
})();

