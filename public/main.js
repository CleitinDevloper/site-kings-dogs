let token = "";

let storeItems = [];
let cart = [];
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
          storeItems[x.id] = { nome: x.nome, price: x.price, img: x.img, desc: x.desc, quantidade: x.quantidade, obs: x.obs }
          div.innerHTML = div.innerHTML + `
          <div class="products" id="products">
            <div class="product">
              <img style="max-width: 150px; height: 150px" src="${x.img}" alt="Produto ${x.id}"/>
              <h3>${x.nome}</h3>
              <p>${x.desc}</p>
              <p>Preço: ${x.price} R$</p>
              <p>Quantidade em Estoque: ${x.quantidade}</p>
              <button item-id="${x.id}">Adicionar ao Carrinho</button> 
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

function addToCart(id, obs) {
  if (storeItems[id]) {
    cart.push({ id: id, nome: storeItems[id].nome, price: storeItems[id].price, img: storeItems[id].img, obs: obs })
  };

  updateCart();
}

function removeFromCart(index) {
  if (cart[index]){
    cart.splice(index, 1)
  };

  updateCart();
}

function updateCart() {
  const cartItems = document.getElementById('cart-items');
  cartItems.innerHTML = '';
  total = 0;
  cart.forEach((item, index)=> {
    total += item.price;
    cartItems.innerHTML += `
                    <div class="cart-item">
                        <img style="width: 50px; height: 50px" src="${item.img}" alt="Produto 3"/>
                        <span>${item.nome} - R$ ${item.price}</span>
                        <button item-id="${index}">Remover</button>
                    </div>
                `;
  });
  document.getElementById('total').textContent = total.toFixed(2);
}

async function tryPayment(){
  if (cart.length > 0){
    const res = await fetch("/generate-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ cart })
    })
  };
};

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
      Object.values(items).forEach(item => {
        const row = document.createElement('div');
        row.className = 'item-row';

        const label = document.createElement('div');
        label.className = 'item-label';
        label.textContent = item;
        row.appendChild(label);

        const checkboxGroup = document.createElement('div');
        checkboxGroup.className = 'checkbox-group';

        const simId = `sim`;
        const naoId = `nao`;

        const simLabel = document.createElement('label');
        simLabel.setAttribute('for', simId);
        simLabel.textContent = 'Sim';
        const simCheckbox = document.createElement('input');
        simCheckbox.type = 'checkbox';
        simCheckbox.id = simId;
        simCheckbox.name = `item`;
        simCheckbox.value = 'sim';

        const naoLabel = document.createElement('label');
        naoLabel.setAttribute('for', naoId);
        naoLabel.textContent = 'Não';
        const naoCheckbox = document.createElement('input');
        naoCheckbox.type = 'checkbox';
        naoCheckbox.id = naoId;
        naoCheckbox.name = `item`;
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

    window.showObservacoesModal = function(id) {
      if (storeItems[id] && storeItems[id].obs.length > 0){
        return new Promise((resolve) => {
          currentResolve = resolve;
          currentId = id;

          clearModal();
          buildFields(storeItems[id].obs);

          modal.classList.add('show');
          overlay.classList.add('show');
        });
      } else{
        return;
      }
    };

    btnEnviar.addEventListener('click', () => {
      const respostas = {};
      const itemsCount = container.children.length;

      for(let i = 0; i < itemsCount; i++) {
        const sim = modal.querySelector(`#sim`);
        const nao = modal.querySelector(`#nao`);

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

document.querySelectorAll("#login button").forEach(btn => {
  btn.addEventListener("click", login);
});

document.querySelectorAll(".cart button").forEach(btn => {
  btn.addEventListener("click", tryPayment);
});

const cartContainer = document.getElementById('cart-items');

cartContainer.addEventListener('click', (event) => {
  if (event.target.tagName === 'BUTTON' && event.target.closest('.cart-item')) {
    const itemId = event.target.getAttribute('item-id');
    if (itemId) {
      removeFromCart(itemId);
    };
  };
});

const produtosContainer = document.getElementById('produtos');

produtosContainer.addEventListener('click', async (event) => {
  if (event.target.tagName === 'BUTTON' && event.target.hasAttribute('item-id')) {
    const itemId = event.target.getAttribute('item-id');
    await showObservacoesModal(itemId).then(result => {
    if (result) {
        addToCart(itemId, JSON.stringify(result.respostas, null, 2))
    }});
  };
});
