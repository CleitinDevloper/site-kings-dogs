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

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self' https: data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:;");
  next();
});


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

let salesBlocked = false;
let userList = {};
let tokensList = {};
let items = {};
let pedidos = {};
let pedidosIds = {};

async function updateDataServer(){
  try {
    const [funcionarios] = await connection.query(`SELECT * FROM funcionarios`);
    const [produtos] = await connection.query(`SELECT * FROM produtos`);
    const [pedidosDB] = await connection.query(`SELECT * FROM pedidos`);
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

    pedidosDB.forEach(x => {
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

        pedidosIds[x.id] = x.codigo_token;
    });
  } catch (err) {
    console.error("Erro SQL:", err);
  }
}

updateDataServer();

app.use('/admin', express.static(path.join(__dirname, "admin")));
app.get('/admin', (req,res) => res.sendFile(path.join(__dirname, 'admin','index.html')));

app.post('/admin' , (req, res) => {
    const token = req.headers["x-access-token"] || req.body.token;

    if (tokensList[token]){
        return res.json({
            status: "success",
            message: "Login realizado com sucesso"
        });
    } else{
        return res.json({
            status: "fail",
            message: "Login invalido"
        });
    }
});

app.post("/getItems" , (req, res) => {
    if (items) {
        return res.json({ status: "success", items: items, message: "Lista de Items." })
    }else {
        return res.json({ status: "fail", message: "Nenhum item encontrado." })
    };
});

app.post("/get-pedidos" , (req, res) => {
    const { token } = req.body;

    if (tokensList[token]){

        var pedidosArray = [];

        Object.values(pedidos).forEach(p => {
            pedidosArray[p.id] = {
                id: p.id,
                email_cliente: p.email_cliente,
                nome_cliente: p.nome_cliente,
                price: p.price,
                status: p.status,
                pedido: p.pedido
            }
        })

        return res.json({ status: "success", pedidos: Object.values(pedidosArray), message: "Lista de Pedidos." })
    } else{
        return res.json({ status: "fail", message: "Login invalido." });
    }
});

app.post("/set-delivered", async (req, res) => {
    const { token, id } = req.body;

    if (tokensList[token]){
        if (pedidosIds[id]){
            pedidos[pedidosIds[id]].status = "Entregue";
            await connection.query(`UPDATE pedidos SET status = ? WHERE codigo_token = ?`, ["Entregue", pedidosIds[id]]);

            const webhook = "https://discord.com/api/webhooks/1429616459486859265/ZoZyKYAUycj4wC3DDH-jwh_yHL1bCFgv42OdkrApActNG1f-CRgUq4zvsPPURLqR6C4G";
            const embed = {
                title: `📦 LOG FUNCIONARIO`,
                description: "Atualização de pedido para entregue!",
                color: 0x5865f2,
                fields: [
                    { name: "Funcionario", value: userList[tokensList[token]].nome, inline: true },
                    { name: "Pedido", value: pedidosIds[id], inline: true },
                ],
                footer: { text: "Kings Dog | API" },
                timestamp: new Date(),
            };

            await axios.post(webhook, {
                username: "Kings API",
                embeds: [embed],
            });

            return res.json({ status: "success", message: "Status do pedido salvo com sucesso." })
        }else {
            return res.json({ status: "fail", message: "Pedido não encontrado." })
        };
    }else{
        return res.json({ status: "fail", message: "Login invalido." });
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
                
                if (pedidos[token].status != "Entregue" && pedidos[token].status != "expired"){
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

                    pedidos[token].status = status;
                };

                const qrCodeBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
                const qrCodeText = data.point_of_interaction?.transaction_data?.qr_code;

                return res.json({ status: "success", message: "Atualização de pagamento", codigo_pedido: pedidos[token].id, paymentStatus: pedidos[token].status, qr_code: qrCodeText, qr_code_base64: qrCodeBase64 });
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

let pedidos_em_andamento = [];

app.post("/free-pedido", (req, res) => {
    const { token, id } = req.body;
    if (!tokensList[token]){
        return res.json({ status: "fail", message: "Login invalido." });
    }

    pedidos_em_andamento[id] = 0;

    return res.json({ status: "success", message: "Pedido liberado." });
});

app.post("/order-status", async (req, res) => {
    const { token, id } = req.body;

    if (!tokensList[token]){
        return res.json({ status: "fail", message: "Login invalido." });
    };

    pedidosIds[id] = pedidosIds[id] || null;

    if (pedidosIds[id]){
        if (!pedidos_em_andamento[id] || pedidos_em_andamento[id] <= 0){
            pedidos_em_andamento[id] = 300;
            return res.json({ status: "success", message: "Status do pedido em produção." });
        } else{
            return res.json({ status: "fail", message: "Este pedido ja está sendo preparado." });
        }
    } else{
        return res.json({ status: "fail", message: "Pedido não encontrado." });
    };
})

function iniciarMonitoramento() {
    const intervalo = setInterval(() => {
        for (const [key, value] of pedidos_em_andamento){
            if (value > 0){
                pedidos_em_andamento[key] -= 1;
                console.log("[DEBUG]: Pedido: "+ key +" com novo tempo de: "+ pedidos_em_andamento[key]);
            };
        };
    }, 1000);
}

iniciarMonitoramento();

app.post("/block-sales", (req, res) => {
    const { token } = req.body; 

    if (!tokensList[token]){
        return res.json({ status: "fail", message: "Login invalido." });
    };

    if (userList[tokensList[token]].role !== "admin"){
        return res.json({ status: "fail", message: "Você não tem permissão para executar essa ação." });
    }

    salesBlocked = !salesBlocked;

    return res.json({ status: "success", message: salesBlocked ? "Vendas bloqueadas." : "Vendas desbloqueadas." });
});

app.post("/generate-payment", async (req, res) => {
    const { cart, nome, email } = req.body;

    if(salesBlocked){
        return res.json({ status: "fail", message: "As vendas estão temporariamente bloqueadas no momento tente novamente mais tarde." });
    };

    if (nome == "" && !email.includes("@") && !email.includes(".")){
        return res.json({ status: "fail", message: "Informações faltando preencha novamente." }); 
    };

    var total = 0;

    for (const x of cart){
        if (items[x.id]){
            if (items[x.id].quantidade > 0){
                total += items[x.id].price;
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
        const status = "Aguardando Pagamento";

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
            price: total,
            pedido: cart
        };

        const webhook = "https://discord.com/api/webhooks/1428173831364673678/s5nvQlN-DmQ2jM5_q43yqkrPhNPPk6kk4cfUpuAYI5MY_93BEzRDcQIuIA72TiiAWRZC";
        const embed = {
            title: `📦 Atualização Loja`,
            description: "Novo pagamento gerado!",
            color: 0x5865f2,
            fields: [
                { name: "Numero do Pedido", value: codigoPedido, inline: true },
                { name: "Nome do Cliente", value: nome, inline: true },
                { name: "Email do Cliente", value: email, inline: true },
                { name: "Valor", value: `R$ ${total}`, inline: true },
                { name: "Carrinho:", value: "````"+JSON.stringify(cart)+"```", inline: true },
            ],
            footer: { text: "Kings Dog | API" },
            timestamp: new Date(),
        };

        await axios.post(webhook, {
            username: "Kings API",
            embeds: [embed],
        });

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
        var status = ""

        var webhook = "";
        var embed = {}

        switch (data.status) {
            case "approved":
                status = "Aprovado";
                webhook = "https://discordapp.com/api/webhooks/1423053653438234714/DOOL8nsGxXrojx6wuATz62_SxMk0TRiKyiroZen4SPDhLW-kIcdYP3U-6j3SRo7ObTgp";
                embed = {
                    title: `📦 Atualização Loja`,
                    description: "Novo pagamento aprovado!",
                    color: 0x5865f2,
                    fields: [
                    { name: "Numero do Pedido", value: pedidos[data.external_reference].id, inline: true },  
                    { name: "Email do Cliente", value: pedidos[data.external_reference].email_cliente, inline: true },
                    { name: "Valor", value: `R$ ${data.transaction_amount}`, inline: true },
                    { name: "Status", value: data.status, inline: true },
                    { name: "Comprovante PDF", value: `[Abrir recibo](https://www.mercadopago.com.br/money-out/transfer/api/receipt/pix_pdf/${data.id}/pix_account/pix_payment.pdf)` },
                    ],
                    footer: { text: "Kings Dog | API" },
                    timestamp: new Date(),
                };
                break;
            case "pending":
                status = "Aguardando Pagamento";
                webhook = "https://discordapp.com/api/webhooks/1423054635249303713/kr2hWEx1LdQwUkunjMljE-cW9jzqvDJ0M5-a2sQ3bnp8b8qTKYe5yFc-tBpmntO0hrqc";
                embed = {
                    title: `📦 Atualização Loja`,
                    description: "Pagamento em aguardo!",
                    color: 0x5865f2,
                    fields: [
                    { name: "Numero do Pedido", value: pedidos[data.external_reference].id, inline: true },  
                    { name: "Email do Cliente", value: pedidos[data.external_reference].email_cliente, inline: true },
                    { name: "Valor", value: `R$ ${data.transaction_amount}`, inline: true },
                    { name: "Status", value: data.status, inline: true },
                    ],
                    footer: { text: "Kings Dog | API" },
                    timestamp: new Date(),
                };
                break;
            case "rejected":
                status = "Pagamento Recusado";
                webhook = "https://discordapp.com/api/webhooks/1423054808020947035/pn1zmULuAFHPFw0xadrr7juDGA683DFhapK8QscpGDNmc62nr6qqQA2TpiL3oFUHdo77";
                embed = {
                    title: `📦 Atualização Loja`,
                    description: "Pagamento Recusado!",
                    color: 0x5865f2,
                    fields: [
                    { name: "Numero do Pedido", value: pedidos[data.external_reference].id, inline: true },  
                    { name: "Email do Cliente", value: pedidos[data.external_reference].email_cliente, inline: true },
                    { name: "Valor", value: `R$ ${data.transaction_amount}`, inline: true },
                    { name: "Status", value: data.status, inline: true },
                    ],
                    footer: { text: "Kings Dog | API" },
                    timestamp: new Date(),
                };
                break;
            case "cancelled":
                status = "Pagamento Cancelado";
                webhook = "https://discordapp.com/api/webhooks/1423055189732102298/hKHaK1f5dRh6Ye_EradZpCnS6m8jNcBaBxX38-fR8l110w8eehYfmPk6h1kr7weV7lzx";
                embed = {
                    title: `📦 Atualização Loja`,
                    description: "Pagamento Cancelado!",
                    color: 0x5865f2,
                    fields: [
                    { name: "Numero do Pedido", value: pedidos[data.external_reference].id, inline: true },    
                    { name: "Email do Cliente", value: pedidos[data.external_reference].email_cliente, inline: true },
                    { name: "Valor", value: `R$ ${data.transaction_amount}`, inline: true },
                    { name: "Status", value: data.status, inline: true },
                    ],
                    footer: { text: "Kings Dog | API" },
                    timestamp: new Date(),
                };                
                break;
            default:
                status = data.status;
        };

        if (status != pedidos[data.external_reference].status && status != ""){
            pedidos[data.external_reference].status = status;
            await connection.query(`UPDATE pedidos SET status = ? WHERE codigo_token = ?`, [status, data.external_reference]);

            await axios.post(webhook, {
                username: "Kings API",
                embeds: [embed],
            });
        }
    }catch(e){
        console.log("Erro: "+e)
        return res.sendStatus(500);
    }
});

app.get("/check-token", (req, res) => {
    const token = req.headers["x-access-token"] || req.body.token;

    if (tokensList[token]){
        return res.json({
            status: "success",
            message: "Login realizado com sucesso"
        });
    } else{
        return res.json({
            status: "fail",
            message: "Login invalido"
        });
    }
})

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username && userList[username]){
        if (password && userList[username].password === password){
            return res.json({
                status: "success",
                message: "Login realizado com sucesso",
                token: userList[username].token
            });
        } else{
            return res.json({ status: "fail", message: "Usuário não encontrado." });
        }
    } else{
        return res.json({ status: "fail", message: "Usuário não encontrado." });
    }
});

async function generateToken(tokenSize){
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