// createAdmin.js
require('dotenv').config(); // This protects your password!
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Now it uses the secret from .env!
const url = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const client = new MongoClient(url);
// ... keep the rest of your run() function exactly the same ...

async function run() {
  try {
    await client.connect();
    const db = client.db("ATS");
    const users = db.collection("users");

    const email = "admin@local";
    const plain = "adminpass";

    // check existing
    const exists = await users.findOne({ email });
    if (exists) {
      console.log("L'utilisateur admin existe déjà :", email);
      return process.exit(0);
    }

    const hashed = await bcrypt.hash(plain, 10);
    await users.insertOne({ nom: "Admin", email, password: hashed, role: "admin", createdAt: new Date() });
    console.log("Admin créé:", email, "mot de passe:", plain);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

run();
