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
//const NEO4J_URI      = "neo4j+s://ab3aacfd.databases.neo4j.io";
//const NEO4J_USER     = "ab3aacfd";
//const NEO4J_PASSWORD = //"HjqzjpmNAjms9A8xbjsZIXmBY_lG2DEtiUNXiSX9swE";
//const NEO4J_DATABASE = "ab3aacfd";

const NEO4J_URI      = process.env.NEO4J_URI;
const NEO4J_USER     = process.env.NEO4J_USER;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE;

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
    // First check if admin
    const adminResult = await session.run(
      `MATCH (a:Admin {username: $username, password: $password}) 
       RETURN a.username AS username, a.role AS role`,
      { username, password }
    );

    if (adminResult.records.length > 0) {
      return res.json(adminResult.records[0].toObject());
    }

    // Check if student already exists
    const studentResult = await session.run(
      `MATCH (s:Student {username: $username, password: $password}) 
       RETURN s.username AS username, s.role AS role`,
      { username, password }
    );

    if (studentResult.records.length > 0) {
      return res.json(studentResult.records[0].toObject());
    }

    // NEW USER — auto create student node in Neo4j
    await session.run(
      `CREATE (:Student {username: $username, password: $password, role: "student"})`,
      { username, password }
    );

    return res.json({ username, role: "student" });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    await session.close();
  }
});

// ── GET ALL COMPLAINTS ─────────────────────────────
app.post("/api/complaints", async (req, res) => {
  const { username, category, description, date } = req.body;
  const id = Date.now().toString();
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (s:Student {username: $username})
       CREATE (c:Complaint {
         id: $id,
         category: $category,
         description: $description,
         status: "Pending",
         date: $date
       })
       CREATE (s)-[:SUBMITTED]->(c)
       RETURN c`,
      { username, category, description, date, id }
    );

    // Check if student was actually found
    if (result.records.length === 0) {
      return res.status(400).json({ error: "Student not found in database" });
    }

    res.json({ success: true, id });

  } catch (err) {
    console.error("Complaint error:", err);
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
//app.listen(5000, () => {
//  console.log("✅ Server running at http://localhost:5000");
//});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});