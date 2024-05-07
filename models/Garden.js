const mongoose = require("mongoose");

const gardenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  trees: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TreeSpecies",
    },
  ],
  // outras propriedades podem ser adicionadas aqui conforme necessário
  panoramicImage: String, // Campo novo para a imagem panorâmica
});

// Cria um índice geoespacial para a localização
gardenSchema.index({ location: "2dsphere" });

const Garden = mongoose.model("Garden", gardenSchema);

module.exports = Garden;
