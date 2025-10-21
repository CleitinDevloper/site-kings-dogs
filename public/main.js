let userToken = "";

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
      const div = document.getElementById("itemsContainer");
      if (data.items){
        Object.values(data.items).forEach(x => {
          if (!storeItems[x.id]){
            storeItems[x.id] = { nome: x.nome, price: x.price, img: x.img, desc: x.desc, quantidade: x.quantidade, obs: x.obs }
            div.innerHTML = div.innerHTML + `
              <div class="product">
                <img style="max-width: 150px; height: 150px" src="${x.img}" alt="Produto ${x.id}"/>
                <h3>${x.nome}</h3>
                <p>${x.desc}</p>
                <p>Preço: ${x.price} R$</p>
                <p>Quantidade em Estoque: ${x.quantidade}</p>
                <button item-id="${x.id}">Adicionar ao Carrinho</button> 
              </div>
            `;
          };
        });
      };
    } else {
      await Swal.fire({
        title: data.message,
        icon: "error",
        draggable: true
      });
    };
}

document.addEventListener("DOMContentLoaded", async () => {
  await updateItems();

  const id = getCookie("pedido_id");
  const token = getCookie("pedido_token");

  if (id && token) {
    const res = await fetch("/check-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, token })
    })

    const data = await res.json()

    if (data.status == "success") {
      const div = document.getElementById("payCard")
      const divStatus = document.getElementById("status");

      div.style.display = "flex";
      divStatus.innerText = "Status: " + data.paymentStatus;

      if (data.codigo_pedido) {
        document.getElementById("pedido-id").innerText = `Código do seu PEDIDO: ${data.codigo_pedido}`
      }

      const short = data.short_qr_display || "";
      const fullQr = data.qr_code || "";
      const base64 = data.qr_code_base64 || "";

      if (base64) {
        document.getElementById("qrImg").src = `data:image/png;base64,${base64}`;
      } else {
        document.getElementById("qrImg").alt = "QR não disponível";
      }

      const copiaEl = document.getElementById("copia");
      copiaEl.innerText = short || (fullQr.slice(0, 20) + "...");
      copiaEl.dataset.full = fullQr;

      const copyBtn = document.getElementById("copyBtn");
      copyBtn.onclick = () => copyFull(copiaEl.dataset.full);

      copiaEl.onclick = () => copyFull(copiaEl.dataset.full);
    } else {
      deleteCookie("pedido_id");
      deleteCookie("pedido_token");
      await Swal.fire({
        title: data.message,
        icon: "error",
        draggable: true
      });
    };
  };
});

async function addToCart(id, obs) {
  if (storeItems[id]) {
    if (storeItems[id].quantidade > 0){
      cart.push({ id: id, nome: storeItems[id].nome, price: storeItems[id].price, img: storeItems[id].img, obs: obs })
      
      await Swal.fire({
        title: "Seu item foi registrado com sucesso!",
        icon: "success",
        draggable: true
      });
    } else {
      await Swal.fire({
        title: "Produto em falta no estoque.",
        icon: "error",
        draggable: true
      });
    }
  };

  await updateCart();
}

async function removeFromCart(index) {
  if (cart[index]){
    cart.splice(index, 1)
  };

  await updateCart();
}

async function updateCart() {
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

  if (cart.length == 0){
    document.getElementById("vaziocart").style.display = "block";
  } else{
    document.getElementById("vaziocart").style.display = "none";
  }

  document.getElementById('total').textContent = total.toFixed(2);
}

async function tryPayment(){
  if (cart.length > 0){
    var nome = "";
    var email = "";

    await Swal.fire({
    title: "Coloque um nome que deseja ser chamado quando o pedido estiver pronto:",
    input: "text",
    inputAttributes: {
      autocapitalize: "off"
    },
    showCancelButton: false,
    confirmButtonText: "Avançar",
    showLoaderOnConfirm: true,
    preConfirm: async (login) => {
      try {
        nome = login
      } catch (error) {
        console.log(error);
        return;
      }
    },
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
    });

    await Swal.fire({
    title: "Para sua Segurança Insira um e-mail para podermos finalizar seu pedido.",
    input: "text",
    inputAttributes: {
      autocapitalize: "off"
    },
    showCancelButton: false,
    confirmButtonText: "Finalizar",
    showLoaderOnConfirm: true,
    preConfirm: async (login) => {
      try {
        if (login.includes("@") && login.includes(".")){
          email = login
        }else{
          await Swal.fire({
            title: "E-mail invalido (exemplo@xyz.com)",
            icon: "error",
            draggable: true
          });
        }
      } catch (error) {
        console.log(error);
        return;
      }
    },
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
    });

    if (nome != "" && email != ""){
      const res = await fetch("/generate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart, nome, email })
      })

      const data = await res.json()

      if (data.status == "success") {
        const div = document.getElementById("payCard")

        div.style.display = "flex";

        if (data.codigo_pedido){
          document.getElementById("pedido-id").innerText = `Código do seu PEDIDO: ${data.codigo_pedido}`
        }

        setCookie("pedido_id", data.codigo_pedido,7)
        setCookie("pedido_token", data.pedido_token,7)

        const short = data.short_qr_display || "";
        const fullQr = data.qr_code || "";
        const base64 = data.qr_code_base64 || "";

        if (base64) {
          document.getElementById("qrImg").src = `data:image/png;base64,${base64}`;
        } else {
          document.getElementById("qrImg").alt = "QR não disponível";
        }

        const copiaEl = document.getElementById("copia");
        copiaEl.innerText = short || (fullQr.slice(0,20) + "...");
        copiaEl.dataset.full = fullQr;

        const copyBtn = document.getElementById("copyBtn");
        copyBtn.onclick = () => copyFull(copiaEl.dataset.full);

        copiaEl.onclick = () => copyFull(copiaEl.dataset.full);

      } else{
          await Swal.fire({
            title: data.message,
            icon: "error",
            draggable: true
          });
      };
    } else{
        await Swal.fire({
          title: "Informações invalidas, tente fazer o pagamento novamente.",
          icon: "error",
          draggable: true
        });
    };
  };
};

function copyFull(text) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    alert("Cópia realizada!");
  }, (err) => {
    console.error("Erro ao copiar", err);
    alert("Não foi possível copiar automaticamente. Selecione e copie manualmente.");
  });
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
      localStorage.setItem("token", data.token);
      window.location.href = "/admin";
    } else {
      await Swal.fire({
        title: data.message,
        icon: "error",
        draggable: true
      });
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
    container.className = "items-list"
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

        const simId = `sim-${item}`;
        const naoId = `nao-${item}`;

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
        const row = container.children[i];
        const label = row.querySelector('.item-label').textContent;

        const sim = row.querySelector('input[value="sim"]');
        const nao = row.querySelector('input[value="nao"]');

        if (sim.checked) respostas[label] = true;
        else if (nao.checked) respostas[label] = false;
        else respostas[label] = false;
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

cartContainer.addEventListener('click', async (event) => {
  if (event.target.tagName === 'BUTTON' && event.target.closest('.cart-item')) {
    const itemId = event.target.getAttribute('item-id');
    if (itemId) {
      await removeFromCart(itemId);
    };
  };
});

const produtosContainer = document.getElementById('produtos');

produtosContainer.addEventListener('click', async (event) => {
  if (event.target.tagName === 'BUTTON' && event.target.hasAttribute('item-id')) {
    const itemId = event.target.getAttribute('item-id');
    if (storeItems[itemId]){
      if( storeItems[itemId].obs.length > 0){
      await showObservacoesModal(itemId).then(async result => {
        if (result) {
            await addToCart(itemId, JSON.stringify(result.respostas, null, 2));
        }});
      } else{
        await addToCart(itemId, []);
      }
    }
  };
});

function setCookie(name, value, days = 7) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = `${name}=${encodeURIComponent(value || "")}${expires}; path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const cookies = document.cookie.split(";");
  for (let c of cookies) {
    c = c.trim();
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length));
    }
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

document.getElementById("fechar-comprovante").addEventListener('click', (event) => {
  document.getElementById("payCard").style.display = 'none';
})

document.getElementById("check-pagamento").addEventListener('click', async (event) => {
  const id = getCookie("pedido_id");
  const token = getCookie("pedido_token");

  if (id && token) {
    const res = await fetch("/check-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, token })
    })

    const data = await res.json()

    if (data.status == "success") {
      const div = document.getElementById("payCard")
      const divStatus = document.getElementById("status");

      div.style.display = "flex";
      divStatus.innerText = "Status: " + data.paymentStatus;

      if (data.codigo_pedido) {
        document.getElementById("pedido-id").innerText = `Código do seu PEDIDO: ${data.codigo_pedido}`
      }

      const short = data.short_qr_display || "";
      const fullQr = data.qr_code || "";
      const base64 = data.qr_code_base64 || "";

      if (base64) {
        document.getElementById("qrImg").src = `data:image/png;base64,${base64}`;
      } else {
        document.getElementById("qrImg").alt = "QR não disponível";
      }

      const copiaEl = document.getElementById("copia");
      copiaEl.innerText = short || (fullQr.slice(0, 20) + "...");
      copiaEl.dataset.full = fullQr;

      const copyBtn = document.getElementById("copyBtn");
      copyBtn.onclick = () => copyFull(copiaEl.dataset.full);

      copiaEl.onclick = () => copyFull(copiaEl.dataset.full);
    } else {
      deleteCookie("pedido_id");
      deleteCookie("pedido_token");
      await Swal.fire({
        title: data.message,
        icon: "error",
        draggable: true
      });
    };
  };
});