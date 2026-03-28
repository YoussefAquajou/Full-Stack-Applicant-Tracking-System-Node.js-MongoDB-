// server.js (sécurisé : JWT + rôles)
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
// Serve static files from the Frontend folder
app.use(express.static(path.join(__dirname, '../Frontend')));
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret"; // mettre en prod via env
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";

const client = new MongoClient(MONGO_URL);
let db;

function authenticateToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: "Token manquant" });
  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token invalide" });
  }
}

// allowRoles('recruteur','manager',...)
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Non authentifié" });
    if (roles.includes(req.user.role) || req.user.role === 'admin') return next();
    return res.status(403).json({ error: "Accès refusé (rôle insuffisant)" });
  };
}

async function start() {
  try {
    await client.connect();
    db = client.db("ATS");
    console.log("✅ MongoDB connecté avec succès");

    // Servir index.html et statiques
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
    app.use(express.static(__dirname));

    // ---------- Auth ----------
    app.post('/auth/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "email et password requis" });

        const user = await db.collection("users").findOne({ email });
        if (!user) return res.status(401).json({ error: "Utilisateur inconnu" });

        const ok = await bcrypt.compare(password, user.password || "");
        if (!ok) return res.status(401).json({ error: "Mot de passe incorrect" });

        const token = jwt.sign({ id: user._id.toString(), email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, role: user.role, email: user.email });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur login" });
      }
    });

    // Créer utilisateur (seul admin)
    app.post('/auth/register', authenticateToken, allowRoles('admin'), async (req, res) => {
      try {
        const { nom, email, password, role } = req.body;
        if (!email || !password || !role) return res.status(400).json({ error: "email/password/role requis" });
        const users = db.collection("users");
        if (await users.findOne({ email })) return res.status(400).json({ error: "Email déjà utilisé" });
        const hashed = await bcrypt.hash(password, 10);
        await users.insertOne({ nom: nom || email.split('@')[0], email, password: hashed, role, createdAt: new Date() });
        res.json({ message: "Utilisateur créé" });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Erreur création utilisateur" });
      }
    });

    // Me (infos utilisateur connecté)
    app.get('/me', authenticateToken, async (req, res) => {
      res.json({ id: req.user.id, email: req.user.email, role: req.user.role });
    });

    // ---------- API Applications (protégées) ----------
    // Voir candidatures (recruteur/manager/admin)
    app.get('/applications', authenticateToken, allowRoles('recruteur', 'manager'), async (req, res) => {
      try {
        const apps = await db.collection("applications").find().toArray();
        res.json(apps);
      } catch (err) { res.status(500).json({ error: "Erreur GET" }); }
    });

    // Ajouter candidature (recruteur/admin)
    app.post('/applications', authenticateToken, allowRoles('recruteur'), async (req, res) => {
      try {
        const data = req.body;
        data.status = "reçu";
        data.date_candidature = new Date();
        data.history = [{ from: null, to: "reçu", by: req.user.email, date: new Date() }];
        const result = await db.collection("applications").insertOne(data);
        res.json({ message: "Ajouté", id: result.insertedId });
      } catch (err) { res.status(500).json({ error: "Erreur POST" }); }
    });

    // Changer statut (recruteur/admin)
    app.put('/applications/:id/status', authenticateToken, allowRoles('recruteur'), async (req, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        const appData = await db.collection("applications").findOne({ _id: new ObjectId(id) });
        if (!appData) return res.status(404).json({ error: "Candidature introuvable" });

        await db.collection("applications").updateOne(
          { _id: new ObjectId(id) },
          {
            $set: { status },
            $push: { history: { from: appData.status || null, to: status, by: req.user.email, date: new Date() } }
          }
        );
        res.json({ message: "Mis à jour" });
      } catch (err) { res.status(500).json({ error: "Erreur PUT" }); }
    });

    // Recherche (recruteur/manager/admin)
    app.get('/search', authenticateToken, allowRoles('recruteur', 'manager'), async (req, res) => {
      try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.source) filter.source = req.query.source;
        const results = await db.collection("applications").find(filter).toArray();
        res.json(results);
      } catch (e) { res.status(500).json({ error: "Erreur search" }); }
    });

    // KPI (manager/admin)
    app.get('/kpi', authenticateToken, allowRoles('manager'), async (req, res) => {
      try {
        const stats = await db.collection("applications").aggregate([
          { $group: { _id: "$status", total: { $sum: 1 } } }
        ]).toArray();
        res.json(stats);
      } catch (e) { res.status(500).json({ error: "Erreur KPI" }); }
    });

    // 404 final
    app.use((req, res) => {
      res.status(404).send("Page ou API non trouvée");
    });

    app.listen(3000, () => {
      console.log("🚀 Serveur prêt : http://localhost:3000");
    });

  } catch (err) {
    console.error("❌ Erreur de connexion MongoDB:", err.message);
  }
}

start();
