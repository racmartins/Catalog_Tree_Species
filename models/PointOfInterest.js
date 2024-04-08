const mongoose = require("mongoose");

const pointOfInterestSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  name: { type: String, required: true },
  description: String,
  additionalInfo: String, // Novo campo adicionado
  qrCodeData: String, // Campo para armazenar os dados do QR-Code gerado
});

const PointOfInterest = mongoose.model(
  "PointOfInterest",
  pointOfInterestSchema
);

module.exports = PointOfInterest;
