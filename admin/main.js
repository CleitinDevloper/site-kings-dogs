
// Funções JS para funcionalidade sem Bootstrap (evita CSP com classes)
let orders = [
    { id: 1, customer: 'João Silva', number: 'PED001', items: [{ name: 'Produto A', qty: 2, price: 50 }, { name: 'Produto B', qty: 1, price: 30 }], observations: [{ name: 'Pure de batata', status: 'Não' }, { name: 'Sem cebola', status: 'Sim' }], delivered: false },
    { id: 2, customer: 'Maria Santos', number: 'PED002', items: [{ name: 'Produto C', qty: 3, price: 20 }], observations: [{ name: 'Extra queijo', status: 'Não' }], delivered: false }
];

let employees = [
    { id: 1, name: 'João Silva', number: 'EMP001', ordersDelivered: 15, position: 'Vendedor' },
    { id: 2, name: 'Maria Santos', number: 'EMP002', ordersDelivered: 12, position: 'Vendedor' },
    { id: 3, name: 'Pedro Oliveira', number: 'EMP003', ordersDelivered: 10, position: 'Vendedor' }
];

let products = [
    { id: 1, name: 'Produto 1', image: 'https://via.placeholder.com/250x150?text=Produto+1', quantity: 10 },
    { id: 2, name: 'Produto 2', image: 'https://via.placeholder.com/250x150?text=Produto+2', quantity: 5 },
    { id: 3, name: 'Produto 3', image: 'https://via.placeholder.com/250x150?text=Produto+3', quantity: 20 }
];

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "/";
        return;
    }
    updateMetrics();
    renderOrders();
    renderEmployees();
    renderProducts();
    // Configurar tabs iniciais
    switchTab('metrics');
});

// Função para alternar tabs (sem Bootstrap)
function switchTab(tabId) {
    // Esconder todas as tabs
    const tabs = document.querySelectorAll('.tab-pane');
    tabs.forEach(tab => {
        tab.classList.remove('show', 'active', 'fade');
    });
    // Remover active dos links
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => link.classList.remove('active'));
    // Mostrar tab selecionada
    const activeTab = document.getElementById(tabId);
    activeTab.classList.add('show', 'active', 'fade');
    // Ativar link
    const activeLink = document.getElementById(tabId + '-tab');
    activeLink.classList.add('active');
}

// Funções para modals (sem Bootstrap)
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Previne scroll
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
}

// Fechar modal ao clicar fora
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
}

function updateMetrics() {
    document.getElementById('totalOrders').textContent = orders.length;
    let totalValue = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + (item.qty * item.price), 0), 0);
    document.getElementById('totalValue').textContent = 'R$ ' + totalValue.toFixed(2).replace('.', ',');
}

function renderOrders() {
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '';
    orders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-item';
        orderDiv.onclick = () => showOrderDetails(order.id);
        orderDiv.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6>${order.customer}</h6>
                            <small class="text-muted">Pedido: ${order.number}</small>
                        </div>
                        <span class="badge ${order.delivered ? 'bg-success' : 'bg-warning'}">${order.delivered ? 'Entregue' : 'Pendente'}</span>
                    </div>
                `;
        ordersList.appendChild(orderDiv);
    });
}

function renderEmployees() {
    const employeesList = document.getElementById('employeesList');
    employeesList.innerHTML = '';
    employees.forEach(employee => {
        const employeeDiv = document.createElement('div');
        employeeDiv.className = 'employee-item';
        employeeDiv.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6>${employee.name}</h6>
                            <small class="text-muted">Número: ${employee.number} | Pedidos: ${employee.ordersDelivered}</small>
                        </div>
                        <div>
                            <button class="btn btn-outline-danger btn-sm me-2" onclick="event.stopPropagation(); fireEmployee(${employee.id})">Demitir</button>
                            <button class="btn btn-outline-success btn-sm" onclick="event.stopPropagation(); promoteEmployee(${employee.id})">Promover</button>
                        </div>
                    </div>
                `;
        employeesList.appendChild(employeeDiv);
    });
}

function renderProducts() {
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';
    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item col-md-4 mb-4';
        productDiv.innerHTML = `
                    <div class="card">
                        <img src="${product.image}" class="card-img-top" alt="${product.name}" style="width: 100%; height: auto;">
                        <div class="card-body text-center">
                            <h5 class="card-title">${product.name}</h5>
                            <div class="quantity-selector">
                                <button class="btn btn-outline-secondary" onclick="changeQuantity(${product.id}, -1)">-</button>
                                <span class="mx-3" id="qty-${product.id}">${product.quantity}</span>
                                <button class="btn btn-outline-secondary" onclick="changeQuantity(${product.id}, 1)">+</button>
                            </div>
                        </div>
                    </div>
                `;
        productsList.appendChild(productDiv);
    });
}

function changeQuantity(id, delta) {
    const product = products.find(p => p.id === id);
    product.quantity = Math.max(0, product.quantity + delta);
    document.getElementById(`qty-${id}`).textContent = product.quantity;
}

function showOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    const detailsDiv = document.getElementById('orderDetails');
    detailsDiv.innerHTML = `
                <h6>Cliente: ${order.customer}</h6>
                <p>Número: ${order.number}</p>
                <h6>Itens:</h6>
                <ul>
                    ${order.items.map(item => `<li>${item.name} - Qtd: ${item.qty} - Preço: R$ ${item.price.toFixed(2).replace('.', ',')}</li>`).join('')}
                </ul>
                <h6>Observações:</h6>
                <ul>
                    ${order.observations.map(obs => `
                        <li>${obs.name}: 
                            <input type="checkbox" ${obs.status === 'Não' ? 'checked' : ''} disabled> Não
                            <input type="checkbox" ${obs.status === 'Sim' ? 'checked' : ''} disabled> Sim
                        </li>
                    `).join('')}
                </ul>
            `;
    openModal('orderDetailsModal');
}

function deliverOrder() {
    alert('Pedido marcado como entregue!');
    closeModal('orderDetailsModal');
    updateMetrics();
    // Atualize status no array se necessário
    const modal = document.getElementById('orderDetailsModal');
    const orderId = /* Pegue do contexto ou passe como param */ 1; // Exemplo
    const order = orders.find(o => o.id === orderId);
    if (order) order.delivered = true;
    renderOrders();
}

function searchOrders() {
    const searchTerm = document.getElementById('orderSearch').value.toLowerCase();
    const filteredOrders = orders.filter(order =>
        order.customer.toLowerCase().includes(searchTerm) ||
        order.number.toLowerCase().includes(searchTerm)
    );
    // Render filtered (simplificado; atualize orders temp)
    orders = filteredOrders; // Para demo; use var temp em prod
    renderOrders();
}

function searchEmployees() {
    const searchTerm = document.getElementById('employeeSearch').value.toLowerCase();
    const filteredEmployees = employees.filter(employee =>
        employee.name.toLowerCase().includes(searchTerm) ||
        employee.number.toLowerCase().includes(searchTerm)
    );
    employees = filteredEmployees; // Para demo
    renderEmployees();
}

function addItem() {
    const container = document.getElementById('itemsContainer');
    const newItem = document.createElement('div');
    newItem.className = 'item-row mb-3';
    newItem.innerHTML = `
                <div class="row">
                    <div class="col-md-4">
                        <input type="text" class="form-control" placeholder="Nome do Item" required>
                    </div>
                    <div class="col-md-2">
                        <input type="number" class="form-control" placeholder="Qtd" required>
                    </div>
                    <div class="col-md-3">
                        <input type="number" step="0.01" class="form-control" placeholder="Preço" required>
                    </div>
                    <div class="col-md-3">
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeItem(this)">Remover</button>
                    </div>
                </div>
            `;
    container.appendChild(newItem);
}

function removeItem(button) {
    button.closest('.item-row').remove();
}

function addObservation() {
    const container = document.getElementById('observationsContainer');
    const newObs = document.createElement('div');
    newObs.className = 'observation-row mb-3';
    newObs.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <input type="text" class="form-control" placeholder="Nome da Observação" required>
                    </div>
                    <div class="col-md-3">
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="obsStatus_${Date.now()}" value="Não" required> <!-- Nome único para radios -->
                            <label class="form-check-label">Não</label>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="obsStatus_${Date.now()}" value="Sim">
                            <label class="form-check-label">Sim</label>
                        </div>
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeObservation(this)">Remover</button>
                    </div>
                </div>
            `;
    container.appendChild(newObs);
}

function removeObservation(button) {
    button.closest('.observation-row').remove();
}

function saveOrder() {
    // Coleta dados do form (exemplo simples; expanda para itens/obs)
    const customerName = document.getElementById('customerName').value;
    const orderNumber = document.getElementById('orderNumber').value;
    // ... Colete itens e obs dinamicamente
    alert(`Pedido salvo: ${customerName} - ${orderNumber}`);
    closeModal('addOrderModal');
    // Limpe form
    document.getElementById('addOrderForm').reset();
    document.getElementById('itemsContainer').innerHTML = '<h6>Itens do Pedido</h6><div class="item-row mb-3"><div class="row"><!-- item inicial --></div></div>'; // Recrie inicial
    document.getElementById('observationsContainer').innerHTML = '<h6>Observações</h6><div class="observation-row mb-3"><div class="row"><!-- obs inicial --></div></div>';
    updateMetrics();
    renderOrders();
}

function saveEmployee() {
    const name = document.getElementById('employeeName').value;
    const number = document.getElementById('employeeNumber').value;
    // ... Outros campos
    alert(`Funcionário contratado: ${name} - ${number}`);
    closeModal('addEmployeeModal');
    document.getElementById('addEmployeeForm').reset();
    renderEmployees();
}

function fireEmployee(id) {
    if (confirm('Tem certeza que deseja demitir este funcionário?')) {
        employees = employees.filter(emp => emp.id !== id);
        renderEmployees();
    }
}
function promoteEmployee(id) {
    alert('Funcionário promovido!');
    // Em app real, atualize cargo no DB
    const employee = employees.find(emp => emp.id === id);
    if (employee) {
        employee.position = 'Gerente'; // Exemplo
        renderEmployees();
    }
}