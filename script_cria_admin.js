//Não usar este script em ambientes de produção (Perigoso!)

const mongoose = require("mongoose");
const User = require("./models/User"); // Ajuste o caminho conforme necessário

// String de conexão
const dbURI = "mongodb://localhost:27017/esas_tree_species_db";

// Função assíncrona para conectar à base de dados e criar o utilizador administrador
async function main() {
  try {
    await mongoose.connect(dbURI);
    console.log("Conexão com o MongoDB estabelecida com sucesso.");

    const newUser = new User({
      username: "admin",
      password: "12345678", // Lembre-se de hashear a senha antes de salvá-la
      isAdmin: true,
    });

    await newUser.save();
    console.log("Utilizador administrador criado com sucesso!");
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
    process.exit();
  }
}

// Chama a função main
main();
