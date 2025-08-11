const urls = {
  blade: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZaAyAJMyYzz1i4xlulU12XX7cBP06sRx7SX4RuiKIIbWdZRJ9f2KArOtTvMtamDjhNRM6C3Ua23NB/pub?gid=0&single=true&output=csv",
  ratchet: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZaAyAJMyYzz1i4xlulU12XX7cBP06sRx7SX4RuiKIIbWdZRJ9f2KArOtTvMtamDjhNRM6C3Ua23NB/pub?gid=1398397750&single=true&output=csv",
  bit: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZaAyAJMyYzz1i4xlulU12XX7cBP06sRx7SX4RuiKIIbWdZRJ9f2KArOtTvMtamDjhNRM6C3Ua23NB/pub?gid=1222915900&single=true&output=csv",
  match: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRZaAyAJMyYzz1i4xlulU12XX7cBP06sRx7SX4RuiKIIbWdZRJ9f2KArOtTvMtamDjhNRM6C3Ua23NB/pub?gid=736842433&single=true&output=csv"
};

const parts = { blade: {}, ratchet: {}, bit: {} };
const matchData = [];

document.addEventListener("DOMContentLoaded", async () => {
  const [bladeCSV, ratchetCSV, bitCSV, matchCSV] = await Promise.all([
    fetch(urls.blade).then(r => r.text()),
    fetch(urls.ratchet).then(r => r.text()),
    fetch(urls.bit).then(r => r.text()),
    fetch(urls.match).then(r => r.text())
  ]);

  parsePartCSV(bladeCSV, "blade");
  parsePartCSV(ratchetCSV, "ratchet");
  parsePartCSV(bitCSV, "bit", true);
  parseMatches(matchCSV);
  computeStats();
  renderTables();
  enableSorting();
  setupBuildsByPartUI();
});

function parsePartCSV(csv, type, isBit = false) {
  const rows = csv.trim().split("\n").map(r => r.split(","));
  for (let i = 1; i < rows.length; i++) {
    const key = isBit ? rows[i][1] : rows[i][0];
    parts[type][key] = {
      name: key,
      full: rows[i][0],
      line: rows[i][isBit ? 2 : 1],
      used: 0,
      wins: 0,
      losses: 0
    };
  }
}

function parseMatches(csv) {
  const rows = csv.trim().split("\n").map(r => r.split(","));
  const h = rows[0];
  const iP1 = h.indexOf("PLAYER 1");
  const iP2 = h.indexOf("PLAYER 2");
  const iB1 = h.indexOf("BEY 1");
  const iB2 = h.indexOf("BEY 2");
  const iWinner = h.indexOf("WINNER");
  const iFinish = h.indexOf("OUTCOME"); // <--- Add this line!

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    matchData.push({
      p1: r[iP1],
      p2: r[iP2],
      bey1: r[iB1],
      bey2: r[iB2],
      winner: r[iWinner],
      finish: r[iFinish] || "Unknown" // <--- Store the finish
    });
  }
}

function parseParts(bey) {
  const sortedBits = Object.keys(parts.bit).sort((a, b) => b.length - a.length); // Longer bits first

  for (const bit of sortedBits) {
    if (bey.endsWith(bit)) {
      const withoutBit = bey.slice(0, bey.length - bit.length).trim();
      const lastSpace = withoutBit.lastIndexOf(" ");
      if (lastSpace === -1) return ["", "", ""];
      const blade = withoutBit.slice(0, lastSpace).trim();
      const ratchet = withoutBit.slice(lastSpace + 1).trim();
      return [blade, ratchet, bit];
    }
  }

  return ["", "", ""];
}

function count(name, isWin, type) {
  if (!parts[type][name]) return;
  parts[type][name].used++;
  isWin ? parts[type][name].wins++ : parts[type][name].losses++;
}

function computeStats() {
  for (const match of matchData) {
    const [b1Blade, b1Ratchet, b1Bit] = parseParts(match.bey1);
    const [b2Blade, b2Ratchet, b2Bit] = parseParts(match.bey2);

    count(b1Blade, match.winner === match.p1, "blade");
    count(b1Ratchet, match.winner === match.p1, "ratchet");
    count(b1Bit, match.winner === match.p1, "bit");

    count(b2Blade, match.winner === match.p2, "blade");
    count(b2Ratchet, match.winner === match.p2, "ratchet");
    count(b2Bit, match.winner === match.p2, "bit");
  }
}

function renderTables() {
  const container = document.getElementById("tables");
  ["blade", "ratchet", "bit"].forEach(type => {
    const rows = Object.values(parts[type])
      .filter(p => p.used > 0)
      .map(p => {
        const total = p.wins + p.losses;
        const winRate = total ? ((p.wins / total) * 100).toFixed(1) : "0.0";
        const wil = wilson(p.wins, total).toFixed(3);
        return [
          `<span class="clickable-part" data-type="${type}" data-key="${p.name}">${p.name}</span>`,
          p.used,
          p.wins,
          p.losses,
          `${winRate}%`,
          wil
        ];
      });

    const tableHTML = `
      <div class="card-panel">
        <h5>${type[0].toUpperCase() + type.slice(1)}s</h5>
        ${makeTable(["Name", "Usage", "Wins", "Losses", "Win Rate", "Wilson"], rows, "table-" + type)}
      </div>`;
    container.insertAdjacentHTML("beforeend", tableHTML);
  });
}

function setupBuildsByPartUI() {
  const partType = document.getElementById("part-type");
  const partName = document.getElementById("part-name");

  M.FormSelect.init(partType);
  M.FormSelect.init(partName);

  partType.addEventListener("change", () => {
    const type = partType.value;
    partName.innerHTML = '<option disabled selected>Select Part</option>';

    for (const key in parts[type]) {
      if (parts[type][key].used > 0) {
        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = key;
        partName.appendChild(opt);
      }
    }

    partName.disabled = false;
    M.FormSelect.init(partName);
  });

  partName.addEventListener("change", () => {
    const type = partType.value;
    const key = partName.value;
    if (!type || !key) return;

    const builds = {};
    const buildsTable = document.getElementById("builds-table");
    const matchTable = document.getElementById("matches-table");
    matchTable.innerHTML = "";

    for (const match of matchData) {
      const processBey = (player, bey, isWin) => {
        const [blade, ratchet, bit] = parseParts(bey);
        const matchKey = type === "blade" ? blade : type === "ratchet" ? ratchet : bit;
        if (matchKey !== key) return;

        const build = `${blade} ${ratchet}${bit}`;
        const id = `${build}_${player}`;
        if (!builds[id]) builds[id] = { build, player, wins: 0, losses: 0 };
        isWin ? builds[id].wins++ : builds[id].losses++;
      };

      processBey(match.p1, match.bey1, match.winner === match.p1);
      processBey(match.p2, match.bey2, match.winner === match.p2);
    }

    const rows = Object.values(builds).map(b => {
      const total = b.wins + b.losses;
      const rate = total ? ((b.wins / total) * 100).toFixed(1) : "0.0";
      const wscore = wilson(b.wins, total).toFixed(3);
      return [
        `<span class="clickable-build" data-build="${b.build}" data-player="${b.player}">${b.build}</span>`,
        b.player,
        b.wins,
        b.losses,
        `${rate}%`,
        wscore
      ];
    });

    buildsTable.innerHTML = makeTable(["Build", "User", "Win", "Loss", "Win Rate", "Wilson"], rows);

    document.querySelectorAll(".clickable-build").forEach(el => {
      el.addEventListener("click", () => {
        const build = el.dataset.build;
        const player = el.dataset.player;
        renderMatchesForBuild(build, player);
      });
    });
  });
}

function renderMatchesForBuild(build, player) {
  document.getElementById("builds-instruction").style.display = "none";

  const matchRows = [];

  for (const match of matchData) {
    const addMatch = (p, bey, opponent, opponentBey, winner) => {
      const [blade, ratchet, bit] = parseParts(bey);
      const fullBuild = `${blade} ${ratchet}${bit}`;
      if (fullBuild === build && p === player) {
        const result = p === winner ? "Win" : "Loss";
        matchRows.push([
          result,
          opponent,
          opponentBey,
          match.finish || "Unknown"
        ]);
      }
    };

    addMatch(match.p1, match.bey1, match.p2, match.bey2, match.winner);
    addMatch(match.p2, match.bey2, match.p1, match.bey1, match.winner);
  }

  const matchTable = makeTable(
    ["Result", "Opponent", "Opponent's Bey", "Finish Type"],
    matchRows
  );

  document.getElementById("matches-table").innerHTML = `
    <div class="card-panel">
      <h6>Matches for <strong>${build}</strong> by <strong>${player}</strong></h6>
      ${matchTable}
    </div>
  `;
}

function makeTable(headers, rows, id = "") {
  return `
    <div class="table-container">
      <table class="striped" id="${id}">
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function enableSorting() {
  document.querySelectorAll("th").forEach(th => {
    th.style.cursor = "pointer";
    th.addEventListener("click", () => {
      const table = th.closest("table");
      const index = Array.from(th.parentNode.children).indexOf(th);
      const rows = Array.from(table.querySelectorAll("tbody tr"));
      const asc = !th.classList.contains("asc");

      rows.sort((a, b) => {
        const v1 = a.children[index].textContent.trim();
        const v2 = b.children[index].textContent.trim();
        return asc
          ? isNaN(v1 - v2) ? v1.localeCompare(v2) : v1 - v2
          : isNaN(v2 - v1) ? v2.localeCompare(v1) : v2 - v1;
      });

      th.classList.toggle("asc", asc);
      th.classList.toggle("desc", !asc);
      table.querySelector("tbody").innerHTML = "";
      rows.forEach(row => table.querySelector("tbody").appendChild(row));
    });
  });
}

function wilson(wins, total, z = 1.96) {
  if (total === 0) return 0;
  const phat = wins / total;
  const denom = 1 + z * z / total;
  const center = phat + z * z / (2 * total);
  const spread = z * Math.sqrt((phat * (1 - phat) + z * z / (4 * total)) / total);
  return (center - spread) / denom;
}
