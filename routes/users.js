const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/User");

// Rota de registo
router.get("/register", (req, res) => res.render("users/register"));
router.post("/register", (req, res) => {
  const { username, password } = req.body;
  const newUser = new User({ username, password });
  newUser
    .save()
    .then((user) => res.redirect("/users/login"))
    .catch((err) => res.status(400).send(err));
});

// Rota de login
router.get("/login", (req, res) => res.render("users/login"));
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/users/login",
    failureFlash: false,
  })
);

// Rota de logout
router.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

module.exports = router;
