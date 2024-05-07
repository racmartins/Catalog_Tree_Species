const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/User");

// Rota GET para o formulário de registro
router.get("/register", (req, res) => {
  res.render("users/register", { error: null, formData: {} });
});

// Rota POST para processar o formulário de registro
router.post("/register", async (req, res) => {
  const { username, password, email, firstName, lastName, phone } = req.body;

  // Verificar se todos os campos obrigatórios estão preenchidos
  if (!username || !password || !email || !firstName) {
    return res.render("users/register", {
      error: "Todos os campos obrigatórios devem ser preenchidos.",
      formData: req.body,
    });
  }

  try {
    // Verifica se o utilizador ou email já existe
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      const error =
        existingUser.username === username
          ? "Utilizador já existe."
          : "Email já existe.";
      return res.render("users/register", { error, formData: req.body });
    }

    // Criar uma nova instância de utilizador com todos os campos
    const newUser = new User({
      username,
      password,
      email,
      firstName,
      lastName,
      phone,
    });

    // Guardar o novo utilizador na base de dados
    await newUser.save();

    // Redirecionar para a página de login
    res.redirect("/users/login");
  } catch (err) {
    console.error(err);
    res.render("users/register", {
      error: "Erro ao registar o utilizador.",
      formData: req.body,
    });
  }
});

// Rota GET para o formulário de login
router.get("/login", (req, res) => {
  res.render("users/login", { message: req.flash("error") });
});

// Rota POST para processar o login
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/users/login",
    failureFlash: true,
  })
);

// Rota de logout
router.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

module.exports = router;
