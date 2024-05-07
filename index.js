const express = require("express");
const mongoose = require("mongoose");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const cors = require("cors");

const User = require("./models/User");
const TreeSpecies = require("./models/TreeSpecies");
const Video = require("./models/Video");
const PointOfInterest = require("./models/PointOfInterest");
const Garden = require("./models/Garden");

const speciesController = require("./controllers/SpeciesController");

const isAdmin = require("./middleware/isAdmin");

const app = express();
const PORT = process.env.PORT || 3000;

// Ative o CORS para todas as rotas (ajuste conforme a necessidade)
app.use(cors());

app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(express.static("node_modules"));

const methodOverride = require("method-override");
app.use(methodOverride("_method"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: "uploads/" });

app.use(
  session({ secret: "verysecret", resave: false, saveUninitialized: true })
);

// Inicializa o connect-flash
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/Jardins_Esas_db");

//garante que o user esteja disponível globalmente nas suas views como uma variável local.
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Garante que o user e isAdmin estejam disponíveis globalmente nas views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAdmin = req.user && req.user.isAdmin;
  next();
});

// Middleware para definir um valor padrão para errorMessage
app.use((req, res, next) => {
  res.locals.errorMessage = "";
  next();
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    console.log("Iniciando a autenticação para o utilizador:", username);
    try {
      const user = await User.findOne({ username });
      if (!user) {
        console.log("Utilizador não encontrado:", username);
        return done(null, false, { message: "Utilizador não encontrado." });
      }

      const match = await bcrypt.compare(password, user.password);
      if (match) {
        console.log("Senha correta para usuário:", username);
        return done(null, user);
      } else {
        console.log("Senha incorreta para o utilizador:", username);
        return done(null, false, { message: "Senha incorreta." });
      }
    } catch (error) {
      console.log("Erro durante a autenticação:", error);
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

app.use("/users", require("./routes/users"));

// Rota raiz que renderiza a homepage.ejs
app.get("/", (req, res) => {
  res.render("homepage", { activePage: "homepage" });
});

// Rota para listar jardins
app.get("/gardens", async (req, res) => {
  try {
    const gardens = await Garden.find();
    res.render("./gardens/index", {
      gardens: gardens,
      activePage: "gardens",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao buscar jardins.");
  }
});

// Rota para mostrar o formulário de adição de jardins
app.get("/gardens/add", isAdmin, (req, res) => {
  res.render("./gardens/add-garden");
});

// Rota para processar o formulário de adição de jardins
app.post("/gardens", async (req, res) => {
  const { name, longitude, latitude, panoramicImage } = req.body; // Extraia a panoramicImage do corpo da requisição

  const coordinates = [parseFloat(longitude), parseFloat(latitude)];

  if (isNaN(coordinates[0]) || isNaN(coordinates[1])) {
    return res
      .status(400)
      .send("Longitude e latitude devem ser números válidos.");
  }
  try {
    const garden = new Garden({
      name,
      location: {
        type: "Point",
        coordinates,
      },
      panoramicImage,
    });
    await garden.save();
    res.redirect("/gardens");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao guardar o jardim");
  }
});

// Rota para listar jardins e preparar a adição de árvores
app.get("/gardens/manage", async (req, res) => {
  try {
    const gardens = await Garden.find().populate("trees");
    const trees = await TreeSpecies.find();
    const markedTrees = trees.map((tree) => {
      let isInGarden = gardens.some((garden) =>
        garden.trees.some((gardenTree) => gardenTree.equals(tree._id))
      );
      return {
        ...tree._doc,
        isInGarden: isInGarden,
      };
    });

    const errorMessage = req.flash("error")[0] || "";
    const action = req.flash("action")[0] || "";

    res.render("gardens/manage-gardens", {
      gardens,
      trees: markedTrees,
      activePage: "gardens/manage-gardens",
      errorMessage,
      action,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao carregar a página de gestão de jardins");
  }
});

// Rota para adicionar árvores ao jardim
app.post("/gardens/:gardenId/add-trees", async (req, res) => {
  const { gardenId } = req.params;
  let { treeIds } = req.body;
  treeIds = Array.isArray(treeIds) ? treeIds : [treeIds];

  try {
    const garden = await Garden.findById(gardenId);

    treeIds.forEach((treeId) => {
      if (!garden.trees.includes(treeId)) {
        garden.trees.push(treeId);
      }
    });

    await garden.save();
    res.redirect("/gardens/manage");
  } catch (error) {
    console.error("Erro ao adicionar árvores ao jardim:", error);
    req.flash("error", "Erro ao adicionar árvores ao jardim.");
    req.flash("action", "addition");
    res.redirect("/gardens/manage");
  }
});

// Rota para remover árvores do jardim
app.post("/gardens/:gardenId/remove-trees", async (req, res) => {
  const { gardenId } = req.params;
  let { treeIdsToRemove } = req.body;

  if (
    !treeIdsToRemove ||
    (Array.isArray(treeIdsToRemove) && treeIdsToRemove.length === 0)
  ) {
    req.flash("action", "removal");
    req.flash("error", "Nenhuma árvore foi selecionada para remoção.");
    return res.redirect("/gardens/manage");
  }

  if (!Array.isArray(treeIdsToRemove)) {
    treeIdsToRemove = [treeIdsToRemove].filter(Boolean);
  }

  try {
    await Garden.findByIdAndUpdate(gardenId, {
      $pull: { trees: { $in: treeIdsToRemove } },
    });
    res.redirect("/gardens/manage");
  } catch (error) {
    console.error("Erro ao remover árvores:", error);
    req.flash("action", "removal");
    req.flash("error", "Erro ao remover árvores. Por favor, tente novamente.");
    res.redirect("/gardens/manage");
  }
});

// Rota para editar jardins
app.get("/gardens/:gardenId/edit", isAdmin, async (req, res) => {
  try {
    const { gardenId } = req.params;
    const garden = await Garden.findById(gardenId);
    if (!garden) {
      return res.status(404).send("Jardim não encontrado.");
    }
    res.render("./gardens/edit-gardens", { garden });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao buscar jardim para edição.");
  }
});

// Rota Post para processar a Edição de jardins
app.post("/gardens/:gardenId/edit", async (req, res) => {
  const { name, longitude, latitude, panoramicImage } = req.body; // Adiciona o campo panoramicImage
  const coordinates = [parseFloat(longitude), parseFloat(latitude)];
  const { gardenId } = req.params;

  try {
    await Garden.findByIdAndUpdate(gardenId, {
      name,
      location: { type: "Point", coordinates },
      panoramicImage,
    });
    res.redirect("/gardens");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao atualizar o jardim.");
  }
});

// Rota GET para detalhes do jardim
app.get("/gardens/:gardenId", async (req, res) => {
  const { gardenId } = req.params;

  try {
    const garden = await Garden.findById(gardenId).populate("trees");

    if (!garden) {
      return res.status(404).send("Jardim não encontrado");
    }

    res.render("./gardens/detail", { garden });
  } catch (error) {
    console.error("Erro ao buscar detalhes do jardim:", error);
    res.status(500).send("Erro ao processar a solicitação");
  }
});

// Rota Post para remover um jardim
app.post("/gardens/:gardenId/delete", isAdmin, async (req, res) => {
  try {
    const { gardenId } = req.params;
    await Garden.findByIdAndDelete(gardenId);
    res.redirect("/gardens");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao remover o jardim.");
  }
});

// Rota para a vista panorâmica de um jardim específico
app.get("/gardens/:id/panoramic-garden", async (req, res) => {
  try {
    const garden = await Garden.findById(req.params.id);
    if (!garden) {
      return res.status(404).send("Jardim não encontrado");
    }
    const panoramicImageUrl = garden.panoramicImage;
    res.render("gardens/panoramic-garden", { panoramicImageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao buscar a vista panorâmica do jardim.");
  }
});

// Rota para listar espécies
app.get("/species", async (req, res) => {
  let perPage = 9;
  let page = req.query.page || 1;

  try {
    const totalItems = await TreeSpecies.countDocuments();
    const species = await TreeSpecies.find()
      .skip(perPage * page - perPage)
      .limit(perPage);

    res.render("species/index", {
      species: species,
      current: page,
      pages: Math.ceil(totalItems / perPage),
      activePage: "species",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao buscar espécies.");
  }
});

// Rota para a pesquisa de espécies
app.get("/species/search", speciesController.searchSpecies);

// Rota para o formulário de adição de uma nova espécie
app.get("/species/add", isAdmin, (req, res) => {
  res.render("./species/add-species");
});

// Rota para visualizar uma espécie individualmente
app.get("/species/:id", async (req, res) => {
  try {
    const speciesId = req.params.id;
    const species = await TreeSpecies.findById(speciesId);
    if (!species) {
      return res.status(404).send("Espécie não encontrada");
    }
    res.render("species/detail", { species });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao procurar a espécie");
  }
});

// Rota POST para adicionar uma nova espécie
app.post("/species", async (req, res) => {
  try {
    const newSpecies = new TreeSpecies(req.body);
    await newSpecies.save();
    res.redirect("/species");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao adicionar a espécie");
  }
});

// Rota para editar uma espécie específica
app.get("/species/edit/:id", isAdmin, async (req, res) => {
  try {
    const specie = await TreeSpecies.findById(req.params.id);
    if (!specie) {
      return res.status(404).send("Espécie não encontrada");
    }
    res.render("species/edit-species", { specie });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao aceder à espécie");
  }
});

//Rota para atualizar uma espécie específica
app.patch("/species/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSpecie = await TreeSpecies.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedSpecie) {
      return res.status(404).send("Espécie não encontrada.");
    }
    res.redirect("/species");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao atualizar a espécie.");
  }
});

// EXCLUIR uma espécie arbórea pelo ID
app.get("/species/delete/:id", isAdmin, async (req, res) => {
  try {
    const deleteResult = await TreeSpecies.findByIdAndDelete(req.params.id);
    if (!deleteResult) {
      return res.status(404).send("Espécie não encontrada.");
    }
    res.redirect("/species");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao excluír a espécie: " + error.message);
  }
});

// READ - Listar todos os vídeos
app.get("/videos", async (req, res) => {
  try {
    const videos = await Video.find();
    res.render("./videos/index", { videos, activePage: videos, isAdmin });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro ao buscar vídeos.");
  }
});

// Rota para o formulário de adição de um novo video
app.get("/videos/add", isAdmin, (req, res) => {
  res.render("./videos/add");
});

// CREATE - Adicionar um novo vídeo
app.post("/videos", async (req, res) => {
  try {
    const newVideo = new Video(req.body);
    await newVideo.save();
    res.redirect("/videos");
  } catch (error) {
    res.status(500).send(error);
  }
});

// Formulário para editar um vídeo
app.get("/videos/edit/:id", isAdmin, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    res.render("videos/edit", { video });
  } catch (error) {
    res.status(500).send(error);
  }
});
// Rota para atualizar um vídeo específico
app.put("/videos/:id", async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, req.body);
    res.redirect("/videos");
  } catch (error) {
    res.status[500].send(error);
  }
});

// DELETE - Remover um vídeo
app.get("/videos/delete/:id", isAdmin, async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.redirect("/videos");
  } catch (error) {
    res.status[500].send(error);
  }
});

// READ - Rota para listar todos os pontos de interesse
app.get("/points-of-interest", async (req, res) => {
  try {
    const points = await PointOfInterest.find();
    res.render("points-of-interest/index", {
      points,
      activePage: "points-of-interest",
    });
  } catch (error) {
    console.error(error);
    res.status[500].send("Erro ao buscar pontos de interesse.");
  }
});

// Rota para mostrar o formulário adicionar novo ponto de interesse
app.get("/points-of-interest/add", (req, res) => {
  res.render("./points-of-interest/add");
});

// Rota para processar os dados do formulário de adição
app.post("/points-of-interest", async (req, res) => {
  try {
    const { name, latitude, longitude, description, additionalInfo } = req.body;
    const newPoint = new PointOfInterest({
      name,
      latitude,
      longitude,
      description,
      additionalInfo,
    });

    const qrCodeText = `Name: ${name}\nLatitude: ${latitude}\nLongitude: ${longitude}\nDescription: ${description}\nAdditional Info: ${additionalInfo}`;

    const qrCodeData = await QRCode.toDataURL(qrCodeText);

    newPoint.qrCodeData = qrCodeData;
    await newPoint.save();

    res.redirect("/points-of-interest");
  } catch (error) {
    console.error("Erro ao guardar o novo ponto de interesse:", error);
    res.status[500].send("Erro ao adicionar novo ponto de interesse.");
  }
});

// rota: view detail
app.get("/points-of-interest/detail/:id", async (req, res) => {
  try {
    const point = await PointOfInterest.findById(req.params.id);
    if (!point) {
      return res.status(404).send("Ponto de interesse não encontrado.");
    }
    res.render("points-of-interest/detail", { point });
  } catch (error) {
    res.status[500].send(error);
  }
});

// Rota para editar um ponto de interesse
app.get("/points-of-interest/edit/:id", async (req, res) => {
  try {
    const point = await PointOfInterest.findById(req.params.id);
    res.render("points-of-interest/edit", { point });
  } catch (error) {
    res.status[500].send(error);
  }
});

// Rota para atualizar um ponto de interesse
app.put("/points-of-interest/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, description, additionalInfo } = req.body;

    const currentPoint = await PointOfInterest.findById(id);

    let qrCodeData = currentPoint.qrCodeData;

    if (additionalInfo && additionalInfo !== currentPoint.additionalInfo) {
      const qrCodeText = `Name: ${name}\nLatitude: ${latitude}\nLongitude: ${longitude}\nDescription: ${description}\nAdditional Info: ${additionalInfo}`;
      qrCodeData = await QRCode.toDataURL(qrCodeText);
    }

    await PointOfInterest.findByIdAndUpdate(
      id,
      {
        name,
        latitude,
        longitude,
        description,
        additionalInfo,
        qrCodeData,
      },
      { new: true }
    );

    res.redirect("/points-of-interest");
  } catch (error) {
    console.error("Erro ao atualizar o ponto de interesse:", error);
    res.status[500].send("Erro ao atualizar o ponto de interesse.");
  }
});

// DELETE - Rota para excluír um ponto de interesse
app.get("/points-of-interest/delete/:id", async (req, res) => {
  try {
    await PointOfInterest.findByIdAndDelete(req.params.id);
    res.redirect("/points-of-interest");
  } catch (error) {
    res.status[500].send(error);
  }
});

// Rota para mostrar o form
app.get("/plants/identify-plant", (req, res) => {
  res.render("plants/identify-plant");
});

const PLANTNET_API_KEY = "2b10Sr6MNOJZrH2bM09GfBVWe";

// Rota para manusear a submissão do form
app.post(
  "/plants/identify-plant",
  upload.single("plantImage"),
  async (req, res) => {
    if (!req.file) {
      res
        .status(400)
        .render("plants/error", { message: "Nenhuma imagem foi enviada." });
      return;
    }

    let formData = new FormData();
    formData.append("organs", "leaf");
    formData.append("images", fs.createReadStream(req.file.path));

    try {
      const response = await axios.post(
        `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_API_KEY}`,
        formData,
        { headers: formData.getHeaders() }
      );

      res.render("plants/plant-results", { results: response.data });
    } catch (error) {
      console.error(error);
      res.status(500).render("plants/error", {
        message: error.response
          ? error.response.data.message
          : "Erro ao identificar a planta",
      });
    } finally {
      fs.unlinkSync(req.file.path);
    }
  }
);

// Rota acesso negado que mostra uma mensagem se através do url se tentar aceder à rota protegida
app.get("/acesso-negado", (req, res) => {
  res.render("./acessoNegado"); // Renderiza a view `acessoNegado.ejs`
});

app.listen(PORT, () => {
  console.log(`Servidor em execução na porta ${PORT}`);
});
