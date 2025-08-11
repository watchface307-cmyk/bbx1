let players = {};
let radarChart;

const FINISH_TYPES = ["Spin Finish", "Burst Finish", "Over Finish", "Extreme Finish"];
const FINISH_POINTS = {
  "Spin Finish": 1,
  "Burst Finish": 2,
  "Over Finish": 2,
  "Extreme Finish": 3
};

document.addEventListener("DOMContentLoaded", () => {
  fetchCSV();
  document.getElementById("player-select").addEventListener("change", renderPlayerCard);
  document.getElementById("toggle-advanced").addEventListener("click", toggleAdvanced);
  document.getElementById("show-all-matches").addEventListener("click", showAllMatches);
});

function fetchCSV() {
  const tourneyURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZaAyAJMyYzz1i4xlulU12XX7cBP06sRx7SX4RuiKIIbWdZRJ9f2KArOtTvMtamDjhNRM6C3Ua23NB/pub?gid=1835011659&single=true&output=csv";
  const matchURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZaAyAJMyYzz1i4xlulU12XX7cBP06sRx7SX4RuiKIIbWdZRJ9f2KArOtTvMtamDjhNRM6C3Ua23NB/pub?gid=736842433&single=true&output=csv";

  Promise.all([fetch(tourneyURL), fetch(matchURL)])
    .then(responses => Promise.all(responses.map(r => r.text())))
    .then(([tourneyCSV, matchCSV]) => {
      parseTourneyCSV(tourneyCSV);
      parseMatchCSV(matchCSV);
      populateDropdown();
    });
}

function parseTourneyCSV(csv) {
  const rows = csv.trim().split("\n").map(r => r.split(","));
  const header = rows[0];

  const iName = header.indexOf("Player Name");
  const b1 = [header.indexOf("Blade 1"), header.indexOf("Ratchet 1"), header.indexOf("Bit 1")];
  const b2 = [header.indexOf("Blade 2"), header.indexOf("Ratchet 2"), header.indexOf("Bit 2")];
  const b3 = [header.indexOf("Blade 3"), header.indexOf("Ratchet 3"), header.indexOf("Bit 3")];

  for (let i = 1; i < rows.length; i++) {
    const name = rows[i][iName];
    const bey1 = `${rows[i][b1[0]]} ${rows[i][b1[1]]}${rows[i][b1[2]]}`;
    const bey2 = `${rows[i][b2[0]]} ${rows[i][b2[1]]}${rows[i][b2[2]]}`;
    const bey3 = `${rows[i][b3[0]]} ${rows[i][b3[1]]}${rows[i][b3[2]]}`;

    players[name] = {
      name,
      beys: [bey1, bey2, bey3],
      matches: [],
      winFinishes: {},
      loseFinishes: {},
      beyStats: {},
      wins: 0,
      losses: 0,
      points: 0
    };
  }
}

function parseMatchCSV(csv) {
  const rows = csv.trim().split("\n").map(r => r.split(","));
  const header = rows[0];

  const iP1 = header.indexOf("PLAYER 1");
  const iP2 = header.indexOf("PLAYER 2");
  const iB1 = header.indexOf("BEY 1");
  const iB2 = header.indexOf("BEY 2");
  const iOutcome = header.indexOf("OUTCOME");
  const iWinner = header.indexOf("WINNER");

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const p1 = r[iP1];
    const p2 = r[iP2];
    const b1 = r[iB1];
    const b2 = r[iB2];
    const fullOutcome = r[iOutcome];
    const finishType = fullOutcome.split(" (")[0].trim();
    const win = r[iWinner];
    const lose = win === p1 ? p2 : p1;
    const winBey = (r[iP1] === win) ? b1 : b2;
    const loseBey = (r[iP1] === lose) ? b1 : b2;
    const pts = FINISH_POINTS[finishType] || 0;

    if (!players[win] || !players[lose]) continue;

    players[win].wins++;
    players[win].points += pts;
    players[win].winFinishes[finishType] = (players[win].winFinishes[finishType] || 0) + 1;
    players[win].matches.push({
      result: "win",
      bey: winBey,
      outcome: finishType,
      opponent: lose,
      opponentBey: loseBey
    });

    players[lose].losses++;
    players[lose].loseFinishes[finishType] = (players[lose].loseFinishes[finishType] || 0) + 1;
    players[lose].matches.push({
      result: "loss",
      bey: loseBey,
      outcome: finishType,
      opponent: win,
      opponentBey: winBey
    });

    if (!players[win].beyStats[winBey]) players[win].beyStats[winBey] = { win: 0, loss: 0, finishes: {}, points: 0 };
    if (!players[lose].beyStats[loseBey]) players[lose].beyStats[loseBey] = { win: 0, loss: 0, finishes: {}, points: 0 };

    players[win].beyStats[winBey].win++;
    players[win].beyStats[winBey].points += pts;
    players[win].beyStats[winBey].finishes[finishType] = (players[win].beyStats[winBey].finishes[finishType] || 0) + 1;

    if (!players[lose].beyStats[loseBey].lossFinishes) players[lose].beyStats[loseBey].lossFinishes = {};
    players[lose].beyStats[loseBey].loss++;
    players[lose].beyStats[loseBey].lossFinishes[finishType] = (players[lose].beyStats[loseBey].lossFinishes[finishType] || 0) + 1;
  }
}

function populateDropdown() {
  const sel = document.getElementById("player-select");
  sel.innerHTML = '<option disabled selected>Select Player</option>';
  for (const name in players) {
    const op = document.createElement("option");
    op.value = name;
    op.textContent = name;
    sel.appendChild(op);
  }
  M.FormSelect.init(sel);
}

function renderPlayerCard() {
  const name = document.getElementById("player-select").value;
  if (!name || !players[name]) return;

  // Check if layout exists; if not, restore and re-run after DOM update
  if (!document.getElementById("player-card")) {
    restorePlayerCard();

    setTimeout(() => {
      // 👇 Recheck after restoring layout
      const recheck = document.getElementById("player-card");
      if (recheck) renderPlayerCard();
    }, 50); // slight delay to let DOM settle

    return; // Prevent running rest of this function
  }

  const p = players[name];

  document.getElementById("player-card").classList.remove("hidden");
  document.getElementById("advanced-card").classList.add("hidden");

  document.getElementById("player-name").textContent = name;

  let mvb = "", maxPts = -1;
  for (const bey of p.beys) {
    const stat = p.beyStats[bey] || { points: 0 };
    if (stat.points > maxPts) {
      maxPts = stat.points;
      mvb = bey;
    }
  }

  document.getElementById("mvb").textContent = mvb || "N/A";
  document.getElementById("mvb-reason").textContent = `${p.beyStats[mvb]?.win || 0} wins, ${p.beyStats[mvb]?.points || 0} pts`;
  document.getElementById("finish-win").textContent = topFinish(p.winFinishes) || "N/A";
  document.getElementById("finish-loss").textContent = topFinish(p.loseFinishes) || "N/A";

  const totalMatches = p.wins + p.losses;
  const rate = totalMatches ? ((p.wins / totalMatches) * 100).toFixed(1) : "0.0";
  const ppm = totalMatches ? (p.points / totalMatches).toFixed(2) : "0.00";
  document.getElementById("win-rate").textContent = `${rate}% (${p.wins} of ${totalMatches}) — ${ppm} pts/match`;

  drawRadar(p.winFinishes);
  drawWinLossTable(p);
}

function topFinish(map) {
  return Object.entries(map).reduce((top, [k, v]) => v > top[1] ? [k, v] : top, ["", -1])[0];
}

function drawRadar(winFinishes) {
  const ctx = document.getElementById("radarChart").getContext("2d");
  const data = FINISH_TYPES.map(f => winFinishes[f] || 0);
  if (radarChart) radarChart.destroy();

  radarChart = new Chart(ctx, {
    type: "radar",
    data: {
      labels: FINISH_TYPES,
      datasets: [{
        label: "Finish Bias",
        data,
        backgroundColor: "rgba(33, 150, 243, 0.2)",
        borderColor: "#2196f3",
        pointBackgroundColor: "#2196f3"
      }]
    },
    options: {
      responsive: true,
      scales: {
        r: {
          suggestedMin: 0,
          ticks: { stepSize: 1 }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function drawWinLossTable(player) {
  const winT = [], lossT = [];

  for (const bey of player.beys) {
    const stat = player.beyStats[bey] || { finishes: {}, lossFinishes: {}, win: 0, loss: 0, points: 0 };

    const spinW = stat.finishes["Spin Finish"] || 0;
    const burstW = stat.finishes["Burst Finish"] || 0;
    const overW = stat.finishes["Over Finish"] || 0;
    const extremeW = stat.finishes["Extreme Finish"] || 0;
    const totalPts = (spinW * 1) + (burstW * 2) + (overW * 2) + (extremeW * 3);

    const winRow = [bey, spinW, burstW, overW, extremeW, stat.win || 0, totalPts];

    const loss = stat.lossFinishes || {};
    const spinL = loss["Spin Finish"] || 0;
    const burstL = loss["Burst Finish"] || 0;
    const overL = loss["Over Finish"] || 0;
    const extremeL = loss["Extreme Finish"] || 0;

    const totalLosses = spinL + burstL + overL + extremeL;
    const totalPtsGiven = (spinL * 1) + (burstL * 2) + (overL * 2) + (extremeL * 3);

    const lossRow = [bey, spinL, burstL, overL, extremeL, totalLosses, totalPtsGiven];

    winT.push(winRow);
    lossT.push(lossRow);
  }

  const winHeaders = ["", "Spin", "Burst", "Over", "Extreme", "Wins", "Points"];
  const lossHeaders = ["", "Spin", "Burst", "Over", "Extreme", "Losses", "Points Given"];

  document.getElementById("win-table").innerHTML = `<div class="table-container">${makeTable(winHeaders, winT)}</div>`;
  document.getElementById("loss-table").innerHTML = `<div class="table-container">${makeTable(lossHeaders, lossT)}</div>`;
}

function makeTable(headers, rows) {
  return `
    <table class="striped highlight">
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map(r => {
          const isWin = r[0] === "Win";
          const rowClass = isWin ? "light-blue lighten-4" : (r[0] === "Loss" ? "red lighten-4" : "");
          return `<tr class="${rowClass}">${r.map(c => `<td>${c}</td>`).join("")}</tr>`;
        }).join("")}
      </tbody>
    </table>
  `;
}

function toggleAdvanced() {
  const adv = document.getElementById("advanced-card");
  adv.classList.toggle("hidden");
  document.getElementById("toggle-advanced").textContent =
    adv.classList.contains("hidden") ? "Show Advanced" : "Hide Advanced";
}

function showBackButton(callback) {
  const backContainer = document.getElementById("back-button-container");
  backContainer.innerHTML = `
    <button class="btn waves-effect waves-light" id="back-button">
      Back
    </button>
  `;
  document.getElementById("back-button").addEventListener("click", () => {
    backContainer.innerHTML = "";
    restorePlayerCard();  // restores the full HTML
    callback();           // runs renderPlayerCard()
  });
}

function showAllMatches() {
  const name = document.getElementById("player-select").value;
  if (!name || !players[name]) return;

  const p = players[name];
const rows = p.matches.map(m => [
  m.result === "win" ? "Win" : "Loss",
  m.bey,
  m.opponent,
  m.opponentBey || "-",
  m.outcome
]);

const table = makeTable(
  ["Result", "Your Bey", "Opponent", "Opponent's Bey", "Finish"],
  rows
);

  document.getElementById("player-card").classList.add("hidden");
  document.getElementById("advanced-card").classList.add("hidden");

  const output = `
    <div class="card-panel">
      <h5>All Matches for <strong>${name}</strong></h5>
      <div class="table-container" style="overflow-x: auto;">
        ${table}
      </div>
    </div>
  `;
  document.getElementById("analytics-content").innerHTML = output;

  showBackButton(() => {
    // Restore original analytics structure
    document.getElementById("analytics-content").innerHTML = `
      <div id="player-card" class="card-panel hidden">
        <h5 id="player-name"></h5>
        <p><b>Most Valuable Bey:</b> <span id="mvb"></span></p>
        <p><b>Reason:</b> <span id="mvb-reason"></span></p>
        <p><b>Most Common Finish (Win):</b> <span id="finish-win"></span></p>
        <p><b>Most Common Finish (Loss):</b> <span id="finish-loss"></span></p>
        <p><b>Win Rate:</b> <span id="win-rate"></span></p>
        <div style="max-width: 400px; margin: 0 auto;">
          <canvas id="radarChart"></canvas>
        </div>
        <div class="center-align" style="margin-top: 16px;">
          <button id="toggle-advanced" class="btn blue">Show Advanced</button>
          <button id="show-all-matches" class="btn blue">Show All Matches</button>
        </div>
      </div>

      <div id="advanced-card" class="card-panel hidden">
        <h6><b>Win by Finish</b></h6>
        <div id="win-table" class="responsive-table"></div>
        <h6><b>Loss by Finish</b></h6>
        <div id="loss-table" class="responsive-table"></div>
      </div>
    `;

    // Re-bind event listeners
    document.getElementById("toggle-advanced").addEventListener("click", toggleAdvanced);
    document.getElementById("show-all-matches").addEventListener("click", showAllMatches);
    document.getElementById("back-button-container").innerHTML = "";

    renderPlayerCard();
  });
}

function restorePlayerCard() {
  document.getElementById("analytics-content").innerHTML = `
    <div id="player-card" class="card-panel hidden">
      <h5 id="player-name"></h5>
      <p><b>Most Valuable Bey:</b> <span id="mvb"></span></p>
      <p><b>Reason:</b> <span id="mvb-reason"></span></p>
      <p><b>Most Common Finish (Win):</b> <span id="finish-win"></span></p>
      <p><b>Most Common Finish (Loss):</b> <span id="finish-loss"></span></p>
      <p><b>Win Rate:</b> <span id="win-rate"></span></p>
      <div style="max-width: 400px; margin: 0 auto;">
        <canvas id="radarChart"></canvas>
      </div>
      <div class="center-align" style="margin-top: 16px;">
        <button id="toggle-advanced" class="btn blue">Show Advanced</button>
        <button id="show-all-matches" class="btn blue">Show All Matches</button>
      </div>
    </div>

    <div id="advanced-card" class="card-panel hidden">
      <h6><b>Win by Finish</b></h6>
      <div id="win-table" class="responsive-table"></div>
      <h6><b>Loss by Finish</b></h6>
      <div id="loss-table" class="responsive-table"></div>
    </div>
  `;

  // Reattach event listeners
  document.getElementById("toggle-advanced").addEventListener("click", toggleAdvanced);
  document.getElementById("show-all-matches").addEventListener("click", showAllMatches);
}
