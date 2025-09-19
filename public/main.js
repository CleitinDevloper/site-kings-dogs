    let token = "";
    let cart = [];
    let total = 0;

    let storeItems = [
        
    ];

    function addToCart(id) {
      const product = document.querySelector(`[data-id="${id}"]`);
      const name = product.getAttribute('data-name');
      const price = parseFloat(product.getAttribute('data-price'));
      const existing = cart.find((item) => item.id === id);
      if (existing) {
        existing.quantity++;
      } else {
        cart.push({ id, name, price, quantity: 1 });
      }
      updateCart();
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

        if (data.status == "success"){
          token = data.autorization;
          window.location.href = data.redirect;
        } else{
          console.log(data.message);
        };
      } else {
        alert('Por favor, preencha todos os campos.');
      };
    };

    document.querySelectorAll('.tab-link').forEach((link) => {
      link.addEventListener('click', function (e) {
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

        if (tabName == "produtos"){
          
        }

        document.getElementById(tab).classList.add('active');
        this.classList.add('active');
      });
    });
