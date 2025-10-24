var token = "";

let currentPedido;
let totalPedidos = 0;
let orders = [
  //{ id: 'PED001', customer: 'João', items: [{ name: 'X', qty: 1 }, { name: 'Y', qty: 1 }], obsgeral: "", obs: [{ name: 'Sem cebola', value: 'Sim' }, { name: 'Guardanapo', value: 'Não' }], status: 'Pago' }
];
let employees = [
  { usuario: 'joao', nome: 'João Silva', numero: 123, cargo: 'Vendedor' }
];
let products = [
  /*{ id: 1, name: 'Hot Dog', img: 'https://via.placeholder.com/600x400?text=Hot+Dog', qty: 10 },
  { id: 2, name: 'Combo Família', img: 'https://via.placeholder.com/600x400?text=Combo', qty: 5 }*/
];

async function loadPedidos() {

  orders = [];
  totalPedidos = 0;

  const res = await fetch("/get-pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  })

  const data = await res.json();

  if (data.status == "success") {
    for (const [_ , p] of Object.entries(data.pedidos)) {
      totalPedidos += 1;
      var newItemList = [];
      var newObservations = [];
      var obsList
      
      for (const [index, item] of Object.entries(p.pedido)) {
        const num = parseInt(index) + 1;
        obsList = JSON.parse(item.obs);

        for (const [key, value] of Object.entries(obsList)) {

          if (!newObservations[item.nome+" "+num]) {
            newObservations[item.nome+" "+num] = [];
          }

          if (key !== "observacoes_gerais") {
            newObservations[item.nome+" "+num].push({
              name: key,
              value: value == true ? "Sim" : "Não",
            });
          };
        };

        newItemList.push({
          name: item.nome,
          qty: 1,
        })
      }

      orders.push({
        id: p.id,
        customer: p.nome_cliente,
        email: p.email_cliente,
        items: newItemList,
        status: p.status,
        obsgeral: obsList.observacoes_gerais,
        obs: newObservations
      });
    };
  } else {
    await Swal.fire({
      title: data.message,
      icon: "error",
      draggable: true
    });
  };

  renderOrders();
};

async function loadEmployees() {

  employees = [];

  const res = await fetch("/get-funcionarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  })

  const data = await res.json();

  if (data.status == "success") {
    data.funcionarios.forEach(f => {
      employees.push({
        usuario: f.nome,
        nome: f.nome,
        numero: f.numero,
        cargo: f.cargo
      });
    });
    renderEmployees();
  } else  {
    await Swal.fire({
      title: data.message,
      icon: "error",
      draggable: true
    });
  }
}

const q = sel => document.querySelector(sel);
const qa = sel => Array.from(document.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", () => {
  token = localStorage.getItem("token");

  if (!token) {
    window.location.href = "/";
    return;
  }

  fetch("/check-token", {
    method: "GET",
    headers: { "x-access-token": token }
  })
    .then(r => r.json())
    .then(data => {
      if (data.status == "success") {
        document.body.style.display = "block";
        document.documentElement.style.display = "block";
        setupTabs();
        bindControls();
        renderAll();
      } else {
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    })
    .catch(e => {
      window.location.href = "/";
    });
});

// ---------- TABS ----------
function setupTabs() {
  qa('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      qa('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      qa('.panel').forEach(p => {
        if (p.id === target) {
          p.classList.add('show');
          p.removeAttribute('aria-hidden');
        } else {
          p.classList.remove('show');
          p.setAttribute('aria-hidden', 'true');
        }
      });
    });
  });
}

// ---------- Bind botões e ações ----------
function bindControls() {
  q('#logoutBtn').addEventListener('click', () => {
    const token = localStorage.getItem("token");

    if (token) {
      localStorage.removeItem("token");
      window.location.href = "/";
    };
  });

  q('#btnAddEmployee').addEventListener('click', () => openModalById('modalEmployee'));
  q('#saveEmployeeBtn').addEventListener('click', saveEmployee);
  qa('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModalById(btn.dataset.close));
  });
  qa('.modal-close').forEach(b => b.addEventListener('click', closeAllModals));
  q('#saveProductBtn')?.addEventListener('click', saveProduct);
  q('#btnAddProduct')?.addEventListener('click', () => openModalById('modalProduct'));
  q('blockBtn')?.addEventListener('click', async () => {
    const res = await fetch("/block-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })

    const data = await res.json();

    if (data.message) {
      await Swal.fire({
        title: data.message,
        icon: "error",
        draggable: true
      });
    };
  });
  q('#refreshBtn')?.addEventListener('click', () => {
    renderAll();
  });
  q('#refreshBtn2')?.addEventListener('click', () => {
    renderAll();
  });

  // modal pedido actions
  q('#modalClose').addEventListener('click', closeAllModals);
  q('#markDeliveredBtn').addEventListener('click', async () => {
    const currentId = q('#modalOverlay').dataset.currentOrder;
    if (!currentId) return;
    const ord = orders.find(o => o.id == currentId);
    if (ord && ord.status == 'Aprovado') {
      ord.status = 'Entregue';
      updateMetrics();
      closeAllModals();

      const res = await fetch("/set-delivered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: ord.id })
      })

      const free = await fetch("/free-pedido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, id: currentPedido })
      })

      currentPedido = null;

      await loadPedidos();
      await Swal.fire({
        title: "Pedido marcado como entregue!",
        icon: "success",
        draggable: true
      });
    }
  });

  // search
  q('#employeeSearch')?.addEventListener('input', (e) => {
    renderEmployees(e.target.value.trim().toLowerCase());
  });
  q('#productSearch')?.addEventListener('input', (e) => {
    renderStock(e.target.value.trim().toLowerCase());
  });
  q('#pedidoseSearch')?.addEventListener('input', (e) => {
    renderOrders(e.target.value.trim().toLowerCase());
  });
}

// ---------- Renderers ----------
function renderAll() {
  loadPedidos();
  renderOrders();
  loadEmployees();
  renderStock();
  updateMetrics();
}

async function renderOrders(filter = '') {

  const container = q('#ordersContainer');

  container.innerHTML = '';
  if (orders.length === 0) {
    container.innerHTML = '<div class="muted">Nenhum pedido importado</div>';
    return;
  }

  orders.forEach(o => {
    const id = ""+o.id+""
    const customer = ""+o.customer+""
    const email = ""+o.email+""
    if (filter == ''){
      if (o.status == "Aprovado"){
        const el = document.createElement('div');
        el.className = 'order-card';
        el.dataset.id = o.id;

        var status

        if (o.status == "Aprovado") {
          status = "Pendente"
        } else if(o.status == "Aguardando Pagamento"){
          status = "Pagando"
        } else if(o.status == "Entregue"){
          status = "Entregue"
        }

        el.innerHTML = `
            <div class="order-meta">
              <strong>${o.customer || 'Sem nome'}</strong>
              <div class="muted">Pedido: ${o.id} • Itens: ${o.items?.length || 0}</div>
            </div>
            <div>
              <span class="badge ${status}">${status}</span>
            </div>
          `;
        el.addEventListener('click', () => openOrderModal(o.id));
        container.appendChild(el);
      };
    } else if(id.includes(filter) || customer.includes(filter) || email.includes(filter)) {
      const el = document.createElement('div');
      el.className = 'order-card';
      el.dataset.id = o.id;

      var status

      if (o.status == "Aprovado") {
        status = "Pendente"
      } else if (o.status == "Aguardando Pagamento") {
        status = "Pagando"
      } else if (o.status == "Entregue") {
        status = "Entregue"
      }

      el.innerHTML = `
            <div class="order-meta">
              <strong>${o.customer || 'Sem nome'}</strong>
              <div class="muted">Pedido: ${o.id} • Itens: ${o.items?.length || 0}</div>
            </div>
            <div>
              <span class="badge ${status}">${status}</span>
            </div>
          `;
      el.addEventListener('click', () => openOrderModal(o.id));
      container.appendChild(el);
    };
  });
};

function renderEmployees(filter = '') {
  const c = q('#employeesContainer');
  c.innerHTML = '';
  const list = employees.filter(emp => {
    if (!filter) return true;
    return emp.nome.toLowerCase().includes(filter) || String(emp.numero).includes(filter) || emp.usuario.toLowerCase().includes(filter);
  });
  if (list.length === 0) {
    c.innerHTML = '<div class="muted">Nenhum funcionário</div>';
    return;
  }
  list.forEach(emp => {
    const el = document.createElement('div');
    el.className = 'order-card';
    el.innerHTML = `
        <div>
          <strong>${emp.nome}</strong>
          <div class="muted">Usuário: ${emp.usuario} • Nº: ${emp.numero} • Cargo: ${emp.cargo}</div>
        </div>
      `;

      /*
        const { usuario } = req.body;

        if (userList[usuario]){
            delete tokensList[userList[usuario].token];
            delete userList[usuario];
            return res.json({ status: "success", message: "Funcionário demitido com sucesso." })
        } else{
            return res.json({ status: "fail", message: "Funcionário não encontrado." })
        };
      el.querySelector('[data-action="remove"]').addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (confirm('Demitir funcionário?')) {
        employees = employees.filter(e => e.usuario !== emp.usuario);
        loadEmployees();
        updateMetrics();
      }
    });*/
    c.appendChild(el);
  });
}

function renderStock(filter = '') {
  const c = q('#stockContainer');
  c.innerHTML = '';
  const list = products.filter(p => {
    if (!filter) return true;
    return p.name.toLowerCase().includes(filter);
  });
  if (list.length === 0) {
    c.innerHTML = '<div class="muted">Nenhum produto</div>';
    return;
  }
  list.forEach(p => {
    const el = document.createElement('div');
    el.className = 'product';
    el.innerHTML = `
        <img src="${p.img || 'https://via.placeholder.com/600x400?text=Produto'}" alt="${escapeHtml(p.name)}" />
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${escapeHtml(p.name)}</strong>
          <div class="qty-row">
            <button class="btn ghost small" data-action="dec" data-id="${p.id}">-</button>
            <input class="input" data-id="${p.id}" type="number" value="${p.qty}" min="0" style="width:80px;text-align:center" />
            <button class="btn small" data-action="inc" data-id="${p.id}">+</button>
          </div>
        </div>
      `;
    // bind inc/dec
    el.querySelector('[data-action="inc"]').addEventListener('click', () => {
      p.qty = (p.qty || 0) + 1;
      renderStock();
    });
    el.querySelector('[data-action="dec"]').addEventListener('click', () => {
      p.qty = Math.max(0, (p.qty || 0) - 1);
      renderStock();
    });
    // bind input change
    el.querySelector('input[type="number"]').addEventListener('change', (ev) => {
      const v = parseInt(ev.target.value) || 0;
      p.qty = v;
      renderStock();
    });

    c.appendChild(el);
  });
}

// ---------- Modal: Pedido ----------
async function openOrderModal(id) {
  const order = orders.find(o => o.id === id);
  if (!order) return alert('Pedido não encontrado');

  const res = await fetch("/order-status", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, id: order.id })
  })

  const data = await res.json();

  if (data.status == "success") {

    currentPedido = order.id;

    q('#modalOverlay').dataset.currentOrder = id;
    q('#modalTitle').textContent = `Pedido ${order.id} — ${order.customer || ''}`;
    // montar body
    const body = document.createElement('div');
    // detalhes
    const itemsHtml = (order.items || []).map(it => `<li>${escapeHtml(it.name)} — Qtd: ${it.qty}</li>`).join('');
    body.innerHTML = `
      <div><strong>Cliente:</strong> ${escapeHtml(order.customer || '')}</div>
      <div class="muted">Email: ${escapeHtml(order.email || '—')}</div>
      <div style="margin-top:8px"><strong>Itens:</strong><ul>${itemsHtml}</ul></div>
      <div style="margin-top:8px"><strong>Observações:</strong></div>
    `;
    const obsList = document.createElement('div');


    for (const [name, values] of Object.entries(order.obs || [])) {
      values.forEach(o => {
        const text = obsList.innerText

        if (text.length <= 0) {
          obsList.innerText += name + ": ";
        } else if (!text.includes(name)) {
          obsList.innerText += "\n" + name + ": ";
        }

        if (o.value == "Sim") {
          obsList.innerText += `${escapeHtml(o.name)}; `
        }
      });
    }

    body.appendChild(obsList);

    q('#modalBody').innerHTML = '';
    q('#modalBody').appendChild(body);

    // limpar textarea
    q('#modalGeneralObs').value = order.obsgeral || '';

    openModalById('modalOverlay');
  } else {
    await Swal.fire({
      title: data.message,
      icon: "error",
      draggable: true
    });
  }
}

// ---------- Importador (tenta analisar HTML/JSON/linhas) ----------
function importOrdersFromText(text) {
  // tenta JSON primeiro
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      parsed.forEach(p => orders.push(normalizeOrder(p)));
      return;
    } else if (typeof parsed === 'object') {
      // se for objeto único, adiciona
      orders.push(normalizeOrder(parsed));
      return;
    }
  } catch (e) {
    // não é JSON
  }

  // tenta extrair elementos HTML se for HTML string
  if (/<[a-z][\s\S]*>/i.test(text)) {
    const tmp = document.createElement('div');
    tmp.innerHTML = text;
    // busca por elementos com classe order-item ou data attributes
    const nodes = tmp.querySelectorAll('.order-item, [data-order-id]');
    if (nodes.length > 0) {
      nodes.forEach(n => {
        const obj = {};
        obj.id = n.dataset.orderId || n.querySelector('.order-id')?.textContent?.trim() || randomId();
        obj.customer = n.querySelector('.order-customer')?.textContent?.trim() || n.dataset.customer || n.querySelector('.name')?.textContent?.trim() || 'Cliente';
        obj.items = [];
        // tenta encontrar itens
        n.querySelectorAll('.item, li').forEach(li => {
          const nm = li.dataset.name || li.querySelector('.name')?.textContent || li.textContent;
          obj.items.push({ name: nm.trim(), qty: 1, price: 0 });
        });
        // observações: elementos com class obs
        obj.obs = [];
        n.querySelectorAll('.obs, .observation').forEach(o => {
          const nm = o.dataset.name || o.textContent || 'Observação';
          obj.obs.push({ name: nm.trim(), value: 'Não' });
        });
        orders.push(normalizeOrder(obj));
      });
      return;
    }
  }

  // fallback: linhas de texto -> cada linha é um pedido, formato esperado:
  // ID | Cliente | item1:qty:price , item2:qty:price | obs1=Sim;obs2=Não | email
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  lines.forEach(ln => {
    const parts = ln.split('|').map(p => p.trim());
    const obj = { id: parts[0] || randomId(), customer: parts[1] || 'Cliente', items: [], obs: [], email: '' };
    if (parts[2]) {
      // items
      parts[2].split(',').map(s => s.trim()).forEach(it => {
        const [name, qty = '1', price = '0'] = it.split(':').map(x => x.trim());
        obj.items.push({ name, qty: parseInt(qty) || 1, price: parseFloat(price) || 0 });
      });
    }
    if (parts[3]) {
      parts[3].split(';').map(s => s.trim()).forEach(o => {
        const [name, val = 'Não'] = o.split('=').map(x => x.trim());
        obj.obs.push({ name, value: val });
      });
    }
    if (parts[4]) obj.email = parts[4];
    orders.push(normalizeOrder(obj));
  });
}

// ---------- Utils ----------
function normalizeOrder(o) {

  var status

  if (o.status == "Aprovado") {
    status = "Pendente"
  } else if (o.status == "Aguardando Pagamento") {
    status = "Pagando"
  } else if (o.status == "Entregue") {
    status = "Entregue"
  }

  return {
    id: String(o.id || o.numero || randomId()),
    customer: o.customer || o.nome_cliente || o.client || 'Cliente',
    email: o.email || o.email_cliente || '',
    items: Array.isArray(o.items) ? o.items.map(it => ({ name: it.name || it.prod || 'Item', qty: Number(it.qty || it.q || 1), price: Number(it.price || it.preco || 0) })) : [],
    obs: Array.isArray(o.obs) ? o.obs.map(x => ({ name: x.name || x.label || 'Obs', value: x.value || 'Não' })) : [],
    generalObs: o.generalObs || o.observacao || '',
    status: status
  };
}
function calcOrderTotal(o) {
  return (o.items || []).reduce((s, it) => s + (Number(it.price || 0) * Number(it.qty || 1)), 0);
}
function randomId() { return 'P' + Math.random().toString(36).slice(2, 9).toUpperCase(); }
function escapeHtml(s) { if (!s) return ''; return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- Employee save ----------
function saveEmployee() {
  const usuario = q('#emp_usuario').value.trim();
  const nome = q('#emp_nome').value.trim();
  const numero = Number(q('#emp_numero').value) || 0;
  const cargo = q('#emp_cargo').value.trim();
  if (!usuario || !nome || !numero || !cargo) return alert('Preencha todos os campos.');
  // verificar duplicado
  if (employees.some(e => e.usuario === usuario)) return alert('Usuário já existe.');
  employees.push({ usuario, nome, numero, cargo });
  closeModalById('modalEmployee');
  loadEmployees();
  updateMetrics();
  // limpar campos
  q('#emp_usuario').value = ''; q('#emp_nome').value = ''; q('#emp_numero').value = ''; q('#emp_cargo').value = '';
}

// ---------- Product save ----------
function saveProduct() {
  const nome = q('#prod_nome').value.trim();
  const img = q('#prod_img').value.trim();
  const qt = Number(q('#prod_qt').value) || 0;
  if (!nome) return alert('Informe o nome do produto.');
  const id = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
  products.push({ id, name: nome, img: img || 'https://via.placeholder.com/600x400?text=Produto', qty: qt });
  closeModalById('modalProduct');
  q('#prod_nome').value = ''; q('#prod_img').value = ''; q('#prod_qt').value = '1';
  renderStock();
}

// ---------- Modais ----------
function openModalById(id) {
  const el = q('#' + id);
  if (!el) return;
  el.classList.add('show');
  el.setAttribute('aria-hidden', 'false');
}
function closeModalById(id) {
  const el = q('#' + id);
  if (!el) return;
  el.classList.remove('show');
  el.setAttribute('aria-hidden', 'true');
}
async function closeAllModals() {
  qa('.modal').forEach(m => { m.classList.remove('show'); m.setAttribute('aria-hidden', 'true'); });
  delete q('#modalOverlay').dataset.currentOrder;

  const res = await fetch("/free-pedido", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, id: currentPedido })
  })

  currentPedido = null;
}

// ---------- Metrics ----------
function updateMetrics() {
  const total = totalPedidos;
  const revenue = orders.reduce((s, o) => s + calcOrderTotal(o), 0);
  q('#metricOrders').textContent = total;
  //q('#metricRevenue').textContent = 'R$ ' + revenue.toFixed(2).replace('.', ',');
  q('#sideTotalOrders').textContent = total;
  //q('#sideRevenue').textContent = 'R$ ' + revenue.toFixed(2).replace('.', ',');
  q('#sideEmployees').textContent = employees.length;

  const ranking = employees.slice().sort((a, b) => (b.ordersDelivered || 0) - (a.ordersDelivered || 0)).slice(0, 3);
  const rk = q('#metricRanking');
  rk.innerHTML = '';
  if (ranking.length === 0) rk.innerHTML = '<li>—</li>';
  else ranking.forEach(r => {
    const li = document.createElement('li');
    li.textContent = `${r.nome || r.usuario} — ${r.ordersDelivered || 0} vendas`;
    rk.appendChild(li);
  });
}

// expose to window for debugging if needed
window.panel = {
  orders, employees, products,
  importOrdersFromText, renderAll
};

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}