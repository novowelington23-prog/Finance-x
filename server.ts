import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("finance.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT,
    amount REAL,
    category TEXT,
    type TEXT, -- 'income' or 'expense'
    date TEXT,
    raw_message TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/transactions", (req, res) => {
    const transactions = db.prepare("SELECT * FROM transactions ORDER BY date DESC").all();
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const { description, amount, category, type, date, raw_message } = req.body;
    const info = db.prepare(
      "INSERT INTO transactions (description, amount, category, type, date, raw_message) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(description, amount, category, type, date || new Date().toISOString(), raw_message);
    res.json({ id: info.lastInsertRowid });
  });

  app.get("/api/stats", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense
      FROM transactions
    `).get();
    res.json(stats);
  });

  app.get("/api/report/weekly", (req, res) => {
    // Get transactions from the last 7 days
    const transactions = db.prepare(`
      SELECT * FROM transactions 
      WHERE date >= date('now', '-7 days')
      ORDER BY date DESC
    `).all() as any[];

    if (transactions.length === 0) {
      return res.status(404).json({ error: "Nenhuma transação encontrada nos últimos 7 dias." });
    }

    // Generate CSV
    const headers = "ID,Descricao,Valor,Categoria,Tipo,Data\n";
    const rows = transactions.map(t => 
      `${t.id},"${t.description}",${t.amount},"${t.category}",${t.type},${t.date}`
    ).join("\n");

    const csv = headers + rows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=relatorio_semanal_finance_x.csv');
    res.send(csv);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
