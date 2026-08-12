const STORAGE_KEY = "pizzaria_motoboy_v1";

const DEFAULT_DATA = {
  motoboys: ["Joao vitor", "Guga", "Gustavo", "Harley", "Matheus Grande", "Matheus Pequeno", "Jefferson", "Douglas", "Luan"],
  bairros: {
    "Bancários": 10,
    "Manaíra": 10,
    "Tambaú": 12,
    "Cabo Branco": 12,
    "Mangabeira": 15,
    "Valentina": 15,
    "Cristo": 12,
    "Geisel": 15
  },
  dispatches: []
};

let data = loadData();

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) return {
      motoboys: Array.isArray(saved.motoboys) ? saved.motoboys : DEFAULT_DATA.motoboys,
      bairros: saved.bairros || DEFAULT_DATA.bairros,
      dispatches: Array.isArray(saved.dispatches) ? saved.dispatches : []
    };
  } catch {}
  return structuredClone(DEFAULT_DATA);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function pad(n) { return String(n).padStart(2, "0"); }

function shiftDateKey(date = new Date()) {
  const d = new Date(date);
  // Turno começa às 15:00 e termina às 02:00 do dia seguinte.
  if (d.getHours() < 2) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function isShiftOpen() {
  const h = new Date().getHours();
  return h >= 15 || h < 2;
}

function formatDate(key) {
  const [y,m,d] = key.split("-");
  return `${d}/${m}/${y}`;
}

function renderHeader() {
  const key = shiftDateKey();
  document.getElementById("currentDate").textContent = formatDate(key);
  const badge = document.getElementById("shiftStatus");
  badge.textContent = isShiftOpen() ? "● Turno aberto" : "● Fora do turno";
  badge.className = `badge ${isShiftOpen() ? "active" : "closed"}`;
}

function routeRowHtml(selected = "", qty = 1) {
  const options = Object.entries(data.bairros)
    .map(([name, price]) => `<option value="${escapeHtml(name)}" ${name === selected ? "selected" : ""}>${escapeHtml(name)} — ${money(price)}</option>`)
    .join("");

  return `
    <div class="route-row">
      <select class="neighborhood-select">${options}</select>
      <input class="qty-input" type="number" min="1" step="1" value="${qty}">
      <button type="button" class="remove-route" title="Remover">✕</button>
    </div>
  `;
}

function renderMotoboySelect(selectId = "motoboySelect", selected = "") {
  const select = document.getElementById(selectId);
  select.innerHTML = data.motoboys.length
    ? data.motoboys.map(n => `<option value="${escapeHtml(n)}" ${n === selected ? "selected" : ""}>${escapeHtml(n)}</option>`).join("")
    : `<option value="">Cadastre um motoboy</option>`;
}

function addRouteRow(selected = "", qty = 1, rowsId = "routeRows", totalId = "routeTotal") {
  const rows = document.getElementById(rowsId);
  rows.insertAdjacentHTML("beforeend", routeRowHtml(selected, qty));
  rows.lastElementChild.querySelector(".remove-route").addEventListener("click", e => {
    const row = e.currentTarget.closest(".route-row");
    if (rows.querySelectorAll(".route-row").length > 1) row.remove();
    else toast("A despachada precisa ter pelo menos um bairro.");
    calculateRouteTotal(rowsId, totalId);
  });
  rows.lastElementChild.querySelector(".neighborhood-select").addEventListener("change", () => calculateRouteTotal(rowsId, totalId));
  rows.lastElementChild.querySelector(".qty-input").addEventListener("input", () => calculateRouteTotal(rowsId, totalId));
  calculateRouteTotal(rowsId, totalId);
}

function calculateRouteTotal(rowsId = "routeRows", totalId = "routeTotal") {
  let total = 0;
  document.getElementById(rowsId).querySelectorAll(".route-row").forEach(row => {
    const neighborhood = row.querySelector(".neighborhood-select").value;
    const qty = Math.max(0, parseInt(row.querySelector(".qty-input").value || "0", 10));
    total += (Number(data.bairros[neighborhood]) || 0) * qty;
  });
  document.getElementById(totalId).textContent = money(total);
  return total;
}

function setupPaymentToggle(groupId) {
  const group = document.getElementById(groupId);
  group.querySelectorAll(".payment-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const alreadyActive = btn.classList.contains("active");
      group.querySelectorAll(".payment-btn").forEach(b => b.classList.remove("active"));
      if (!alreadyActive) btn.classList.add("active");
    });
  });
}

function getPaymentValue(groupId) {
  const active = document.querySelector(`#${groupId} .payment-btn.active`);
  return active ? active.dataset.value : "";
}

function setPaymentValue(groupId, value) {
  document.querySelectorAll(`#${groupId} .payment-btn`).forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

function paymentLabel(value) {
  if (value === "maquineta") return "💳 Maquineta";
  if (value === "dinheiro") return "💵 Troco/Dinheiro";
  return "";
}

function renderStats() {
  const current = shiftDateKey();
  const dispatches = data.dispatches.filter(d => d.shiftDate === current);
  const confirmed = dispatches.filter(d => d.status === "confirmed");
  const total = confirmed.reduce((sum, d) => sum + Number(d.total || 0), 0);

  document.getElementById("statDispatched").textContent = dispatches.length;
  document.getElementById("statPending").textContent = dispatches.filter(d => d.status === "pending").length;
  document.getElementById("statConfirmed").textContent = confirmed.length;
  document.getElementById("statTotal").textContent = money(total);
}

function renderRiders() {
  const current = shiftDateKey();
  const dispatches = data.dispatches.filter(d => d.shiftDate === current);
  const totals = data.motoboys.map(name => {
    const mine = dispatches.filter(d => d.motoboy === name && d.status === "confirmed");
    return {
      name,
      total: mine.reduce((sum, d) => sum + Number(d.total || 0), 0),
      trips: mine.length
    };
  });
  const max = Math.max(...totals.map(x => x.total), 1);

  const board = document.getElementById("ridersBoard");
  board.innerHTML = totals.length ? totals.map(r => `
    <div class="rider-card">
      <div class="rider-top">
        <span class="rider-name">🏍️ ${escapeHtml(r.name)}</span>
        <span class="rider-value">${money(r.total)}</span>
      </div>
      <div class="progress"><div class="progress-bar" style="width:${Math.round((r.total / max) * 100)}%"></div></div>
      <div class="rider-meta">${r.trips} rota(s) confirmada(s)</div>
    </div>
  `).join("") : `<div class="empty">Nenhum motoboy cadastrado.</div>`;
}

function renderDispatches() {
  const current = shiftDateKey();
  const dispatches = data.dispatches
    .filter(d => d.shiftDate === current)
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const list = document.getElementById("dispatchList");
  if (!dispatches.length) {
    list.innerHTML = `<div class="empty">Nenhuma despachada registrada neste turno.</div>`;
    return;
  }

  list.innerHTML = dispatches.map(d => {
    const routes = d.routes.map(r => `${escapeHtml(r.neighborhood)} (${r.qty})`).join(" · ");
    const confirmed = d.status === "confirmed";
    return `
      <article class="dispatch-card ${confirmed ? "confirmed" : ""}">
        <div class="dispatch-top">
          <div>
            <div class="dispatch-title">🏍️ ${escapeHtml(d.motoboy)}</div>
            <div class="route-text">${routes}</div>
          </div>
          <div class="dispatch-actions">
            <span class="status ${confirmed ? "confirmed" : "pending"}">
              ${confirmed ? "✓ RETORNO CONFIRMADO" : "⏳ AGUARDANDO RETORNO"}
            </span>
            <button type="button" class="icon-btn edit-dispatch-btn" title="Editar despachada" data-id="${escapeHtml(d.id)}">✏️</button>
          </div>
        </div>
        ${d.payment ? `<div class="payment-tag">${paymentLabel(d.payment)}</div>` : ""}
        ${d.observation ? `<div class="observation">📝 ${escapeHtml(d.observation)}</div>` : ""}
        <div class="dispatch-bottom">
          <div>
            <div class="dispatch-value">${money(d.total)}</div>
            <small>Saída: ${escapeHtml(d.time)}</small>
          </div>
          ${confirmed
            ? `<small>Retorno: ${escapeHtml(d.returnTime || "--:--")}</small>`
            : `<button class="btn btn-primary confirm-btn" data-id="${escapeHtml(d.id)}">✓ Confirmar retorno</button>`}
        </div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".confirm-btn").forEach(btn => {
    btn.addEventListener("click", () => confirmDispatch(btn.dataset.id));
  });
  document.querySelectorAll(".edit-dispatch-btn").forEach(btn => {
    btn.addEventListener("click", () => openEditDispatch(btn.dataset.id));
  });
}

function renderAll() {
  renderHeader();
  renderMotoboySelect();
  renderStats();
  renderRiders();
  renderDispatches();
  renderSettings();
}

function confirmDispatch(id) {
  const dispatch = data.dispatches.find(d => d.id === id);
  if (!dispatch || dispatch.status === "confirmed") return;
  dispatch.status = "confirmed";
  dispatch.returnTime = new Date().toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"});
  saveData();
  renderAll();
  toast(`${dispatch.motoboy} confirmado! ${money(dispatch.total)} entrou no total.`);
}

function openEditDispatch(id) {
  const dispatch = data.dispatches.find(d => d.id === id);
  if (!dispatch) return;

  document.getElementById("editDispatchId").value = dispatch.id;
  renderMotoboySelect("editMotoboySelect", dispatch.motoboy);

  document.getElementById("editRouteRows").innerHTML = "";
  dispatch.routes.forEach(r => addRouteRow(r.neighborhood, r.qty, "editRouteRows", "editRouteTotal"));

  setPaymentValue("editPaymentGroup", dispatch.payment || "");
  document.getElementById("editObservation").value = dispatch.observation || "";
  calculateRouteTotal("editRouteRows", "editRouteTotal");

  document.getElementById("editDispatchModal").classList.remove("hidden");
}

document.getElementById("closeEditDispatch").addEventListener("click", () => {
  document.getElementById("editDispatchModal").classList.add("hidden");
});

document.getElementById("editAddRouteBtn").addEventListener("click", () => addRouteRow("", 1, "editRouteRows", "editRouteTotal"));

document.getElementById("editDispatchForm").addEventListener("submit", e => {
  e.preventDefault();

  const id = document.getElementById("editDispatchId").value;
  const dispatch = data.dispatches.find(d => d.id === id);
  if (!dispatch) return;

  const routes = [...document.querySelectorAll("#editRouteRows .route-row")].map(row => ({
    neighborhood: row.querySelector(".neighborhood-select").value,
    qty: Math.max(1, parseInt(row.querySelector(".qty-input").value || "1", 10))
  })).filter(r => r.neighborhood);

  if (!routes.length) {
    toast("Adicione pelo menos um bairro.");
    return;
  }

  const total = routes.reduce((sum, r) => sum + (Number(data.bairros[r.neighborhood]) || 0) * r.qty, 0);

  dispatch.motoboy = document.getElementById("editMotoboySelect").value;
  dispatch.routes = routes;
  dispatch.observation = document.getElementById("editObservation").value.trim();
  dispatch.payment = getPaymentValue("editPaymentGroup");
  dispatch.total = total;

  saveData();
  document.getElementById("editDispatchModal").classList.add("hidden");
  renderAll();
  toast("Despachada atualizada.");
});

document.getElementById("dispatchForm").addEventListener("submit", e => {
  e.preventDefault();

  if (!isShiftOpen()) {
    toast("Fora do horário do turno (15:00 às 02:00).");
    return;
  }
  if (!data.motoboys.length) {
    toast("Cadastre pelo menos um motoboy.");
    return;
  }

  const routes = [...document.querySelectorAll(".route-row")].map(row => ({
    neighborhood: row.querySelector(".neighborhood-select").value,
    qty: Math.max(1, parseInt(row.querySelector(".qty-input").value || "1", 10))
  })).filter(r => r.neighborhood);

  if (!routes.length) {
    toast("Adicione pelo menos um bairro.");
    return;
  }

  const total = routes.reduce((sum, r) => sum + (Number(data.bairros[r.neighborhood]) || 0) * r.qty, 0);
  const now = new Date();

  data.dispatches.push({
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    shiftDate: shiftDateKey(now),
    motoboy: document.getElementById("motoboySelect").value,
    routes,
    observation: document.getElementById("observation").value.trim(),
    payment: getPaymentValue("paymentGroup"),
    total,
    status: "pending",
    time: now.toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}),
    createdAt: now.toISOString()
  });

  saveData();
  e.target.reset();
  document.getElementById("routeRows").innerHTML = "";
  addRouteRow();
  setPaymentValue("paymentGroup", "");
  renderAll();
  toast("Despachada registrada e marcada como aguardando retorno.");
});

document.getElementById("addRouteBtn").addEventListener("click", () => addRouteRow());
setupPaymentToggle("paymentGroup");
setupPaymentToggle("editPaymentGroup");

document.getElementById("settingsBtn").addEventListener("click", () => {
  document.getElementById("settingsModal").classList.remove("hidden");
  renderSettings();
});
document.getElementById("closeSettings").addEventListener("click", () => {
  document.getElementById("settingsModal").classList.add("hidden");
});

document.getElementById("addRiderBtn").addEventListener("click", () => {
  const input = document.getElementById("newRider");
  const name = input.value.trim();
  if (!name) return;
  if (data.motoboys.some(n => n.toLowerCase() === name.toLowerCase())) {
    toast("Esse motoboy já existe.");
    return;
  }
  data.motoboys.push(name);
  input.value = "";
  saveData();
  renderAll();
  toast("Motoboy adicionado.");
});

document.getElementById("addNeighborhoodBtn").addEventListener("click", () => {
  const nameInput = document.getElementById("newNeighborhood");
  const priceInput = document.getElementById("newNeighborhoodPrice");
  const name = nameInput.value.trim();
  const price = Number(priceInput.value);

  if (!name || !Number.isFinite(price) || price < 0) {
    toast("Informe bairro e valor válido.");
    return;
  }
  data.bairros[name] = price;
  nameInput.value = "";
  priceInput.value = "";
  saveData();
  renderAll();
  toast("Bairro adicionado.");
});

function renderSettings() {
  const riders = document.getElementById("riderSettings");
  riders.innerHTML = data.motoboys.map((name, i) => `
    <div class="setting-rider-row">
      <input class="rider-edit" data-index="${i}" value="${escapeHtml(name)}">
      <button class="btn btn-danger delete-rider" data-index="${i}">Excluir</button>
    </div>
  `).join("");

  document.querySelectorAll(".rider-edit").forEach(input => {
    input.addEventListener("change", e => {
      const i = Number(e.target.dataset.index);
      const old = data.motoboys[i];
      const value = e.target.value.trim();
      if (!value) { e.target.value = old; return; }
      data.motoboys[i] = value;
      data.dispatches.forEach(d => { if (d.motoboy === old) d.motoboy = value; });
      saveData();
      renderAll();
    });
  });

  document.querySelectorAll(".delete-rider").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = Number(btn.dataset.index);
      if (confirm(`Excluir ${data.motoboys[i]}?`)) {
        data.motoboys.splice(i, 1);
        saveData();
        renderAll();
      }
    });
  });

  const neighborhoods = document.getElementById("neighborhoodSettings");
  neighborhoods.innerHTML = Object.entries(data.bairros).map(([name, price]) => `
    <div class="setting-row">
      <input class="neighborhood-name" data-old="${escapeHtml(name)}" value="${escapeHtml(name)}">
      <input class="neighborhood-price" data-old="${escapeHtml(name)}" type="number" min="0" step="0.01" value="${Number(price).toFixed(2)}">
      <button class="btn btn-danger delete-neighborhood" data-name="${escapeHtml(name)}">Excluir</button>
    </div>
  `).join("");

  document.querySelectorAll(".neighborhood-name").forEach(input => {
    input.addEventListener("change", () => {
      const old = input.dataset.old;
      const value = input.value.trim();
      if (!value || value === old || data.bairros[value] !== undefined) {
        input.value = old;
        return;
      }
      const price = data.bairros[old];
      delete data.bairros[old];
      data.bairros[value] = price;
      data.dispatches.forEach(d => d.routes.forEach(r => { if (r.neighborhood === old) r.neighborhood = value; }));
      saveData();
      renderAll();
    });
  });

  document.querySelectorAll(".neighborhood-price").forEach(input => {
    input.addEventListener("change", () => {
      const name = input.dataset.old;
      const value = Number(input.value);
      if (Number.isFinite(value) && value >= 0) {
        data.bairros[name] = value;
        saveData();
        renderAll();
      }
    });
  });

  document.querySelectorAll(".delete-neighborhood").forEach(btn => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      if (confirm(`Excluir o bairro ${name}?`)) {
        delete data.bairros[name];
        saveData();
        renderAll();
      }
    });
  });
}

document.getElementById("clearDayBtn").addEventListener("click", () => {
  const current = shiftDateKey();
  const currentDispatches = data.dispatches.filter(d => d.shiftDate === current);

  if (!currentDispatches.length) {
    toast("Não há registros para encerrar neste turno.");
    return;
  }

  const pending = currentDispatches.filter(d => d.status === "pending").length;
  const message = pending
    ? `Existem ${pending} despachada(s) aguardando retorno. Deseja realmente encerrar e apagar os registros deste turno?`
    : "Deseja realmente encerrar e apagar todos os registros deste turno?";

  if (!confirm(message)) return;

  data.dispatches = data.dispatches.filter(d => d.shiftDate !== current);
  saveData();
  renderAll();
  toast("Turno limpo. O cadastro de motoboys e bairros foi mantido.");
});

function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

// Inicialização
addRouteRow();
renderAll();

// Atualiza o relógio/status sem precisar recarregar a página.
setInterval(renderHeader, 30000);
