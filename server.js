const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const session = require("express-session");

const app = express();
const PORT = process.env.PORT || 3000;

const businessFile = path.join(__dirname, "data", "business.json");

const upload = multer({
  dest: path.join(__dirname, "public", "uploads")
});

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "timolo-business-secret-change-this",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false
  }
}));



function getBusiness() {
  return JSON.parse(fs.readFileSync(businessFile, "utf8"));
}

function saveBusiness(data) {
  fs.writeFileSync(
    businessFile,
    JSON.stringify(data, null, 2)
  );
}
function createSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
/* =========================
   LOGIN
========================= */

app.get("/login", (req, res) => {
  if (req.session.loggedIn) {
    return res.redirect("/");
  }

  res.render("login");
});

app.post("/login", (req, res) => {
  const usersFile = path.join(__dirname, "data", "users.json");
  const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));

  const username = (req.body.username || "").trim().toLowerCase();
  const password = req.body.password || "";

  const passwordHash = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  const user = users.find(
    u => u.username === username && u.passwordHash === passwordHash
  );

  if (!user) {
    return res.status(401).send(`
      <h2>Username au password sio sahihi.</h2>
      <a href="/login">Rudi Login</a>
    `);
  }

  req.session.loggedIn = true;
  req.session.username = user.username;
  req.session.businessSlug = user.businessSlug;

  res.redirect("/");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

/* =========================
   REGISTER
========================= */

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const usersFile = path.join(__dirname, "data", "users.json");
  const businessesDir = path.join(__dirname, "data", "businesses");

  const users = JSON.parse(fs.readFileSync(usersFile, "utf8"));

  const businessName = (req.body.businessName || "").trim();
  const username = (req.body.username || "").trim().toLowerCase();
  const password = req.body.password || "";
  const whatsapp = (req.body.whatsapp || "").trim();
  const location = (req.body.location || "").trim();

  if (!businessName || !username || !password || !whatsapp || !location) {
    return res.status(400).send("Tafadhali jaza sehemu zote.");
  }

  if (!/^[a-z0-9_-]+$/.test(username)) {
    return res.status(400).send("Username itumie herufi, namba, _ au - tu.");
  }

  if (users.some(user => user.username === username)) {
    return res.status(400).send("Username tayari imetumika.");
  }

  const slug = createSlug(businessName);

  const existingBusiness = fs.existsSync(
    path.join(businessesDir, slug + ".json")
  );

  if (existingBusiness) {
    return res.status(400).send("Jina la biashara tayari limetumika.");
  }

  const passwordHash = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  users.push({
    username,
    passwordHash,
    businessSlug: slug
  });

  const business = {
    name: businessName,
    tagline: "Karibu kwenye biashara yetu",
    location,
    whatsapp,
    slug,
    products: []
  };

  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  fs.writeFileSync(
    path.join(businessesDir, slug + ".json"),
    JSON.stringify(business, null, 2)
  );

  res.send(`
    <h2>Usajili umefanikiwa! 🎉</h2>
    <p>Biashara yako imetengenezwa.</p>
    <p>Link yako:</p>
    <a href="/b/${slug}">/b/${slug}</a>
    <br><br>
    <a href="/login">Ingia kwenye account yako</a>
  `);
});

/* =========================
   DASHBOARD
========================= */

app.get("/", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const businessFile = path.join(
    __dirname,
    "data",
    "businesses",
    req.session.businessSlug + ".json"
  );

  if (!fs.existsSync(businessFile)) {
    return res.status(404).send("Business account not found");
  }

  const business = JSON.parse(
    fs.readFileSync(businessFile, "utf8")
  );

  res.render("index", { business });
});

/* =========================
   CUSTOMIZE BUSINESS
========================= */

app.get("/customize", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const businessFile = path.join(
    __dirname,
    "data",
    "businesses",
    req.session.businessSlug + ".json"
  );

  const business = JSON.parse(
    fs.readFileSync(businessFile, "utf8")
  );

  res.render("customize", { business });
});

app.post("/customize", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const oldSlug = req.session.businessSlug;

  const oldFile = path.join(
    __dirname,
    "data",
    "businesses",
    oldSlug + ".json"
  );

  const business = JSON.parse(
    fs.readFileSync(oldFile, "utf8")
  );

  const newSlug = createSlug(req.body.name);

  business.name = req.body.name;
  business.slug = newSlug;
  business.tagline = req.body.tagline;
  business.location = req.body.location;
  business.whatsapp = req.body.whatsapp;

  const newFile = path.join(
    __dirname,
    "data",
    "businesses",
    newSlug + ".json"
  );

  fs.writeFileSync(
    newFile,
    JSON.stringify(business, null, 2)
  );

  if (oldSlug !== newSlug && fs.existsSync(oldFile)) {
    fs.unlinkSync(oldFile);
  }

  req.session.businessSlug = newSlug;

  res.redirect("/");
});
/* =========================
   PUBLIC BUSINESS PAGE
========================= */

app.get("/b/:slug", (req, res) => {
  const businessFile = path.join(
    __dirname,
    "data",
    "businesses",
    req.params.slug + ".json"
  );

  if (!fs.existsSync(businessFile)) {
    return res.status(404).send("Business not found");
  }

  const business = JSON.parse(
    fs.readFileSync(businessFile, "utf8")
  );

  res.render("public-business", { business });
});
/* =========================
   PRODUCTS
========================= */

app.get("/products", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const businessFile = path.join(
    __dirname,
    "data",
    "businesses",
    req.session.businessSlug + ".json"
  );

  const business = JSON.parse(
    fs.readFileSync(businessFile, "utf8")
  );

  res.render("products", { business });
});

/* =========================
   ADD PRODUCT
========================= */

app.post("/products/add", upload.single("image"), (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const businessFile = path.join(
    __dirname,
    "data",
    "businesses",
    req.session.businessSlug + ".json"
  );

  const business = JSON.parse(
    fs.readFileSync(businessFile, "utf8")
  );

  business.products.push({
    name: req.body.name,
    price: req.body.price,
    message: req.body.message,
    image: req.file
      ? "/uploads/" + req.file.filename
      : ""
  });

  fs.writeFileSync(
    businessFile,
    JSON.stringify(business, null, 2)
  );

  res.redirect("/products");
});

/* =========================
   EDIT PRODUCT FORM
========================= */

app.get("/products/edit/:index", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const businessFile = path.join(
    __dirname,
    "data",
    "businesses",
    req.session.businessSlug + ".json"
  );

  const business = JSON.parse(
    fs.readFileSync(businessFile, "utf8")
  );

  const index = Number(req.params.index);

  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= business.products.length
  ) {
    return res.redirect("/products");
  }

  res.render("edit-product", {
    product: business.products[index],
    index
  });
});

/* =========================
   UPDATE PRODUCT
========================= */

app.post(
  "/products/edit/:index",
  upload.single("image"),
  (req, res) => {
    if (!req.session.loggedIn) {
      return res.redirect("/login");
    }

    const businessFile = path.join(
      __dirname,
      "data",
      "businesses",
      req.session.businessSlug + ".json"
    );

    const business = JSON.parse(
      fs.readFileSync(businessFile, "utf8")
    );

    const index = Number(req.params.index);

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= business.products.length
    ) {
      return res.redirect("/products");
    }

    const oldProduct = business.products[index];

    business.products[index] = {
      ...oldProduct,
      name: req.body.name,
      price: req.body.price,
      message: req.body.message,
      image: req.file
        ? "/uploads/" + req.file.filename
        : oldProduct.image || ""
    };

    fs.writeFileSync(
      businessFile,
      JSON.stringify(business, null, 2)
    );

    res.redirect("/products");
  }
);

/* =========================
   DELETE PRODUCT
========================= */

app.post("/products/delete/:index", (req, res) => {
  if (!req.session.loggedIn) {
    return res.redirect("/login");
  }

  const businessFile = path.join(
    __dirname,
    "data",
    "businesses",
    req.session.businessSlug + ".json"
  );

  const business = JSON.parse(
    fs.readFileSync(businessFile, "utf8")
  );

  const index = Number(req.params.index);

  if (
    Number.isInteger(index) &&
    index >= 0 &&
    index < business.products.length
  ) {
    business.products.splice(index, 1);

    fs.writeFileSync(
      businessFile,
      JSON.stringify(business, null, 2)
    );
  }

  res.redirect("/products");
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Timolo Business running on port ${PORT}`);
});
