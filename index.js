const express = require("express");
const path = require("path");
const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const testList = {
   ["Cleitin"]: {
    password: "123456",
    token: "GkNfvr_JLeXjdIYRmVgSetSssxLwRI"
   } 
}

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username && testList[username]){
        if (password && testList[username].password == password){
            return res.json({ status: "sucess", message: "Logado com sucesso.", autorization: testList[username].token })
        } else{
            return res.json({ status: "fail", message: "Senha incorreta." })
        };
    } else{
        return res.json({ status: "fail", message: "Usúario não encontrado." })
    };
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