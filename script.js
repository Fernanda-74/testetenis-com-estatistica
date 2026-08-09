const csvUrl = "https://docs.google.com/spreadsheets/d/1r0c6ViGzlMPuqp6Z0Jm3mk7HrgLlBS5MVcLVL7A3bHY/export?format=csv&gid=0";

let rawRows = [];
let chartInstance = null;

// Seletores principais
const tenisSelect = document.querySelector(".tenis-select") || document.querySelector(".filtros select:nth-of-type(2)");
const tenis2Select = document.getElementById("tenis2Select");
const tenis2Wrapper = document.getElementById("tenis2Wrapper");
const btnComparar = document.getElementById("btnComparar");
const notaDiv = document.querySelector(".nota");
const btnSelecionarTodos = document.getElementById("btnSelecionarTodos");
const criteriosCheckboxes = document.querySelectorAll(".checkboxes input[type='checkbox']");
const btnEscolherTenis = document.getElementById("btnEscolherTenis");
const btnLimparFiltros = document.getElementById("btnLimparFiltros");
const btnAtualizarFiltros = document.getElementById("btnAtualizarFiltros");
const tipoCorridaSelect = document.getElementById("tipoCorridaSelect");
const precoSelect = document.getElementById("precoSelect");
const btnToggleFiltros = document.getElementById("btnToggleFiltros");
const modalOverlay = document.getElementById("modalOverlay");
const btnFecharFicha = document.getElementById("btnFecharFicha");

// Cabeçalho "Classificar Tênis" clicável: leva o foco até o primeiro filtro
if (btnToggleFiltros && tipoCorridaSelect) {
  btnToggleFiltros.addEventListener("click", () => {
    tipoCorridaSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    tipoCorridaSelect.focus();
  });
}

// Clique em qualquer nome de tênis (lista de classificação ou caixa de nota) abre a ficha completa
if (notaDiv) {
  notaDiv.addEventListener("click", (e) => {
    const alvo = e.target.closest(".nome-clicavel");
    if (alvo && alvo.dataset.idx !== undefined) {
      abrirFichaTenis(Number(alvo.dataset.idx));
    }
  });
}

if (btnFecharFicha) btnFecharFicha.addEventListener("click", fecharFicha);
if (modalOverlay) {
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) fecharFicha();
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") fecharFicha();
});

// Colunas usadas na ficha detalhada de cada tênis
const CRITERIOS_FICHA = [
  { valor: "GCT", nota: "GCT NOTA", label: "GCT", icone: "fa-stopwatch", unidade: "ms" },
  { valor: "POWER", nota: "Power NOTA", label: "Power", icone: "fa-bolt", unidade: "W" },
  { valor: "IMPACTO", nota: "Impacto NOTA", label: "Impacto", icone: "fa-hand-fist", unidade: "" },
  { valor: "PRONAÇÃO", nota: "Pronacao NOTA", label: "Pronação", icone: "fa-shoe-prints", unidade: "" },
  { valor: "VEL. PRON.", nota: "Vel. Pronacao NOTA", label: "Vel. Pronação", icone: "fa-gauge-high", unidade: "" },
  { valor: "Xpro", nota: "Xpro NOTA", label: "Xpro", icone: "fa-arrows-left-right", unidade: "" },
  { valor: "VO2", nota: "VO2 NOTA", label: "VO₂", icone: "fa-lungs", unidade: "" },
  { valor: "MP - TO", nota: "MP - TO NOTA", label: "MP-TO", icone: "fa-shoe-prints", unidade: "" }
];

// Monta e abre a ficha completa de um tênis (a partir do índice em rawRows)
function abrirFichaTenis(idx) {
  const row = rawRows[idx];
  if (!row || !modalOverlay) return;

  const nota = safeNum(row["MÉDIA FINAL"] || row["Media Final"] || row["MEDIA FINAL"]);

  document.getElementById("fichaNome").textContent = getNomeTenis(row, idx);
  document.getElementById("fichaNota").textContent = `Nota ${nota || "-"}`;
  document.getElementById("fichaPreco").textContent = `R$${row["Preco"] || row["PRECO"] || "-"}`;
  document.getElementById("fichaPrecoIdeal").textContent = `R$${row["Preco IDEAL"] || row["PRECO IDEAL"] || "-"}`;
  document.getElementById("fichaCB").textContent = row["C x B"] || row["C X B"] || "-";
  document.getElementById("fichaPeso").textContent = row["PESO"] ? `${row["PESO"]} g` : "-";

  // Imagem do tênis (se a planilha tiver uma coluna com o link); senão, mostra o placeholder
  const fichaImagem = document.getElementById("fichaImagem");
  const fichaImagemPlaceholder = document.getElementById("fichaImagemPlaceholder");
  const urlImagem = getImagemTenis(row);
  if (urlImagem) {
    fichaImagem.src = urlImagem;
    fichaImagem.alt = getNomeTenis(row, idx);
    fichaImagem.style.display = "block";
    fichaImagemPlaceholder.style.display = "none";
    fichaImagem.onerror = () => {
      fichaImagem.style.display = "none";
      fichaImagemPlaceholder.style.display = "flex";
    };
  } else {
    fichaImagem.removeAttribute("src");
    fichaImagem.style.display = "none";
    fichaImagemPlaceholder.style.display = "flex";
  }

  const container = document.getElementById("fichaCriterios");
  container.innerHTML = "";
  CRITERIOS_FICHA.forEach(c => {
    const valorBruto = row[c.valor] !== undefined && row[c.valor] !== "" ? row[c.valor] : "-";
    const notaCriterio = row[c.nota] !== undefined && row[c.nota] !== "" ? safeNum(row[c.nota]) : null;

    const item = document.createElement("div");
    item.className = "ficha-criterio";
    item.innerHTML = `
      <div class="ficha-criterio-icone"><i class="fas ${c.icone}"></i></div>
      <div class="ficha-criterio-texto">
        <span class="ficha-criterio-label">${c.label}</span>
        <span class="ficha-criterio-valor">${valorBruto}${c.unidade ? " " + c.unidade : ""}${notaCriterio !== null ? ` · nota ${notaCriterio}` : ""}</span>
      </div>
    `;
    container.appendChild(item);
  });

  modalOverlay.classList.add("aberto");
  document.body.style.overflow = "hidden";
}

function fecharFicha() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove("aberto");
  document.body.style.overflow = "";
}

// Faixas de preço, na mesma ordem das <option> do select de Preço
const FAIXAS_PRECO = [
  null,                       // ---- (sem filtro)
  { max: 500 },                // Até R$500,00
  { max: 800 },                // Até R$800,00
  { max: 1000 },                // Até R$1000,00
  { max: 1200 },                // Até R$1200,00
  { min: 1200.01 }              // Acima de R$1200,00
];

// Função para converter número com vírgula
function safeNum(value) {
  if (!value) return 0;
  return Number(String(value).trim().replace(",", ".")) || 0;
}

function getNomeTenis(row, i) {
  return row["Tenis"] || row["TENIS"] || row["Tênis"] || `Item ${i + 1}`;
}

function getPrecoTenis(row) {
  return safeNum(row["Preco"] || row["PRECO"]);
}

// Procura uma coluna de imagem na planilha (aceita alguns nomes comuns).
// Se você adicionar essa coluna depois, a foto passa a aparecer sozinha.
function getImagemTenis(row) {
  const chaves = ["Imagem", "IMAGEM", "Foto", "FOTO", "Image", "IMAGE", "Imagem URL", "URL Imagem", "Link Imagem", "Foto URL"];
  for (const chave of chaves) {
    const valor = row[chave];
    if (valor && String(valor).trim().startsWith("http")) {
      return String(valor).trim();
    }
  }
  return null;
}

// Retorna os critérios (colunas do radar) marcados no momento
function getCriteriosSelecionados() {
  const marcados = Array.from(criteriosCheckboxes).filter(cb => cb.checked);
  const base = marcados.length > 0 ? marcados : Array.from(criteriosCheckboxes); // se nada marcado, usa todos
  return {
    columns: base.map(cb => cb.dataset.col),
    labels: base.map(cb => cb.dataset.label)
  };
}

// Retorna os índices (em rawRows) que passam no filtro de preço atual
function getIndicesFiltrados() {
  const faixa = FAIXAS_PRECO[precoSelect ? precoSelect.selectedIndex : 0];

  return rawRows.reduce((acc, row, i) => {
    if (!faixa) {
      acc.push(i);
      return acc;
    }
    const preco = getPrecoTenis(row);
    const passaMin = faixa.min === undefined || preco >= faixa.min;
    const passaMax = faixa.max === undefined || preco <= faixa.max;
    if (passaMin && passaMax) acc.push(i);
    return acc;
  }, []);
}

// Carrega os dados da planilha
async function loadData() {
  try {
    const res = await fetch(csvUrl);
    if (!res.ok) throw new Error("Erro ao carregar CSV");
    const txt = await res.text();
    const parsed = Papa.parse(txt, { header: true, skipEmptyLines: true });
    rawRows = parsed.data;
    preencherSelectsTenis(rawRows.map((_, i) => i));
    ligarEventos();
  } catch (err) {
    console.error(err);
    alert("Erro ao carregar os dados: " + err.message);
  }
}

// Preenche os selects de tênis com uma lista de índices (usado no load e após filtrar)
function preencherSelectsTenis(indices) {
  const valorAnterior1 = tenisSelect.value;
  const valorAnterior2 = tenis2Select.value;

  [tenisSelect, tenis2Select].forEach(select => {
    select.innerHTML = '<option value="">----</option>';
    indices.forEach(i => {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = getNomeTenis(rawRows[i], i);
      select.appendChild(option);
    });
  });

  // Mantém a seleção anterior se ela ainda estiver na lista filtrada; senão, limpa
  const indicesStr = indices.map(String);
  tenisSelect.value = indicesStr.includes(valorAnterior1) ? valorAnterior1 : "";
  tenis2Select.value = indicesStr.includes(valorAnterior2) ? valorAnterior2 : "";

  if (tenisSelect.value === "") {
    btnComparar.style.display = "none";
    tenis2Wrapper.style.display = "none";
  }
}

function ligarEventos() {
  tenisSelect.addEventListener("change", () => {
    if (tenisSelect.value !== "") {
      btnComparar.style.display = "flex"; // aparece o botão após selecionar o primeiro
    } else {
      btnComparar.style.display = "none";
      tenis2Wrapper.style.display = "none";
    }
  });

  btnComparar.addEventListener("click", () => {
    if (tenis2Wrapper.style.display === "none") {
      tenis2Wrapper.style.display = "flex";
      btnComparar.innerHTML = '<i class="fas fa-code-compare"></i> Remover comparação';
    } else {
      tenis2Wrapper.style.display = "none";
      tenis2Select.value = "";
      btnComparar.innerHTML = '<i class="fas fa-code-compare"></i> Comparar outro tênis';
    }
  });
}

// Paleta de cores para o modo "classificação" (vários tênis ao mesmo tempo)
const PALETA_CLASSIFICACAO = [
  "255, 83, 63",   // laranja/coral
  "46, 221, 194",  // turquesa
  "33, 29, 56",    // roxo/marinho
  "242, 193, 78",  // amarelo
  "142, 68, 173",  // roxo
  "52, 152, 219",  // azul
  "230, 126, 34",  // laranja escuro
  "22, 160, 133"   // verde-azulado
];
const MAX_TENIS_NO_GRAFICO = 8;

// Botão "Atualizar filtros": aplica Preço + Critérios juntos e (re)monta o gráfico
if (btnAtualizarFiltros) {
  btnAtualizarFiltros.addEventListener("click", () => {
    const indicesFiltrados = getIndicesFiltrados();
    preencherSelectsTenis(indicesFiltrados);

    // Se o usuário já escolheu um tênis específico, foca nele (modo comparação).
    // Senão, mostra todos os tênis que atendem aos filtros de uma vez (modo classificação).
    if (tenisSelect.value) {
      updateChart();
    } else {
      renderClassificacao(indicesFiltrados);
    }
  });
}

// Botão "Selecionar todos" dos critérios
if (btnSelecionarTodos) {
  btnSelecionarTodos.addEventListener("click", () => {
    const algumDesmarcado = Array.from(criteriosCheckboxes).some(cb => !cb.checked);
    criteriosCheckboxes.forEach(cb => (cb.checked = algumDesmarcado));
    btnSelecionarTodos.textContent = algumDesmarcado ? "Desmarcar todos" : "Selecionar todos";
  });
}

// Atalho "Escolher um tênis": leva o foco direto para o select de tênis
if (btnEscolherTenis) {
  btnEscolherTenis.addEventListener("click", () => {
    tenisSelect.scrollIntoView({ behavior: "smooth", block: "center" });
    tenisSelect.focus();
  });
}

// Botão "Limpar filtros": volta o painel ao estado inicial
if (btnLimparFiltros) {
  btnLimparFiltros.addEventListener("click", () => {
    if (tipoCorridaSelect) tipoCorridaSelect.selectedIndex = 0;
    if (precoSelect) precoSelect.selectedIndex = 0;

    criteriosCheckboxes.forEach(cb => (cb.checked = false));
    if (btnSelecionarTodos) btnSelecionarTodos.textContent = "Selecionar todos";

    preencherSelectsTenis(rawRows.map((_, i) => i));

    tenisSelect.value = "";
    tenis2Select.value = "";
    tenis2Wrapper.style.display = "none";
    btnComparar.style.display = "none";
    btnComparar.innerHTML = '<i class="fas fa-code-compare"></i> Comparar outro tênis';

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    notaDiv.innerHTML = "";
  });
}

// Mostra, de uma vez, todos os tênis que atendem aos filtros atuais (Preço + Critérios)
function renderClassificacao(indices) {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  if (!indices || indices.length === 0) {
    notaDiv.innerHTML = '<p class="sem-resultado">Nenhum tênis encontrado com esses filtros.</p>';
    return;
  }

  const { columns: radarColumns, labels: radarLabels } = getCriteriosSelecionados();
  const exibidos = indices.slice(0, MAX_TENIS_NO_GRAFICO);
  const mostrarPreenchido = exibidos.length <= 2;

  const datasets = exibidos.map((idx, i) => {
    const row = rawRows[idx];
    const cor = PALETA_CLASSIFICACAO[i % PALETA_CLASSIFICACAO.length];
    return {
      label: getNomeTenis(row, idx),
      data: radarColumns.map(c => safeNum(row[c])),
      fill: mostrarPreenchido,
      borderWidth: 2,
      pointRadius: 3,
      backgroundColor: `rgba(${cor}, ${mostrarPreenchido ? 0.2 : 0})`,
      borderColor: `rgba(${cor}, 1)`,
      pointBackgroundColor: `rgba(${cor}, 1)`
    };
  });

  const ctx = document.getElementById("radarChart");
  chartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: radarLabels,
      datasets
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 1,
            font: { family: "'League Spartan', sans-serif", weight: "400", size: 11 }
          },
          pointLabels: {
            font: { family: "'League Spartan', sans-serif", weight: "600", size: 12 }
          }
        }
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: { family: "'League Spartan', sans-serif", weight: "800", size: 12 },
            boxWidth: 12
          }
        }
      }
    }
  });

  atualizarInfoBoxClassificacao(indices, exibidos.length, PALETA_CLASSIFICACAO);
}

// Monta a lista com todos os tênis que bateram com os filtros
function atualizarInfoBoxClassificacao(indices, qtdExibida, paleta) {
  notaDiv.innerHTML = "";

  const titulo = document.createElement("p");
  titulo.className = "classificacao-titulo";
  titulo.textContent = indices.length > qtdExibida
    ? `${indices.length} tênis encontrados (mostrando ${qtdExibida} no gráfico)`
    : `${indices.length} tênis encontrados`;
  notaDiv.appendChild(titulo);

  const lista = document.createElement("div");
  lista.className = "classificacao-lista";

  indices.forEach((idx, i) => {
    const row = rawRows[idx];
    const item = document.createElement("div");
    item.className = "classificacao-item";
    const corBolinha = i < qtdExibida ? `rgba(${paleta[i % paleta.length]}, 1)` : "transparent";
    const preco = row["Preco"] || row["PRECO"] || "-";
    const nota = safeNum(row["MÉDIA FINAL"] || row["Media Final"] || row["MEDIA FINAL"]);
    item.innerHTML = `
      <span class="classificacao-dot" style="background:${corBolinha}"></span>
      <div class="classificacao-texto">
        <button type="button" class="classificacao-nome nome-clicavel" data-idx="${idx}">${getNomeTenis(row, idx)}</button>
        <span class="classificacao-info">Nota ${nota || "-"} · R$${preco}</span>
      </div>
    `;
    lista.appendChild(item);
  });

  notaDiv.appendChild(lista);
}

// Atualiza o gráfico e a caixa de informações
function updateChart() {
  if (!tenisSelect.value) {
    notaDiv.innerHTML = "";
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  const { columns: radarColumns, labels: radarLabels } = getCriteriosSelecionados();

  const idx1 = Number(tenisSelect.value);
  const idx2 = tenis2Wrapper.style.display === "flex" && tenis2Select.value !== "" ? Number(tenis2Select.value) : null;

  const row1 = rawRows[idx1];
  const label1 = getNomeTenis(row1, idx1);
  const data1 = radarColumns.map(c => safeNum(row1[c]));
  const avg1 = safeNum(row1["MÉDIA FINAL"] || row1["Media Final"] || row1["MEDIA FINAL"]);
  const preco1 = row1["Preco"] || row1["PRECO"] || "-";
  const ideal1 = row1["Preco IDEAL"] || row1["PRECO IDEAL"] || "-";
  const cb1 = row1["C x B"] || row1["C X B"] || "-";

  // Cores da paleta oficial: turquesa (#2EDDC2) e laranja (#FF533F)
  let datasets = [{
    label: label1,
    data: data1,
    fill: true,
    borderWidth: 2,
    pointRadius: 4,
    backgroundColor: "rgba(255, 83, 63, 0.25)",
    borderColor: "rgba(255, 83, 63, 1)",
    pointBackgroundColor: "rgba(255, 83, 63, 1)"
  }];

  // Se houver segundo tênis selecionado
  let tenis2Data = null;
  if (idx2 !== null && !Number.isNaN(idx2)) {
    const row2 = rawRows[idx2];
    const label2 = getNomeTenis(row2, idx2);
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
      backgroundColor: "rgba(46, 221, 194, 0.25)",
      borderColor: "rgba(46, 221, 194, 1)",
      pointBackgroundColor: "rgba(46, 221, 194, 1)"
    });
  }

  // Atualiza caixa de informações
  atualizarInfoBox({
    idx: idx1,
    nome: label1,
    nota: avg1,
    preco: preco1,
    precoIdeal: ideal1,
    custoBeneficio: cb1
  }, tenis2Data ? {
    idx: idx2,
    nome: tenis2Data.label2,
    nota: tenis2Data.avg2,
    preco: tenis2Data.preco2,
    precoIdeal: tenis2Data.ideal2,
    custoBeneficio: tenis2Data.cb2
  } : null);

  // O número de eixos pode mudar conforme os critérios marcados,
  // então o gráfico é sempre destruído e recriado do zero.
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const ctx = document.getElementById("radarChart");
  chartInstance = new Chart(ctx, {
    type: "radar",
    data: {
      labels: radarLabels,
      datasets
    },
    options: {
      responsive: true,
      scales: {
        r: {
          min: 0,
          max: 10,
          ticks: {
            stepSize: 1,
            font: { family: "'League Spartan', sans-serif", weight: "400", size: 11 }
          },
          pointLabels: {
            font: { family: "'League Spartan', sans-serif", weight: "600", size: 12 }
          }
        }
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: { family: "'League Spartan', sans-serif", weight: "800", size: 13 }
          }
        }
      }
    }
  });
}

// Monta visualmente as informações de cada tênis
function atualizarInfoBox(tenis1, tenis2) {
  notaDiv.innerHTML = "";

  [tenis1, tenis2].forEach(t => {
    if (!t) return;

    const bloco = document.createElement("div");
    bloco.classList.add("tenisInfo");
    bloco.innerHTML = `
      <button type="button" class="tenisNome nome-clicavel" data-idx="${t.idx}">${t.nome}</button>
      <div>Nota: ${t.nota || "-"}</div>
      <div>Preço: R$${t.preco}</div>
      <div>Preço Ideal: R$${t.precoIdeal}</div>
      <div>Custo-benefício: ${t.custoBeneficio}</div>
    `;
    notaDiv.appendChild(bloco);
  });
}

loadData();