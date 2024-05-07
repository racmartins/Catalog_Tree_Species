const Species = require("../models/TreeSpecies"); // Ajuste para o seu modelo de dados

exports.searchSpecies = async (req, res) => {
  const searchTerm = req.query.searchTerm;
  let perPage = 9; // Define o mesmo número de itens por página que a listagem completa
  let page = req.query.page || 1; // Página atual

  try {
    // Realiza a pesquisa baseada no termo fornecido
    const results = await Species.find({
      $or: [
        { common_name: new RegExp(searchTerm, "i") },
        { scientific_name: new RegExp(searchTerm, "i") },
      ],
    })
      .skip(perPage * page - perPage)
      .limit(perPage);

    // Calcula o total de itens encontrados na pesquisa
    const totalItems = await Species.countDocuments({
      $or: [
        { common_name: new RegExp(searchTerm, "i") },
        { scientific_name: new RegExp(searchTerm, "i") },
      ],
    });

    // Calcula o total de páginas baseado no número de resultados
    const pages = Math.ceil(totalItems / perPage);

    // Renderiza a view com os resultados da pesquisa
    res.render("species/index", {
      species: results,
      searchTerm,
      current: page,
      pages,
      activePage: "species",
    });
  } catch (error) {
    console.error(`Erro durante a pesquisa: ${error}`);
    res.sendStatus(500);
  }
};

exports.addPlantingGuide = async (req, res) => {
  try {
    const speciesId = req.params.id;
    const plantingGuide = req.body;
    await Species.findByIdAndUpdate(speciesId, { $set: { plantingGuide } });
    res.redirect("/species/" + speciesId);
  } catch (error) {
    // Trate o erro adequadamente
    res.status(500).send(error.message);
  }
};
