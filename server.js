const express = require("express");
const neo4j = require("neo4j-driver");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// Serve your HTML files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// ── REPLACE THESE WITH YOUR AURADB CREDENTIALS ──
const NEO4J_URI      = "neo4j+s://ab3aacfd.databases.neo4j.io";
const NEO4J_USER     = "ab3aacfd";
const NEO4J_PASSWORD = "HjqzjpmNAjms9A8xbjsZIXmBY_lG2DEtiUNXiSX9swE";
const NEO4J_DATABASE = "ab3aacfd";
// ─────────────────────────────────────────────────

const driver = neo4j.driver(
  NEO4J_URI,
  neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
  { database: NEO4J_DATABASE }
);

// ── LOGIN ──────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (u)
       WHERE (u:Student OR u:Admin)
       AND u.username = $username
       AND u.password = $password
       RETURN u.username AS username, u.role AS role`,
      { username, password }
    );

    if (result.records.length === 0) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const user = result.records[0].toObject();
    res.json(user);

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ── GET ALL COMPLAINTS ─────────────────────────────
app.get("/api/complaints", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (s)-[:SUBMITTED]->(c:Complaint)
       RETURN c.id AS id,
              s.username AS username,
              c.category AS category,
              c.description AS description,
              c.status AS status,
              c.date AS date
       ORDER BY c.date DESC`
    );

    const complaints = result.records.map(r => r.toObject());
    res.json(complaints);

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ── SUBMIT COMPLAINT ───────────────────────────────
app.post("/api/complaints", async (req, res) => {
  const { username, category, description, date } = req.body;
  const id = Date.now().toString();
  const session = driver.session();

  try {
    await session.run(
      `MATCH (s:Student {username: $username})
       CREATE (c:Complaint {
         id: $id,
         category: $category,
         description: $description,
         status: "Pending",
         date: $date
       })
       CREATE (s)-[:SUBMITTED]->(c)`,
      { username, category, description, date, id }
    );

    res.json({ success: true, id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ── UPDATE COMPLAINT STATUS ────────────────────────
app.put("/api/complaints/:id", async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  const session = driver.session();

  try {
    await session.run(
      `MATCH (c:Complaint {id: $id})
       SET c.status = $status`,
      { id, status }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ── DELETE COMPLAINT ───────────────────────────────
app.delete("/api/complaints/:id", async (req, res) => {
  const { id } = req.params;
  const session = driver.session();

  try {
    await session.run(
      `MATCH (c:Complaint {id: $id}) DETACH DELETE c`,
      { id }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ── START SERVER ───────────────────────────────────
app.listen(5000, () => {
  console.log("✅ Server running at http://localhost:5000");
});