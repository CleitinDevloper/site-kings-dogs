require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const app = express();
const axios = require('axios');
const crypto = require("crypto");
const port = 8080;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const tablesToCreate = [
    `CREATE TABLE IF NOT EXISTS funcionarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        nome VARCHAR(50) NOT NULL,
        numero INT NOT NULL,
        vendas INT NOT NULL,
        cargo VARCHAR(255) NOT NULL
    );`, 
    `CREATE TABLE IF NOT EXISTS produtos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        img VARCHAR(255) NOT NULL,
        produto_name VARCHAR(255) NOT NULL,
        produto_desc VARCHAR(255) NOT NULL,
        produto_price INT NOT NULL,
        produto_obs JSON,
        quantidade INT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS pedidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        codigo_mp VARCHAR(255) NOT NULL,
        codigo_token VARCHAR(255) NOT NULL,
        status VARCHAR(255) NOT NULL,
        nome_cliente VARCHAR(255) NOT NULL,
        email_cliente VARCHAR(255) NOT NULL,
        price INT NOT NULL,
        pedido JSON NOT NULL
    );`
];

const connection = mysql.createPool({
    host: process.env.HOST,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

async function createTables(tables) {
  for (let i = 0; i < tables.length; i++) {
    try {
      await connection.query(tables[i]);
      console.log(`Tabela ${i + 1} criada ou já existe.`);
    } catch (err) {
      console.error(`Erro criando tabela ${i + 1}:`, err);
    }
  }
}

(async () => {
  await createTables(tablesToCreate);
})();

let userList = {};
let tokensList = {};
let items = {};
let pedidos = {};

async function updateDataServer(){
  try {
    const [funcionarios] = await connection.query(`SELECT * FROM funcionarios`);
    const [produtos] = await connection.query(`SELECT * FROM produtos`);
    const [pedidos] = await connection.query(`SELECT * FROM pedidos`);
    funcionarios.forEach(x => {
        userList[x.usuario] = {
            password: x.senha,
            token: x.token,
            nome: x.nome,
            numero: x.numero,
            vendas: x.vendas,
            role: x.cargo
        };

        tokensList[x.token] = x.usuario;
    });

    produtos.forEach(x => {

        var newObs = [];

        x.produto_obs.forEach(y => {
            newObs.push(y)
        })

        console.log(newObs)

        items[x.id] = {
            id: x.id,
            img: x.img,
            nome: x.produto_name,
            desc: x.produto_desc,
            price: x.produto_price,
            obs: newObs,
            quantidade: x.quantidade
        };
    });

    pedidos.forEach(x => {
        pedidos[x.codigo_token] = {
            id: x.id,
            codigo_mp: x.codigo_mp,
            token: x.codigo_token,
            status: x.status,
            nome_cliente: x.nome_cliente,
            email_cliente: x.email_cliente,
            price: x.price,
            pedido: x.pedido
        };
    });
  } catch (err) {
    console.error("Erro SQL:", err);
  }
}

updateDataServer();

function verifyToken(req, res, next) {
    const token = req.query.token || req.headers["x-access-token"];

    if (token && tokensList[token]) {
        next();
    } else {
        res.redirect("/");
    }
}

app.post("/getItems" , (req, res) => {
    if (items) {
        return res.json({ status: "success", items: items, message: "Lista de Items." })
    }else {
        return res.json({ status: "fail", message: "Nenhum item encontrado." })
    };
});

app.post("/check-payment", async (req, res) => {
    const { id, token } = req.body;

    if (id && token){
        if (pedidos[token] && pedidos[token].id == id){
            try{
                const response = await axios.get(
                    `https://api.mercadopago.com/v1/payments/${pedidos[token].codigo_mp}`,
                    {
                        headers: { Authorization: `Bearer ${process.env.MP_TOKEN}` }
                    }
                );

                const data = response.data;
                var status = pedidos[token].status;
                
                if (data.status != pedidos[token].status && pedidos[token].status != "delivered" && pedidos[token].status != "expired"){
                    switch (data.status) {
                        case "approved":
                        status = "Aprovado";
                        break;
                        case "pending":
                        status = "Aguardando Pagamento";
                        break;
                        case "rejected":
                        status = "Pagamento Recusado";
                        break;
                        case "cancelled":
                        status = "Pagamento Cancelado";
                        break;
                        default:
                        status = data.status;
                    };

                    pedidos[token].status = data.status;
                };

                const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
                const qrCodeText = data.point_of_interaction?.transaction_data?.qr_code;

                return res.json({ status: "success", message: "Atualização de pagamento", codigo_pedido: pedidos[token].id, paymentStatus: status, qr_code: qrCodeText, qr_code_base64: qrCodeBase64 });
            }catch(e){
                console.log("Erro no Mercado PAGO: "+e)
                return res.json({ status: "fail", message: "Erro ao encontrar seu pedido tente novamente mais tarde." });
            }
        } else{
            return res.json({ status: "fail", message: "Pedido não encontrado." });
        }
    }else{
        return res.json({ status: "fail", message: "Faltam informações para buscar por seu pedido." });
    };
});

app.post("/generate-payment", async (req, res) => {
    const { cart, nome, email } = req.body;

    if (nome == "" && !email.includes("@") && !email.includes(".")){
        return res.json({ status: "fail", message: "Informações faltando preencha novamente." }); 
    }

    var total = 0;

    for (const x of cart){
        if (items[x.id]){
            if (items[x.id].quantidade > 0){
                total += items[x.id].price;
                items[x.id].quantidade -= 1
            } else{
               return res.json({ status: "fail", message: "Item em falta no estoque." }); 
            }
        } else{
            return res.json({ status: "fail", message: "Item não cadastrado no banco de dados." });
        }
    }


    var pedido_id = await generateToken(15);

    while (pedidos[pedido_id]){
        pedido_id = await generateToken(15);
    }

    const idempotencyKey = crypto.randomUUID();

    const payment = {
        transaction_amount: parseFloat(total),
        description: `Pedido Kings Dog`,
        payment_method_id: "pix",
        payer: {
            email: email,
        },
        external_reference: pedido_id,
        notification_url: `https://kingsdog.discloud.app/webhook`,
        installments: 1
    };

    const headers = {
        'Authorization': `Bearer ${process.env.MP_TOKEN}`,
        'Content-Type': 'application/json',
        'x-idempotency-key': idempotencyKey
    };

    try{
        const response = await axios.post('https://api.mercadopago.com/v1/payments', payment, { headers });

        const data = response.data;

        const mp_id = ""+data.id+"";
        const status = data.status;

        const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
        const qrCodeText = data.point_of_interaction?.transaction_data?.qr_code;

        const [results] = await connection.query(
            `INSERT INTO pedidos (codigo_mp, codigo_token, status, nome_cliente, email_cliente, price, pedido) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [mp_id, pedido_id, status, nome, email, total, JSON.stringify(cart)]
        );

        const codigoPedido = results.insertId;

        pedidos[pedido_id] = {
            id: codigoPedido,
            codigo_mp: mp_id,
            token: pedido_id,
            status: status,
            nome_cliente: nome,
            email_cliente: email,
            pedido: cart
        };

        return res.json({ status: "success", message: "Pagamento gerado com sucesso!", codigo_pedido: codigoPedido, pedido_token: pedido_id, qr_code: qrCodeText, qr_code_base64: qrCodeBase64 });
    } catch(e){
        console.error("Erro Mercado Pago:", e.response?.data || e.message);
        return res.status(500).json({
            status: "fail",
            message: "Erro ao gerar pagamento",
            details: e.response?.data || e.message
        });
    }
});

app.post("/webhook", async (req, res) => {
    try{
        const paymentId = req.body.data?.id;
        if (!paymentId) return res.sendStatus(400);

        const response = await axios.get(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
                headers: { Authorization: `Bearer ${process.env.MP_TOKEN}` }
            }
        );

        const data = response.data;

        console.log(data);

    }catch(e){
        console.log("Erro: "+e)
        return res.sendStatus(500);
    }
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username && userList[username]){
        if (password && userList[username].password === password){
            return res.json({
                status: "success",
                message: "Login realizado com sucesso",
                redirect: `/admin?token=${userList[username].token}`,
                token: userList[username].token
            });
        } else{
            return res.json({ status: "fail", message: "Usuário não encontrado." });
        }
    } else{
        return res.json({ status: "fail", message: "Usuário não encontrado." });
    }
});

app.get("/admin", verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, "admin", "index.html"));
});

function generateToken(tokenSize){
    const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
    let newToken = "";

    for(let i = 0; i < tokenSize; i++){
        const randomNum = Math.floor(Math.random() * characters.length);
        const randomCharacter = characters[randomNum];
        if (randomCharacter) {
            newToken += randomCharacter;
        }
    }

    return newToken;
}

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});
