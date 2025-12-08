const csvUrl = "https://docs.google.com/spreadsheets/d/1r0c6ViGzlMPuqp6Z0Jm3mk7HrgLlBS5MVcLVL7A3bHY/export?format=csv&gid=0";

let rawRows = [];
let chartInstance = null;

const tenisSelect = document.querySelector(".tenis-select") || document.querySelector(".filtros select:nth-of-type(2)");
const tenis2Select = document.getElementById("tenis2Select");
const btnComparar = document.getElementById("btnComparar");
const notaDiv = document.querySelector(".nota");

const radarColumns = [
  "GCT NOTA",
  "Power NOTA",
  "Impacto NOTA",
  "Pronacao NOTA",
  "Vel. Pronacao NOTA",
  "Xpro NOTA",
  "H20 NOTA",
  "VO2 NOTA",
  "MP - TO NOTA"
];

const btnAtualizar = document.querySelector(".btn");
const rankingBox = document.querySelector("#rankingTop5 ol");

const criterioMap = {
  "GCT": "GCT NOTA",
  "Power": "Power NOTA",
  "Impacto": "Impacto NOTA",
  "Pronação": "Pronacao NOTA",
  "Vel. Pronação": "Vel. Pronacao NOTA",
  "Xpro": "Xpro NOTA",
  "VO₂": "VO2 NOTA",
  "MP-TO": "MP - TO NOTA"
};

function safeNum(value) {
  if (!value) return 0;
  return Number(String(value).trim().replace(",", ".")) || 0;
}

async function loadData() {
  try {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error("Erro ao carregar CSV");
    const txt = await res.text();
    const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
    rawRows = parsed.data;
    populateSelects();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar os dados: " + err.message);
  }
}

function populateSelects() {
  [tenisSelect, tenis2Select].forEach(select => {
    select.innerHTML = '<option value="">----</option>';
    rawRows.forEach((row, i) => {
      const name = row["Tenis"] || row["TENIS"] || row["Tênis"] || `Item ${i + 1}`;
      const option = document.createElement("option");
      option.value = i;
      option.textContent = name;
      select.appendChild(option);
    });
  });

  tenis2Select.style.display = "none";
  btnComparar.style.display = "none";

  tenisSelect.addEventListener("change", () => {
    if (tenisSelect.value !== "") {
      btnComparar.style.display = "block"; 
    } else {
      btnComparar.style.display = "none";
      tenis2Select.style.display = "none";
    }
    updateChart();
  });

  tenis2Select.addEventListener("change", updateChart);

  btnComparar.addEventListener("click", () => {
    if (tenis2Select.style.display === "none") {
      tenis2Select.style.display = "block";
      btnComparar.textContent = "Remover comparação";
    } else {
      tenis2Select.style.display = "none";
      tenis2Select.value = "";
      btnComparar.textContent = "Comparar outro tênis";
    }
    updateChart();
  });
}

function updateChart() {
  const idx1 = Number(tenisSelect.value);
  const idx2 = tenis2Select.style.display === "block" && tenis2Select.value !== "" ? Number(tenis2Select.value) : null;

  if (Number.isNaN(idx1)) {
    notaDiv.innerHTML = "";
    return;
  }

  // === CORREÇÃO IMPORTANTE ===
  if (chartInstance && chartInstance._modo === "ranking") {
    chartInstance.destroy();
    chartInstance = null;
  }
  if (notaDiv) notaDiv.style.display = "block";
  // ===============================

  const row1 = rawRows[idx1];
  const label1 = row1["Tenis"] || row1["TENIS"] || row1["Tênis"];
  const data1 = radarColumns.map(c => safeNum(row1[c]));
  const avg1 = safeNum(row1["MÉDIA FINAL"] || row1["Media Final"] || row1["MEDIA FINAL"]);
  const preco1 = row1["Preco"] || row1["PRECO"] || "-";
  const ideal1 = row1["Preco IDEAL"] || row1["PRECO IDEAL"] || "-";
  const cb1 = row1["C x B"] || row1["C X B"] || "-";

  let datasets = [{
    label: label1,
    data: data1,
    fill: true,
    borderWidth: 2,
    pointRadius: 4,
    backgroundColor: "rgba(255, 99, 132, 0.25)",
    borderColor: "rgba(255, 99, 132, 1)",
    pointBackgroundColor: "rgba(255, 99, 132, 1)"
  }];

  let tenis2Data = null;
  if (idx2 !== null && !Number.isNaN(idx2)) {
    const row2 = rawRows[idx2];
    const label2 = row2["Tenis"] || row2["TENIS"] || row2["Tênis"];
    const data2 = radarColumns.map(c => safeNum(row2[c]));
    const avg2 = safeNum(row2["MÉDIA FINAL"] || row2["Media Final"] || row2["MEDIA FINAL"]);
    const preco2 = row2["Preco"] || row2["PRECO"] || "-";
    const ideal2 = row2["Preco IDEAL"] || row2["PRECO IDEAL"] || "-";
    const cb2 = row2["C x B"] || row2["C X B"] || "-";

    tenis2Data = { label2, avg2, preco2, ideal2, cb2 };

    datasets.push({
      label: label2,
      data: data2,
      fill: true,
      borderWidth: 2,
      pointRadius: 4,
      backgroundColor: "rgba(54, 162, 235, 0.25)",
      borderColor: "rgba(54, 162, 235, 1)",
      pointBackgroundColor: "rgba(54, 162, 235, 1)"
    });
  }

  atualizarInfoBox({
    nome: label1,
    nota: avg1,
    preco: preco1,
    precoIdeal: ideal1,
    custoBeneficio: cb1
  }, tenis2Data ? {
    nome: tenis2Data.label2,
    nota: tenis2Data.avg2,
    preco: tenis2Data.preco2,
    precoIdeal: tenis2Data.ideal2,
    custoBeneficio: tenis2Data.cb2
  } : null);

  const ctx = document.getElementById("radarChart");
  if (chartInstance) {
    chartInstance.data.datasets = datasets;
    chartInstance.update();
  } else {
    chartInstance = new Chart(ctx, {
      type: "radar",
      data: {
        labels: radarColumns,
        datasets
      },
      options: {
        responsive: true,
        scales: {
          r: {
            min: 0,
            max: 10,
            ticks: { stepSize: 1 }
          }
        },
        plugins: {
          legend: { position: "top" }
        }
      }
    });

    chartInstance._modo = "comparacao"; // <<< CORREÇÃO
  }
}

function atualizarInfoBox(tenis1, tenis2) {
  notaDiv.innerHTML = "";

  [tenis1, tenis2].forEach(t => {
    if (!t) return;

    const bloco = document.createElement("div");
    bloco.classList.add("tenisInfo");
    bloco.innerHTML = `
      <span class="tenisNome">${t.nome}</span>
      <div>Nota: ${t.nota || "-"}</div>
      <div>Preço: R$${t.preco}</div>
      <div>Preço Ideal: R$${t.precoIdeal}</div>
      <div>Custo-benefício: ${t.custoBeneficio}</div>
    `;
    notaDiv.appendChild(bloco);
  });
}

function aplicarFiltros() {
  console.log("aplicarFiltros acionado");

  if (!rawRows || rawRows.length === 0) {
    alert("Dados ainda não carregados.");
    return;
  }

  const selects = document.querySelectorAll(".filtros select");
  const precoSelect = selects[selects.length - 1];
  const precoSelecionado = precoSelect ? precoSelect.value : "";

  let limitePreco = Infinity;
  if (precoSelecionado && precoSelecionado !== "----") {
    const match = precoSelecionado.match(/[\d.,]+/);
    if (match) {
      limitePreco = Number(match[0].replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(limitePreco)) limitePreco = Infinity;
    }
  }

  const criterios = [...document.querySelectorAll(".checkboxes input:checked")]
    .map(c => {
      const label = c.closest("label") ? c.closest("label").textContent.trim() : c.parentNode.textContent.trim();
      return criterioMap[label] || criterioMap[label.replace(/\s+/g, " ")] || null;
    })
    .filter(Boolean);

  if (criterios.length < 3) {
    alert("Selecione ao menos 3 critérios para gerar o gráfico radar.");
    return;
  }

  function precoNum(raw) {
    if (!raw) return Infinity;
    let v = String(raw).trim();
    v = v.replace(/R\$\s?/ig, "").replace(/\./g, "").replace(",", ".");
    return Number(v) || Infinity;
  }

  const filtrados = rawRows
    .map(row => {
      const preco = precoNum(row["Preco"] || row["PRECO"] || row["Preço"] || "");
      return { row, preco };
    })
    .filter(item => item.preco <= limitePreco)
    .map(item => {
      const notas = criterios.map(c => safeNum(item.row[c]));
      const media = notas.reduce((a, b) => a + b, 0) / notas.length;
      return {
        nome: item.row["Tenis"] || item.row["TENIS"] || item.row["Tênis"],
        media,
        notas,
        preco: item.preco
      };
    })
    .filter(t => t.media > 0)
    .sort((a, b) => b.media - a.media)
    .slice(0, 5);

  rankingBox.innerHTML = "";
  filtrados.forEach((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `${i + 1}º <strong>${t.nome}</strong> – Nota: ${t.media.toFixed(2)} – R$ ${t.preco}`;
    rankingBox.appendChild(li);
  });

  const cores = [
    "rgba(255,99,132,0.35)",
    "rgba(54,162,235,0.35)",
    "rgba(75,192,192,0.35)",
    "rgba(255,206,86,0.35)",
    "rgba(153,102,255,0.35)"
  ];

  const datasets = filtrados.map((t, i) => ({
    label: t.nome,
    data: t.notas,
    fill: true,
    backgroundColor: cores[i],
    borderColor: cores[i].replace("0.35", "1"),
    borderWidth: 2,
    pointRadius: 3
  }));

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(document.getElementById("radarChart"), {
    type: "radar",
    data: {
      labels: criterios.map(c => c.replace(" NOTA", "")),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  chartInstance._modo = "ranking"; // <<< CORREÇÃO

  if (notaDiv) notaDiv.style.display = "none";
}

if (btnAtualizar) {
  btnAtualizar.addEventListener("click", aplicarFiltros);
}

loadData();
