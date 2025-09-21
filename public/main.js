let token = "";

let storeItems = {};
let cart = {};
let total = 0;

async function updateItems(){
      const res = await fetch("/getItems", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });

    const data = await res.json()

    if (data.status == "success") {
      const div = document.getElementById("produtos");
      if (data.items){
        div.innerHTML = `<h2>Produtos</h2>`
        Object.values(data.items).forEach(x => {
          div.innerHTML = div.innerHTML + `
          <div class="products" id="products">
            <div class="product">
              <img style="max-width: 150px; height: 150px" src="${x.img}" alt="Produto ${x.id}"/>
              <h3>${x.nome}</h3>
              <p>${x.desc}</p>
              <p>Preço: ${x.price}.00 R$</p>
              <p>Quantidade em Estoque: ${x.quantidade}</p>
              <button item-id="${x.id}" onclick="showObservacoesModal(${x.id}, ['Purê de batatas', 'Ketchup', 'Mostarda']).then(result => {
                if (result) {
                  alert('ID: ' + result.id + ' Respostas: ' + JSON.stringify(result.respostas, null, 2));
                  console.log(result);
                } else {
                  alert('Modal fechado sem enviar.');
                }
              });">Adicionar ao Carrinho</button>
            </div>
          </div>
          `;
        });
      };
    } else {
      console.log(data.message);
    };
}

document.addEventListener("DOMContentLoaded", async () => {
  await updateItems();
})

function addToCart(id) {
  console.log(id.getAttribute("item-id"))
  /*const name = product.getAttribute('data-name');
  const price = parseFloat(product.getAttribute('data-price'));
  const existing = cart.find((item) => item.id === id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ id, name, price, quantity: 1 });
  }
  updateCart();*/
}

function removeFromCart(id) {
  const index = cart.findIndex((item) => item.id === id);
  if (index > -1) {
    if (cart[index].quantity > 1) {
      cart[index].quantity--;
    } else {
      cart.splice(index, 1);
    }
  }
  updateCart();
}

function updateCart() {
  const cartItems = document.getElementById('cart-items');
  cartItems.innerHTML = '';
  total = 0;
  cart.forEach((item) => {
    total += item.price * item.quantity;
    cartItems.innerHTML += `
                    <div class="cart-item">
                        <img         
                        src="https://via.placeholder.com/250x150?text=Produto+3"
                        alt="Produto 3"/>
                        <span>${item.name} (x${item.quantity}) - R$ ${(item.price * item.quantity).toFixed(2)}</span>
                        <button onclick="removeFromCart(${item.id})">Remover</button>
                    </div>
                `;
  });
  document.getElementById('total').textContent = total.toFixed(2);
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  if (username && password) {
    const res = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json()

    if (data.status == "success") {
      token = data.autorization;
      window.location.href = data.redirect;
    } else {
      console.log(data.message);
    };
  } else {
    alert('Por favor, preencha todos os campos.');
  };
};

document.querySelectorAll('.tab-link').forEach((link) => {
  link.addEventListener('click', async function (e) {
    e.preventDefault();
    const tab = this.getAttribute('data-tab');

    if (this.classList.contains('active')) return;

    document.querySelectorAll('.tab-content').forEach((content) => {
      content.classList.remove('active');
    });
    document.querySelectorAll('.tab-link').forEach((link) => {
      link.classList.remove('active');
    });

    const tabName = this.getAttribute('data-name');

    if (tabName == "produtos") {
      await updateItems();
    }

    document.getElementById(tab).classList.add('active');
    this.classList.add('active');
  });
});

  (function(){
    const overlay = document.createElement('div');
    overlay.className = 'overlay';

    const modal = document.createElement('div');
    modal.className = 'modal-container';

    const title = document.createElement('h2');
    title.textContent = 'Observações';
    modal.appendChild(title);

    const container = document.createElement('div');
    modal.appendChild(container);

    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Observações gerais...';
    modal.appendChild(textarea);

    const btnEnviar = document.createElement('button');
    btnEnviar.className = 'btn-send';
    btnEnviar.textContent = 'Enviar';
    modal.appendChild(btnEnviar);

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    let currentResolve = null;
    let currentId = null;

    function clearModal() {
      container.innerHTML = '';
      textarea.value = '';
    }

    function buildFields(items) {
      items.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'item-row';

        const label = document.createElement('div');
        label.className = 'item-label';
        label.textContent = item;
        row.appendChild(label);

        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'checkbox-group';

        const simId = `sim-${index}`;
        const naoId = `nao-${index}`;

        const simLabel = document.createElement('label');
        simLabel.setAttribute('for', simId);
        simLabel.textContent = 'Sim';
        const simCheckbox = document.createElement('input');
        simCheckbox.type = 'checkbox';
        simCheckbox.id = simId;
        simCheckbox.name = `item-${index}`;
        simCheckbox.value = 'sim';

        const naoLabel = document.createElement('label');
        naoLabel.setAttribute('for', naoId);
        naoLabel.textContent = 'Não';
        const naoCheckbox = document.createElement('input');
        naoCheckbox.type = 'checkbox';
        naoCheckbox.id = naoId;
        naoCheckbox.name = `item-${index}`;
        naoCheckbox.value = 'nao';

        function toggleCheckboxes(e) {
          if (e.target.checked) {
            if (e.target === simCheckbox) naoCheckbox.checked = false;
            else if (e.target === naoCheckbox) simCheckbox.checked = false;
          }
        }
        simCheckbox.addEventListener('change', toggleCheckboxes);
        naoCheckbox.addEventListener('change', toggleCheckboxes);

        simLabel.prepend(simCheckbox);
        naoLabel.prepend(naoCheckbox);

        checkboxGroup.appendChild(simLabel);
        checkboxGroup.appendChild(naoLabel);

        row.appendChild(checkboxGroup);
        container.appendChild(row);
      });
    }

    window.showObservacoesModal = function(id, items) {
      return new Promise((resolve) => {
        currentResolve = resolve;
        currentId = id;

        clearModal();
        buildFields(items);

        modal.classList.add('show');
        overlay.classList.add('show');
      });
    };

    btnEnviar.addEventListener('click', () => {
      const respostas = {};
      const itemsCount = container.children.length;

      for(let i = 0; i < itemsCount; i++) {
        const sim = modal.querySelector(`#sim-${i}`);
        const nao = modal.querySelector(`#nao-${i}`);

        const label = container.children[i].querySelector('.item-label').textContent;

        if (sim.checked) respostas[label] = 'Sim';
        else if (nao.checked) respostas[label] = 'Não';
        else respostas[label] = null;
      }

      respostas['observacoes_gerais'] = textarea.value.trim();

      modal.classList.remove('show');
      overlay.classList.remove('show');

      if (currentResolve) {
        currentResolve({ id: currentId, respostas });
        currentResolve = null;
        currentId = null;
      }
    });

    overlay.addEventListener('click', () => {
      modal.classList.remove('show');
      overlay.classList.remove('show');

      if (currentResolve) {
        currentResolve(null);
        currentResolve = null;
        currentId = null;
      }
    });
  })();