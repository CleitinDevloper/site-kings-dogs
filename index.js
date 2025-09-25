require("dotenv").config();
const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const app = express();
const port = 8080;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Array com queries para criar tabelas
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
        status VARCHAR(255) NOT NULL,
        nome_cliente VARCHAR(255) NOT NULL,
        email_cliente VARCHAR(255) NOT NULL,
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
        pedidos[x.id] = {
            id: x.id,
            status: x.status,
            nome_cliente: x.nome_cliente,
            email_cliente: x.email_cliente,
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

app.post("/generate-payment", async (req, res) => {
    const { cart, nome, email } = req.body;

    cart.forEach(x => {
        if (items[x.id]){
            if (items[x.id].quantidade > 0){
                console.log(JSON.parse(cart.obs))
            } else{
               return res.json({ status: "fail", message: "Item em falta no estoque." }); 
            }
        } else{
            return res.json({ status: "fail", message: "Item não cadastrado no banco de dados." });
        }
    });
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
