const express = require("express");
const router = express.Router();
const SpeciesController = require("../controllers/SpeciesController");

// Rota para adicionar informação de plantio e cuidados
router.post("/species/:id/planting-guide", SpeciesController.addPlantingGuide);

module.exports = router;
