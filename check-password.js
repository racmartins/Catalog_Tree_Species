const bcrypt = require("bcryptjs");

// Substitua pelo hash armazenado na base de dados
const storedHash =
  "$2a$10$HFVsRVfd15De6HS6ogoPPuOU4BF5S8Ea6gTpZRcRXvU8Yas00Rivu";

// Substitua pela senha que deseja verificar
const password = "12345678";

bcrypt.compare(password, storedHash, (err, isMatch) => {
  if (err) {
    console.error(err);
  } else {
    console.log("Senha correta?", isMatch);
  }
});

/* este script serve para verificar se o hash armazenado na BD
e a password correspondem. */
