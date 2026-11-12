// Add a company later by adding one object to this array.
const insurers = [
  {
    id: "farm-bureau",
    name: "Virginia Farm Bureau",
    rank: 1,
    url: "https://www.vafb.com/insurance/auto",
    logo: "assets/logos/farm-bureau.png",
    note: "Usually cheapest in VA, and cheapest for teens. $40 yearly membership covers the whole household. Quotes often go through a local agent."
  },
  {
    id: "travelers",
    name: "Travelers",
    rank: 2,
    url: "https://www.travelers.com/quote/car-insurance",
    logo: "assets/logos/travelers.svg",
    note: "Usually second-cheapest. The online quote takes about 7 minutes."
  },
  {
    id: "erie",
    name: "Erie",
    rank: 3,
    url: "https://www.erieinsurance.com/auto-insurance/virginia",
    logo: "assets/logos/erie.svg",
    logoBoxClass: "logo-box--erie", // Erie's official logo is white, shown on Erie navy
    note: "Rated best overall for teens, with great service. Slightly pricier on average."
  }
];

const STORAGE_KEY = "insuranceTracker";
const STATUSES = ["not-started", "requested", "quoted"];
const STATUS_LABELS = { "not-started": "Not started", requested: "Requested", quoted: "Quoted" };

function emptyState() {
  const state = { geico: "", updated: null, quotes: {} };
  insurers.forEach((ins) => {
    state.quotes[ins.id] = { amount: "", matches: false, notes: "", status: "not-started" };
  });
  return state;
}

function load() {
  const state = emptyState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved) {
      state.geico = saved.geico ?? "";
      state.updated = saved.updated ?? null;
      insurers.forEach((ins) => Object.assign(state.quotes[ins.id], saved.quotes?.[ins.id]));
    }
  } catch (e) { /* storage unavailable or corrupt: start fresh */ }
  return state;
}

let state = load();

function save() {
  state.updated = new Date().toISOString();
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  render();
}

const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const num = (v) => (v === "" || v === null || isNaN(Number(v)) ? null : Number(v));

// Build cards once
const cardsEl = document.getElementById("cards");
const tpl = document.getElementById("card-tpl");
const refs = {};

insurers.forEach((ins) => {
  const node = tpl.content.firstElementChild.cloneNode(true);
  const q = state.quotes[ins.id];
  const img = node.querySelector(".logo");
  img.src = ins.logo;
  img.alt = ins.name + " logo";
  if (ins.logoBoxClass) node.querySelector(".logo-box").classList.add(ins.logoBoxClass);
  node.querySelector(".rank").textContent = "#" + ins.rank;
  node.querySelector(".name").textContent = ins.name;
  node.querySelector(".note").textContent = ins.note;
  node.querySelector(".quote-btn").href = ins.url;
  node.querySelector(".quote-btn").setAttribute("aria-label", "Get a quote from " + ins.name + " (opens in new tab)");

  const amount = node.querySelector(".in-quote");
  const matches = node.querySelector(".in-match");
  const notes = node.querySelector(".in-notes");
  const pill = node.querySelector(".pill");

  amount.value = q.amount;
  matches.checked = q.matches;
  notes.value = q.notes;

  amount.addEventListener("input", () => { q.amount = amount.value; save(); });
  matches.addEventListener("change", () => { q.matches = matches.checked; save(); });
  notes.addEventListener("input", () => { q.notes = notes.value; save(); });
  pill.addEventListener("click", () => {
    q.status = STATUSES[(STATUSES.indexOf(q.status) + 1) % STATUSES.length];
    save();
  });

  refs[ins.id] = {
    amount, matches, notes, pill,
    delta: node.querySelector(".delta"),
    unmatched: node.querySelector(".unmatched")
  };
  cardsEl.appendChild(node);
});

const geicoEl = document.getElementById("geico");
geicoEl.value = state.geico;
geicoEl.addEventListener("input", () => { state.geico = geicoEl.value; save(); });

document.getElementById("clear").addEventListener("click", () => {
  if (!confirm("Clear all quotes, notes and the GEICO amount? This can't be undone.")) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  state = emptyState();
  geicoEl.value = "";
  insurers.forEach((ins) => {
    const r = refs[ins.id];
    r.amount.value = ""; r.matches.checked = false; r.notes.value = "";
  });
  render();
});

function render() {
  const geico = num(state.geico);
  let cheapest = null;
  let anyQuote = false;

  insurers.forEach((ins) => {
    const q = state.quotes[ins.id];
    const r = refs[ins.id];
    const amt = num(q.amount);

    r.pill.dataset.status = q.status;
    r.pill.textContent = STATUS_LABELS[q.status] || STATUS_LABELS["not-started"];

    if (amt !== null) {
      anyQuote = true;
      r.unmatched.hidden = q.matches;
      if (q.matches && (!cheapest || amt < cheapest.amt)) cheapest = { ins, amt };
    } else {
      r.unmatched.hidden = true;
    }

    if (amt !== null && geico !== null) {
      const diff = geico - amt;
      r.delta.hidden = false;
      r.delta.className = "delta " + (diff >= 0 ? "save" : "cost");
      r.delta.textContent = diff >= 0
        ? "Saves " + money(diff) + "/yr vs GEICO"
        : "Costs " + money(-diff) + "/yr more";
    } else {
      r.delta.hidden = true;
    }
  });

  const summary = document.getElementById("summary");
  summary.hidden = !anyQuote;
  const cheapestEl = document.getElementById("cheapest");
  const savingsEl = document.getElementById("savings");

  if (cheapest) {
    cheapestEl.innerHTML = "Cheapest so far: <strong></strong>";
    cheapestEl.querySelector("strong").textContent = cheapest.ins.name + " — " + money(cheapest.amt) + "/yr";
    if (geico !== null) {
      const s = geico - cheapest.amt;
      savingsEl.hidden = false;
      savingsEl.textContent = s >= 0
        ? "Savings vs GEICO: " + money(s) + "/yr (" + money(s / 12) + "/mo)"
        : "Savings vs GEICO: none yet — costs " + money(-s) + "/yr (" + money(-s / 12) + "/mo) more";
    } else {
      savingsEl.hidden = false;
      savingsEl.textContent = "Enter the GEICO amount above to see savings.";
    }
  } else {
    cheapestEl.textContent = "Cheapest so far: none yet — check \"Coverage matches GEICO\" on a quote to count it.";
    savingsEl.hidden = true;
  }

  document.getElementById("updated").textContent = "Last updated: " + (state.updated
    ? new Date(state.updated).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "never");
}

render();
