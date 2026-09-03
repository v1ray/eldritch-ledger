(() => {
  "use strict";

  const SAVE_KEY = "stargazers-ledger-save-v1";
  const TICK_MS = 100;

  // ---------- content data ----------

  const BUILDINGS = [
    { id: "candle", name: "Guttering Candle", desc: "A wavering flame that outlines forbidden diagrams in shifting shadow.", baseCost: 15, baseProd: 0.1 },
    { id: "tome", name: "Waterlogged Tome", desc: "Pages swollen with brine, ink bleeding into new and unwelcome sentences.", baseCost: 100, baseProd: 1 },
    { id: "cultist", name: "Yellow Sign Devotee", desc: "Murmurs the same six words, over and over, until they mean something.", baseCost: 1100, baseProd: 8 },
    { id: "archive", name: "Miskatonic Annex", desc: "A reading room the university insists does not exist.", baseCost: 12000, baseProd: 47 },
    { id: "shrine", name: "Tide-Slick Shrine", desc: "A barnacled altar; the tide never quite goes out around it.", baseCost: 130000, baseProd: 260 },
    { id: "obelisk", name: "Black Obelisk", desc: "Casts a shadow that points to wherever you are not looking.", baseCost: 1.4e6, baseProd: 1400 },
    { id: "attendant", name: "Star-Spawn Attendant", desc: "Folds space to fetch the tea. The tea is not, strictly, tea.", baseCost: 2e7, baseProd: 7800 },
    { id: "gate", name: "Gate Beneath the Waves", desc: "A door that was always there, now merely unlocked.", baseCost: 3.3e8, baseProd: 44000 },
    { id: "lighthouse", name: "Drowned Lighthouse", desc: "Its beam finds nothing to warn, but the keeper still turns it.", baseCost: 60000, baseProd: 0, sanityRegen: 0.35, isUtility: true },
  ];

  const COST_GROWTH = 1.15;

  const UPGRADES = [
    { id: "u_click1", name: "Tallow-Stained Fingers", desc: "Turning pages faster, whatever the cost to the fingertips.", cost: 100, requires: null, effect: { type: "click_mult", value: 2 } },
    { id: "u_click2", name: "Borrowed Eye", desc: "It sees the page before you do. You've stopped asking where you found it.", cost: 5000, requires: "u_click1", effect: { type: "click_mult", value: 2 } },
    { id: "u_click3", name: "Third Eye, Blinking", desc: "It opens only when you gaze into the sigil. You've stopped minding.", cost: 250000, requires: "u_click2", effect: { type: "click_mult", value: 3 } },
    { id: "u_build1", name: "Annotated Margins", desc: "Every candle and tome in the collection works a little harder.", cost: 2000, requires: null, effect: { type: "global_mult", value: 1.5 } },
    { id: "u_build2", name: "A Shared Vocabulary", desc: "The devotees and the annex have started finishing each other's sentences.", cost: 80000, requires: "u_build1", effect: { type: "global_mult", value: 1.5 } },
    { id: "u_build3", name: "Concordance of Names", desc: "Cataloguing the unpronounceable makes it, marginally, more useful.", cost: 4e6, requires: "u_build2", effect: { type: "global_mult", value: 2 } },
    { id: "u_candle_tier", name: "Tallow of a Different Make", desc: "The Guttering Candles burn with a colour that isn't in the visible spectrum.", cost: 800, requires: null, effect: { type: "building_mult", target: "candle", value: 4 } },
    { id: "u_tome_tier", name: "A Second Reading", desc: "The Waterlogged Tomes say something new each time you're not looking.", cost: 6000, requires: null, effect: { type: "building_mult", target: "tome", value: 4 } },
    { id: "u_cultist_tier", name: "A Fuller Choir", desc: "The Devotees have learned a seventh word. It helps.", cost: 60000, requires: null, effect: { type: "building_mult", target: "cultist", value: 4 } },
    { id: "u_archive_tier", name: "Restricted Stacks", desc: "The Annex has found a floor that was not in the original blueprints.", cost: 700000, requires: null, effect: { type: "building_mult", target: "archive", value: 4 } },
    { id: "u_sanity1", name: "A Steadying Ritual", desc: "Small, private, and just barely enough. Sanity fades more slowly now.", cost: 15000, requires: null, effect: { type: "sanity_decay_mult", value: 0.6 } },
    { id: "u_sanity2", name: "Correspondence with Kindred Minds", desc: "Others have seen it too. That, somehow, helps more than it should.", cost: 900000, requires: "u_sanity1", effect: { type: "sanity_decay_mult", value: 0.6 } },
  ];

  const FLAVOR_LINES = [
    "the stars are not yet right, but they are rehearsing.",
    "something in the walls keeps time with your reading.",
    "you no longer remember which books you own and which own you.",
    "the tide came in wrong again. no one else seems to notice.",
    "a word you wrote yesterday is gone from the page today.",
    "your reflection was a half-second slow this morning.",
    "the cat will not enter the study anymore.",
    "you dreamed in a language you do not speak, and woke understanding it.",
    "the ink smells faintly of salt water now.",
    "a letter arrived, addressed in your own hand, postmarked next month.",
    "the candle flame bends toward the closed door.",
    "you counted the corners of the room. there were more than four.",
    "the phone rang once. the number was your own.",
    "something below the annex has started answering the archivists.",
    "you understand the whispering better than you'd like to.",
  ];

  const CORRUPT_LINES = [
    "th̷e ang̶les are lying to you again.",
    "i̴t knows you are counting.",
    "your name tastes different when you think it now.",
    "do not turn the page. you turned the page.",
    "the ledger is writing in a hand that is almost yours.",
    "we are so pleased you kept reading.",
    "the gate does not open. the gate was never closed.",
    "you are being catalogued.",
  ];

  // ---------- state ----------

  const state = {
    insight: 0,
    lifetimeInsight: 0,
    clickBase: 1,
    sanity: 100,
    sanityDecayMult: 1,
    oldBlood: 0,
    buildings: {},
    upgrades: [],
    lastTick: Date.now(),
  };

  BUILDINGS.forEach(b => { state.buildings[b.id] = 0; });

  // ---------- number formatting ----------

  const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];

  function formatNumber(n) {
    if (n === 0) return "0";
    if (n < 1000) {
      return n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString();
    }
    const tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
    const scaled = n / Math.pow(1000, tier);
    return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + SUFFIXES[tier];
  }

  function formatRate(n) {
    return formatNumber(n) + "/s";
  }

  // ---------- derived values ----------

  function oldBloodMult() {
    return 1 + state.oldBlood * 0.1;
  }

  function globalMultFromUpgrades() {
    let mult = 1;
    for (const uid of state.upgrades) {
      const up = UPGRADES.find(u => u.id === uid);
      if (up && up.effect.type === "global_mult") mult *= up.effect.value;
    }
    return mult;
  }

  function buildingMultFromUpgrades(id) {
    let mult = 1;
    for (const uid of state.upgrades) {
      const up = UPGRADES.find(u => u.id === uid);
      if (up && up.effect.type === "building_mult" && up.effect.target === id) mult *= up.effect.value;
    }
    return mult;
  }

  function clickMultFromUpgrades() {
    let mult = 1;
    for (const uid of state.upgrades) {
      const up = UPGRADES.find(u => u.id === uid);
      if (up && up.effect.type === "click_mult") mult *= up.effect.value;
    }
    return mult;
  }

  function sanityDecayMultFromUpgrades() {
    let mult = 1;
    for (const uid of state.upgrades) {
      const up = UPGRADES.find(u => u.id === uid);
      if (up && up.effect.type === "sanity_decay_mult") mult *= up.effect.value;
    }
    return mult;
  }

  function madnessMult() {
    // low sanity gives a production bonus, up to +50% at 0 sanity
    return 1 + (100 - state.sanity) / 100 * 0.5;
  }

  function buildingCost(building, owned) {
    return building.baseCost * Math.pow(COST_GROWTH, owned);
  }

  function insightPerSecond() {
    let total = 0;
    const g = globalMultFromUpgrades() * oldBloodMult() * madnessMult();
    for (const b of BUILDINGS) {
      if (b.isUtility) continue;
      const owned = state.buildings[b.id];
      if (owned > 0) total += owned * b.baseProd * buildingMultFromUpgrades(b.id) * g;
    }
    return total;
  }

  function sanityRegenPerSecond() {
    let regen = 0.04; // slow baseline drift back toward calm
    const lh = BUILDINGS.find(b => b.id === "lighthouse");
    regen += state.buildings.lighthouse * lh.sanityRegen;
    return regen;
  }

  function sanityDecayPerSecond() {
    const prod = insightPerSecond();
    const base = Math.log10(prod + 1) * 0.03;
    return base * state.sanityDecayMult;
  }

  function clickPower() {
    return state.clickBase * clickMultFromUpgrades() * oldBloodMult() * madnessMult();
  }

  // ---------- actions ----------

  function doClick() {
    const gain = clickPower();
    state.insight += gain;
    state.lifetimeInsight += gain;
    pulseSigil();
    render();
  }

  function buyBuilding(id) {
    const b = BUILDINGS.find(x => x.id === id);
    const owned = state.buildings[id];
    const cost = buildingCost(b, owned);
    if (state.insight < cost) return;
    state.insight -= cost;
    state.buildings[id] = owned + 1;
    render();
  }

  function buyUpgrade(id) {
    const up = UPGRADES.find(u => u.id === id);
    if (!up || state.upgrades.includes(id)) return;
    if (up.requires && !state.upgrades.includes(up.requires)) return;
    if (state.insight < up.cost) return;
    state.insight -= up.cost;
    state.upgrades.push(id);
    if (up.effect.type === "sanity_decay_mult") {
      state.sanityDecayMult = sanityDecayMultFromUpgrades();
    }
    render();
  }

  function awakeningOldBloodGain() {
    return Math.floor(Math.sqrt(state.lifetimeInsight / 1e6));
  }

  function canAwaken() {
    return state.lifetimeInsight >= 1e6;
  }

  function doAwaken() {
    if (!canAwaken()) return;
    const gain = awakeningOldBloodGain();
    if (gain <= 0) return;
    if (!confirm("Dissolve the self and begin again? You will keep only the Old Blood you've earned (+" + gain + "), and its favor upon all that follows.")) return;
    state.oldBlood += gain;
    state.insight = 0;
    state.lifetimeInsight = 0;
    state.sanity = 100;
    state.sanityDecayMult = 1;
    state.clickBase = 1;
    state.upgrades = [];
    BUILDINGS.forEach(b => { state.buildings[b.id] = 0; });
    showToast("The self dissolves. Something steadier remains.");
    render();
  }

  function resetAll() {
    if (!confirm("Burn the ledger entirely? All progress, including Old Blood, will be lost.")) return;
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }

  // ---------- log ----------

  let logSeq = 0;

  function pushLog(text, corrupt) {
    const list = document.getElementById("log-list");
    const li = document.createElement("li");
    li.textContent = text;
    li.className = corrupt ? "corrupt fresh" : "fresh";
    li.dataset.seq = String(logSeq++);
    list.appendChild(li);
    setTimeout(() => li.classList.remove("fresh"), 3000);
    while (list.children.length > 40) list.removeChild(list.firstChild);
  }

  function maybeLog() {
    const chance = state.sanity < 40 ? 0.06 : 0.025;
    if (Math.random() > chance) return;
    const useCorrupt = state.sanity < 35 && Math.random() < 0.5;
    const pool = useCorrupt ? CORRUPT_LINES : FLAVOR_LINES;
    const line = pool[Math.floor(Math.random() * pool.length)];
    pushLog(line, useCorrupt);
  }

  // ---------- sigil animation ----------

  function pulseSigil() {
    const btn = document.getElementById("click-target");
    btn.classList.remove("pulse");
    // force reflow so the animation can restart
    void btn.offsetWidth;
    btn.classList.add("pulse");
  }

  // ---------- toast ----------

  let toastTimer = null;
  function showToast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  // ---------- rendering ----------

  function render() {
    document.getElementById("insight-value").textContent = formatNumber(state.insight);
    document.getElementById("insight-rate").textContent = formatRate(insightPerSecond());
    document.getElementById("click-power").textContent = formatNumber(clickPower());

    document.getElementById("sanity-value").textContent = Math.round(state.sanity);
    document.getElementById("sanity-fill").style.width = state.sanity + "%";

    const note = document.getElementById("sanity-note");
    if (state.sanity < 20) note.textContent = "the walls are breathing.";
    else if (state.sanity < 45) note.textContent = "you keep hearing your name.";
    else if (state.sanity < 70) note.textContent = "a low, unplaceable unease.";
    else note.textContent = "";

    document.body.classList.toggle("sanity-low", state.sanity < 45);
    document.body.classList.toggle("sanity-critical", state.sanity < 20);

    if (state.oldBlood > 0) {
      document.getElementById("oldblood-vital").hidden = false;
      document.getElementById("oldblood-value").textContent = formatNumber(state.oldBlood);
      document.getElementById("oldblood-mult").textContent = oldBloodMult().toFixed(2);
    }

    renderBuildings();
    renderUpgrades();
    renderAwakening();
  }

  function renderBuildings() {
    const container = document.getElementById("building-list");
    container.innerHTML = "";
    BUILDINGS.forEach(b => {
      const owned = state.buildings[b.id];
      const cost = buildingCost(b, owned);
      const affordable = state.insight >= cost;

      const row = document.createElement("div");
      row.className = "building-row" + (affordable ? " affordable" : "");

      const nameWrap = document.createElement("div");
      nameWrap.className = "building-name-wrap";
      const nameEl = document.createElement("div");
      nameEl.className = "building-name";
      nameEl.innerHTML = `<span>${b.name}</span><span class="building-count">×${owned}</span>`;
      const descEl = document.createElement("p");
      descEl.className = "building-desc";
      descEl.textContent = b.desc;
      nameWrap.appendChild(nameEl);
      nameWrap.appendChild(descEl);

      const prodEl = document.createElement("div");
      prodEl.className = "building-prod";
      if (b.isUtility) {
        prodEl.textContent = "+" + b.sanityRegen.toFixed(2) + " sanity/s each";
      } else {
        const eachProd = b.baseProd * buildingMultFromUpgrades(b.id) * globalMultFromUpgrades() * oldBloodMult() * madnessMult();
        prodEl.textContent = formatRate(eachProd) + " each";
      }

      const buyBtn = document.createElement("button");
      buyBtn.className = "buy-button";
      buyBtn.textContent = "Acquire — " + formatNumber(cost);
      buyBtn.disabled = !affordable;
      buyBtn.addEventListener("click", () => buyBuilding(b.id));

      row.appendChild(nameWrap);
      row.appendChild(prodEl);
      row.appendChild(buyBtn);
      container.appendChild(row);
    });
  }

  function renderUpgrades() {
    const container = document.getElementById("upgrade-list");
    container.innerHTML = "";
    UPGRADES.forEach(up => {
      const owned = state.upgrades.includes(up.id);
      const locked = up.requires && !state.upgrades.includes(up.requires);
      if (locked) return; // hide until prerequisite is met, to avoid clutter
      const affordable = state.insight >= up.cost && !owned;

      const card = document.createElement("div");
      card.className = "upgrade-card" + (affordable ? " affordable" : "") + (owned ? " owned" : "");

      const title = document.createElement("div");
      title.className = "upgrade-title";
      title.textContent = up.name;

      const desc = document.createElement("p");
      desc.className = "upgrade-desc";
      desc.textContent = up.desc;

      card.appendChild(title);
      card.appendChild(desc);

      if (owned) {
        const ownedTag = document.createElement("span");
        ownedTag.className = "upgrade-cost";
        ownedTag.textContent = "learned";
        card.appendChild(ownedTag);
      } else {
        const cost = document.createElement("span");
        cost.className = "upgrade-cost";
        cost.textContent = "Cost: " + formatNumber(up.cost);
        const btn = document.createElement("button");
        btn.className = "upgrade-buy";
        btn.textContent = "Undertake";
        btn.disabled = !affordable;
        btn.addEventListener("click", () => buyUpgrade(up.id));
        card.appendChild(cost);
        card.appendChild(btn);
      }

      container.appendChild(card);
    });
  }

  function renderAwakening() {
    const btn = document.getElementById("awaken-button");
    const preview = document.getElementById("awaken-preview");
    const note = document.getElementById("awakening-note");
    if (canAwaken()) {
      const gain = awakeningOldBloodGain();
      btn.disabled = gain <= 0;
      preview.textContent = "Would grant +" + gain + " Old Blood (currently ×" + oldBloodMult().toFixed(2) + " favor on all insight).";
      note.textContent = "Lifetime insight is enough to attempt it. What remains after is smaller, and steadier.";
    } else {
      btn.disabled = true;
      const remaining = 1e6 - state.lifetimeInsight;
      preview.textContent = formatNumber(Math.max(remaining, 0)) + " more lifetime insight needed.";
    }
  }

  // ---------- game loop ----------

  function tick() {
    const now = Date.now();
    const dt = Math.min((now - state.lastTick) / 1000, 2); // clamp to avoid huge jumps from a backgrounded tab
    state.lastTick = now;

    const prod = insightPerSecond() * dt;
    state.insight += prod;
    state.lifetimeInsight += prod;

    const decay = sanityDecayPerSecond();
    const regen = sanityRegenPerSecond();
    state.sanity = Math.max(0, Math.min(100, state.sanity - decay * dt + regen * dt));

    maybeLog();
    render();
    save();
  }

  // ---------- save / load ----------

  function save() {
    const payload = {
      insight: state.insight,
      lifetimeInsight: state.lifetimeInsight,
      clickBase: state.clickBase,
      sanity: state.sanity,
      sanityDecayMult: state.sanityDecayMult,
      oldBlood: state.oldBlood,
      buildings: state.buildings,
      upgrades: state.upgrades,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
      // storage unavailable; progress simply won't persist
    }
  }

  function load() {
    let raw;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch (e) {
      return;
    }
    if (!raw) return;
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return;
    }

    state.insight = data.insight || 0;
    state.lifetimeInsight = data.lifetimeInsight || 0;
    state.clickBase = data.clickBase || 1;
    state.sanity = typeof data.sanity === "number" ? data.sanity : 100;
    state.sanityDecayMult = data.sanityDecayMult || 1;
    state.oldBlood = data.oldBlood || 0;
    state.upgrades = Array.isArray(data.upgrades) ? data.upgrades : [];
    if (data.buildings) {
      BUILDINGS.forEach(b => { state.buildings[b.id] = data.buildings[b.id] || 0; });
    }

    if (data.savedAt) {
      const elapsedSec = Math.max(0, (Date.now() - data.savedAt) / 1000);
      const cappedSec = Math.min(elapsedSec, 8 * 3600); // cap offline progress at 8 hours
      if (cappedSec > 5) {
        const offlineGain = insightPerSecond() * cappedSec;
        if (offlineGain > 0) {
          state.insight += offlineGain;
          state.lifetimeInsight += offlineGain;
          showToast("While you were away: +" + formatNumber(offlineGain) + " insight.");
        }
        const offlineRegen = sanityRegenPerSecond() * cappedSec;
        const offlineDecay = sanityDecayPerSecond() * cappedSec;
        state.sanity = Math.max(0, Math.min(100, state.sanity - offlineDecay + offlineRegen));
      }
    }
    state.lastTick = Date.now();
  }

  // ---------- wire up ----------

  function init() {
    load();

    document.getElementById("click-target").addEventListener("click", doClick);
    document.getElementById("awaken-button").addEventListener("click", doAwaken);
    document.getElementById("reset-button").addEventListener("click", resetAll);

    pushLog("the ledger opens to a blank page, for now.", false);

    render();
    setInterval(tick, TICK_MS);

    window.addEventListener("beforeunload", save);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
