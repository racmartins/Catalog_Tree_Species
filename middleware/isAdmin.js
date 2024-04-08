// middleware/isAdmin.js
function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    // Redireciona para a rota de acesso negado
    res.redirect("/acesso-negado");
  }
}
module.exports = isAdmin;
