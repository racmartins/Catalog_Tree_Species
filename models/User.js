const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/.+\@.+\..+/, "Por favor, insira um endereço de e-mail válido"],
  }, // Email com validação
  firstName: { type: String, required: true }, // Novo
  lastName: { type: String, required: true }, // Novo
  phone: { type: String, required: true }, // Novo
  age: { type: Number, required: true }, // Novo
  address: { type: String, required: true }, // Novo
  isAdmin: { type: Boolean, default: false }, // Adicionada esta linha
});

// Hashing da password antes de guardar o modelo
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Método para comparar as senhas
UserSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

module.exports = mongoose.model("User", UserSchema);
