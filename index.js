const express = require("express");
const path = require("path");
const mysql = require("mysql2");
const app = express();
const port = 8080;
const __dirname = path.resolve();

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use("/admin", express.static(path.join(__dirname, "admin")));

const connection = mysql.createConnection({
    host: "mysql",
    user: "Admin",
    password: "CAsa0987",
    database: "database"
});

connection.connect((err) => {
    if (err) {
        console.error("Erro ao conectar ao MySQL:", err);
        return;
    }
    console.log("Conectado ao MySQL!");
});

const userList = {
   ["Cleitin"]: {
    password: "123456",
    token: "GkNfvr_JLeXjdIYRmVgSetSssxLwRI",
    role: "admin"
   } 
}

const tokensList = {
    ["GkNfvr_JLeXjdIYRmVgSetSssxLwRI"]: "Cleitin"
}

function verifyToken(req, res, next) {
    const token = req.query.token || req.headers["x-access-token"];

    if (token && tokensList[token]) {
        next();
    } else {
        res.redirect("/");
    }
}

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username && userList[username]){
        if (password && userList[username].password == password){
            return res.json({
                status: "success",
                message: "Login realizado com sucesso",
                redirect: `/admin/index.html?token=${userList[username].token}`,
                token: userList[username].token
            });
        } else{
            return res.json({ status: "fail", message: "Senha incorreta." })
        };
    } else{
        return res.json({ status: "fail", message: "Usúario não encontrado." })
    };
});

app.get("/admin/index.html", verifyToken, (req, res) => {
    res.sendFile(path.join(__dirname, "admin", "index.html"));
});

function generateToken(tokenSize){
    const caracters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_";
    var newToken = "";

    for(var i = 0; i < tokenSize; i++){
        const randomNum = Math.floor(Math.random() * caracters.length)
        const randomCaracter = caracters[randomNum];
        if (randomCaracter) {
            newToken = `${newToken}${randomCaracter}`;
        };
    };

    return newToken;
};

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
})