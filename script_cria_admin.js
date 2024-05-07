const mongoose = require("mongoose");
const User = require("./models/User"); // Certifique-se de que o caminho do modelo esteja correto

// Ajuste a string de conexão conforme necessário
const dbURI = "mongodb://localhost:27017/Jardins_Esas_db";

async function createAdminUser() {
  try {
    // Conecta ao MongoDB
    await mongoose.connect(dbURI);
    console.log("Conexão com o MongoDB estabelecida com sucesso.");

    // Verifica se o utilizador admin já existe
    const existingAdmin = await User.findOne({ username: "admin" });
    if (existingAdmin) {
      console.log("Utilizador admin já existe.");
      return;
    }

    // Cria um novo utilizador admin com os campos necessários
    const newUser = new User({
      username: "admin",
      password: "12345678", // Sem hash manual; o hash será feito pelo middleware do modelo
      email: "admin@dominio.pt",
      firstName: "Administrador",
      lastName: "",
      phone: "", // Ajuste conforme necessário
      isAdmin: true,
    });

    // Guarda o novo utilizador na base de dados
    await newUser.save();
    console.log("Utilizador administrador criado com sucesso!");
  } catch (err) {
    console.error("Erro ao criar utilizador administrador:", err);
  } finally {
    // Fecha a conexão
    await mongoose.connection.close();
  }
}

// Chama a função createAdminUser
createAdminUser();
