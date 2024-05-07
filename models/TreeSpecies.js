const mongoose = require("mongoose");

const treeSpeciesSchema = new mongoose.Schema({
  scientific_name: String,
  common_name: String,
  description: String,
  characteristics: {
    altura: String,
    diâmetro: String,
    folhagem: String,
  },
  habitat: String,
  image_url: String,
  plantingGuide: {
    soil: String,
    sunlight: String,
    watering: String,
    // Adicione outros campos conforme necessário
  }
});

const TreeSpecies = mongoose.model("TreeSpecies", treeSpeciesSchema);

module.exports = TreeSpecies;
