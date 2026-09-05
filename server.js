const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;

const businessFile = path.join(__dirname, "data", "business.json");

const upload = multer({
  dest: path.join(__dirname, "public", "uploads")
});

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

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
   DASHBOARD
========================= */

app.get("/", (req, res) => {
  const business = getBusiness();
  res.render("index", { business });
});

/* =========================
   CUSTOMIZE BUSINESS
========================= */

app.get("/customize", (req, res) => {
  const business = getBusiness();
  res.render("customize", { business });
});

app.post("/customize", (req, res) => {
  const business = getBusiness();

  business.name = req.body.name;
business.slug = createSlug(req.body.name);
business.tagline = req.body.tagline;
business.location = req.body.location;
business.whatsapp = req.body.whatsapp;

  saveBusiness(business);

  res.redirect("/");
});
/* =========================
   PUBLIC BUSINESS PAGE
========================= */

app.get("/b/:slug", (req, res) => {
  const business = getBusiness();

  if (business.slug !== req.params.slug) {
    return res.status(404).send("Business not found");
  }

  res.render("public-business", { business });
});
/* =========================
   PRODUCTS
========================= */

app.get("/products", (req, res) => {
  const business = getBusiness();
  res.render("products", { business });
});

/* =========================
   ADD PRODUCT
========================= */

app.post("/products/add", upload.single("image"), (req, res) => {
  const business = getBusiness();

  business.products.push({
    name: req.body.name,
    price: req.body.price,
    message: req.body.message,
    image: req.file
      ? "/uploads/" + req.file.filename
      : ""
  });

  saveBusiness(business);

  res.redirect("/products");
});

/* =========================
   EDIT PRODUCT FORM
========================= */

app.get("/products/edit/:index", (req, res) => {
  const business = getBusiness();
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
    const business = getBusiness();
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

    saveBusiness(business);

    res.redirect("/products");
  }
);

/* =========================
   DELETE PRODUCT
========================= */

app.post("/products/delete/:index", (req, res) => {
  const business = getBusiness();
  const index = Number(req.params.index);

  if (
    Number.isInteger(index) &&
    index >= 0 &&
    index < business.products.length
  ) {
    business.products.splice(index, 1);
    saveBusiness(business);
  }

  res.redirect("/products");
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Timolo Business running on port ${PORT}`);
});
