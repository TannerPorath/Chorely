import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ DATABASE SETUP ============
const DATA_DIR = process.env.DATA_DIR || '/data';
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'chorely.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS parents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    pin TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kids (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    color TEXT NOT NULL,
    age INTEGER NOT NULL,
    weekly_allowance REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chores (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    value REAL NOT NULL,
    assigned_to TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    is_required_for_extras INTEGER NOT NULL DEFAULT 0,
    max_claimers INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES kids(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS completions (
    id TEXT PRIMARY KEY,
    chore_id TEXT NOT NULL,
    kid_id TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chore_id) REFERENCES chores(id) ON DELETE CASCADE,
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_completions_kid_date ON completions(kid_id, date);
  CREATE INDEX IF NOT EXISTS idx_completions_status ON completions(status);
  CREATE INDEX IF NOT EXISTS idx_completions_chore_date ON completions(chore_id, date);

  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    kid_id TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    target REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    kid_id TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );

  -- "Other" / custom chore entries. Kids or parents submit these free-form.
  -- Parent approves and sets the value. If icon is null, UI picks a default.
  CREATE TABLE IF NOT EXISTS custom_completions (
    id TEXT PRIMARY KEY,
    kid_id TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT,
    value REAL NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_goals_kid ON goals(kid_id);
  CREATE INDEX IF NOT EXISTS idx_payouts_kid_date ON payouts(kid_id, date);
  CREATE INDEX IF NOT EXISTS idx_custom_completions_kid_date ON custom_completions(kid_id, date);
  CREATE INDEX IF NOT EXISTS idx_custom_completions_status ON custom_completions(status);
`);

// ============ MIGRATION: make chores.assigned_to nullable if it isn't already ============
// SQLite can't ALTER COLUMN, so we check and rebuild the table if needed.
const choreColInfo = db.prepare("PRAGMA table_info(chores)").all();
const assignedToCol = choreColInfo.find(c => c.name === 'assigned_to');
if (assignedToCol && assignedToCol.notnull === 1) {
  console.log('Migrating chores table to allow shared (unassigned) chores...');
  db.exec(`
    BEGIN TRANSACTION;
    CREATE TABLE chores_new (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      value REAL NOT NULL,
      assigned_to TEXT,
      frequency TEXT NOT NULL DEFAULT 'daily',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES kids(id) ON DELETE CASCADE
    );
    INSERT INTO chores_new SELECT id, title, icon, value, assigned_to, frequency, created_at FROM chores;
    DROP TABLE chores;
    ALTER TABLE chores_new RENAME TO chores;
    COMMIT;
  `);
}

// ============ MIGRATION: add is_required_for_extras column if missing ============
const hasRequiredCol = db.prepare("PRAGMA table_info(chores)").all()
  .some(c => c.name === 'is_required_for_extras');
if (!hasRequiredCol) {
  console.log('Adding is_required_for_extras column to chores...');
  db.exec("ALTER TABLE chores ADD COLUMN is_required_for_extras INTEGER NOT NULL DEFAULT 0");
}

// ============ MIGRATION: add max_claimers column if missing ============
const hasMaxClaimersCol = db.prepare("PRAGMA table_info(chores)").all()
  .some(c => c.name === 'max_claimers');
if (!hasMaxClaimersCol) {
  console.log('Adding max_claimers column to chores...');
  db.exec("ALTER TABLE chores ADD COLUMN max_claimers INTEGER NOT NULL DEFAULT 1");
}

// ============ MIGRATION: add color column to parents if missing ============
const hasParentColorCol = db.prepare("PRAGMA table_info(parents)").all()
  .some(c => c.name === 'color');
if (!hasParentColorCol) {
  console.log('Adding color column to parents...');
  db.exec("ALTER TABLE parents ADD COLUMN color TEXT NOT NULL DEFAULT '#F59E0B'");
}

// ============ SEED DEFAULTS (only on first run) ============
const parentCount = db.prepare('SELECT COUNT(*) as c FROM parents').get().c;
if (parentCount === 0) {
  console.log('First run: seeding default family. Default PIN for parents is 1234 — change it in the Manage tab!');

  db.prepare('INSERT INTO parents (id, name, avatar, pin) VALUES (?, ?, ?, ?)').run('p_tanner', 'Tanner', '👨', '1234');
  db.prepare('INSERT INTO parents (id, name, avatar, pin) VALUES (?, ?, ?, ?)').run('p_kelsey', 'Kelsey', '👩', '1234');

  db.prepare('INSERT INTO kids (id, name, avatar, color, age, weekly_allowance) VALUES (?, ?, ?, ?, ?, ?)').run(
    'k_stella', 'Stella', '🦊', '#EC4899', 10, 5
  );
  db.prepare('INSERT INTO kids (id, name, avatar, color, age, weekly_allowance) VALUES (?, ?, ?, ?, ?, ?)').run(
    'k_axel', 'Axel', '🐻', '#3B82F6', 8, 4
  );
  db.prepare('INSERT INTO kids (id, name, avatar, color, age, weekly_allowance) VALUES (?, ?, ?, ?, ?, ?)').run(
    'k_nixon', 'Nixon', '🦁', '#F59E0B', 6, 3
  );

  // Some starter chores (assigned)
  const starterChores = [
    ['Make bed', '🛏️', 0.5, 'k_stella', 'daily'],
    ['Feed the dog', '🐕', 1, 'k_stella', 'daily'],
    ['Clean room', '🧹', 2, 'k_stella', 'weekly'],
    ['Set the table', '🍽️', 0.5, 'k_axel', 'daily'],
    ['Brush teeth', '🪥', 0.25, 'k_axel', 'daily'],
    ['Take out trash', '🗑️', 1, 'k_axel', 'weekly'],
    ['Put toys away', '🧸', 0.5, 'k_nixon', 'daily'],
    ['Brush teeth', '🪥', 0.25, 'k_nixon', 'daily'],
  ];
  const stmt = db.prepare('INSERT INTO chores (id, title, icon, value, assigned_to, frequency) VALUES (?, ?, ?, ?, ?, ?)');
  starterChores.forEach((c, i) => stmt.run(`c_seed_${i}`, ...c));

  // Extra Chores (shared pool, first come first served)
  const extraChores = [
    ['Unload dishwasher', '🍴', 1, null, 'daily'],
    ['Wipe down counters', '🧽', 0.75, null, 'daily'],
    ['Sweep kitchen', '🧹', 1, null, 'weekly'],
    ['Water the plants', '🪴', 0.5, null, 'weekly'],
  ];
  extraChores.forEach((c, i) => stmt.run(`c_extra_${i}`, ...c));
}

// ============ HELPERS ============
const genId = (prefix) => `${prefix}_${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

function rowToKid(r) {
  return { id: r.id, name: r.name, avatar: r.avatar, color: r.color, age: r.age, weeklyAllowance: r.weekly_allowance };
}
function rowToChore(r) {
  return {
    id: r.id, title: r.title, icon: r.icon, value: r.value,
    assignedTo: r.assigned_to, frequency: r.frequency,
    isRequiredForExtras: !!r.is_required_for_extras,
    maxClaimers: r.max_claimers || 1,
  };
}
function rowToCompletion(r) {
  return { id: r.id, choreId: r.chore_id, kidId: r.kid_id, date: r.date, status: r.status };
}
function rowToParent(r) {
  return { id: r.id, name: r.name, avatar: r.avatar, color: r.color || '#F59E0B' }; // never send PIN to client
}
function rowToGoal(r) {
  return { id: r.id, kidId: r.kid_id, title: r.title, icon: r.icon, target: r.target, createdAt: r.created_at, completedAt: r.completed_at };
}
function rowToPayout(r) {
  return { id: r.id, kidId: r.kid_id, amount: r.amount, note: r.note, date: r.date, createdAt: r.created_at };
}
function rowToCustomCompletion(r) {
  return {
    id: r.id, kidId: r.kid_id, title: r.title, icon: r.icon,
    value: r.value, date: r.date, status: r.status, createdAt: r.created_at,
  };
}

// ============ APP ============
const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend
const FRONTEND_DIR = path.join(__dirname, 'public');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
}

// ----- Auth: verify parent PIN -----
app.post('/api/parents/verify', (req, res) => {
  const { id, pin } = req.body;
  const p = db.prepare('SELECT * FROM parents WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'not found' });
  if (p.pin !== String(pin)) return res.status(401).json({ error: 'bad pin' });
  res.json({ ok: true, parent: rowToParent(p) });
});

// ----- Update parent PIN -----
app.put('/api/parents/:id/pin', (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!/^\d{4}$/.test(String(newPin))) return res.status(400).json({ error: 'new pin must be 4 digits' });
  const p = db.prepare('SELECT * FROM parents WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  if (p.pin !== String(currentPin)) return res.status(401).json({ error: 'bad current pin' });
  db.prepare('UPDATE parents SET pin = ? WHERE id = ?').run(String(newPin), req.params.id);
  res.json({ ok: true });
});

// ----- Family (everything in one shot) -----
app.get('/api/family', (req, res) => {
  const parents = db.prepare('SELECT * FROM parents ORDER BY created_at').all().map(rowToParent);
  const kids = db.prepare('SELECT * FROM kids ORDER BY created_at').all().map(rowToKid);
  const chores = db.prepare('SELECT * FROM chores ORDER BY created_at').all().map(rowToChore);
  const completions = db.prepare('SELECT * FROM completions ORDER BY date DESC').all().map(rowToCompletion);
  const goals = db.prepare('SELECT * FROM goals ORDER BY created_at').all().map(rowToGoal);
  const payouts = db.prepare('SELECT * FROM payouts ORDER BY date DESC').all().map(rowToPayout);
  const customCompletions = db.prepare('SELECT * FROM custom_completions ORDER BY date DESC').all().map(rowToCustomCompletion);
  res.json({ parents, kids, chores, completions, goals, payouts, customCompletions });
});

// ----- Parents CRUD -----
app.post('/api/parents', (req, res) => {
  const { name, avatar, pin, color } = req.body;
  if (!name || !avatar || !pin) return res.status(400).json({ error: 'missing fields' });
  if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'pin must be 4 digits' });
  const id = genId('p');
  db.prepare('INSERT INTO parents (id, name, avatar, pin, color) VALUES (?, ?, ?, ?, ?)').run(
    id, name, avatar, String(pin), color || '#F59E0B'
  );
  res.json(rowToParent(db.prepare('SELECT * FROM parents WHERE id = ?').get(id)));
});

app.put('/api/parents/:id', (req, res) => {
  const { name, avatar, color } = req.body;
  const p = db.prepare('SELECT * FROM parents WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE parents SET name = COALESCE(?, name), avatar = COALESCE(?, avatar), color = COALESCE(?, color) WHERE id = ?')
    .run(name ?? null, avatar ?? null, color ?? null, req.params.id);
  res.json(rowToParent(db.prepare('SELECT * FROM parents WHERE id = ?').get(req.params.id)));
});

app.delete('/api/parents/:id', (req, res) => {
  const remaining = db.prepare('SELECT COUNT(*) as c FROM parents').get().c;
  if (remaining <= 1) return res.status(400).json({ error: 'must have at least one parent' });
  db.prepare('DELETE FROM parents WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ----- Kids CRUD -----
app.post('/api/kids', (req, res) => {
  const { name, avatar, color, age, weeklyAllowance } = req.body;
  if (!name || !avatar || !color || age == null) return res.status(400).json({ error: 'missing fields' });
  const id = genId('k');
  db.prepare('INSERT INTO kids (id, name, avatar, color, age, weekly_allowance) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, name, avatar, color, parseInt(age), parseFloat(weeklyAllowance) || 0
  );
  res.json(rowToKid(db.prepare('SELECT * FROM kids WHERE id = ?').get(id)));
});

app.put('/api/kids/:id', (req, res) => {
  const { name, avatar, color, age, weeklyAllowance } = req.body;
  db.prepare('UPDATE kids SET name=?, avatar=?, color=?, age=?, weekly_allowance=? WHERE id=?').run(
    name, avatar, color, parseInt(age), parseFloat(weeklyAllowance) || 0, req.params.id
  );
  const r = db.prepare('SELECT * FROM kids WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(rowToKid(r));
});

app.delete('/api/kids/:id', (req, res) => {
  db.prepare('DELETE FROM kids WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ----- Chores CRUD -----
const VALID_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'];

app.post('/api/chores', (req, res) => {
  const { title, icon, value, assignedTo, frequency, isRequiredForExtras, maxClaimers } = req.body;
  if (!title || !icon || value == null) return res.status(400).json({ error: 'missing fields' });
  const freq = frequency || 'daily';
  if (!VALID_FREQUENCIES.includes(freq)) return res.status(400).json({ error: 'invalid frequency' });
  const mc = Math.max(1, parseInt(maxClaimers) || 1);
  // assignedTo === null means it's an Extra Chore (shared pool, anyone can claim)
  const id = genId('c');
  db.prepare('INSERT INTO chores (id, title, icon, value, assigned_to, frequency, is_required_for_extras, max_claimers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, title, icon, parseFloat(value), assignedTo || null, freq, isRequiredForExtras ? 1 : 0, mc
  );
  res.json(rowToChore(db.prepare('SELECT * FROM chores WHERE id = ?').get(id)));
});

app.put('/api/chores/:id', (req, res) => {
  const { title, icon, value, assignedTo, frequency, isRequiredForExtras, maxClaimers } = req.body;
  const existing = db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const freq = frequency || existing.frequency;
  if (!VALID_FREQUENCIES.includes(freq)) return res.status(400).json({ error: 'invalid frequency' });
  const mc = maxClaimers !== undefined ? Math.max(1, parseInt(maxClaimers) || 1) : existing.max_claimers;
  db.prepare('UPDATE chores SET title=?, icon=?, value=?, assigned_to=?, frequency=?, is_required_for_extras=?, max_claimers=? WHERE id=?').run(
    title, icon, parseFloat(value), assignedTo || null, freq,
    isRequiredForExtras !== undefined ? (isRequiredForExtras ? 1 : 0) : existing.is_required_for_extras,
    mc,
    req.params.id
  );
  const r = db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
  res.json(rowToChore(r));
});

app.delete('/api/chores/:id', (req, res) => {
  db.prepare('DELETE FROM chores WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ----- Completions CRUD -----
// Computes the inclusive start date string for a given chore's current period,
// based on its frequency. 'date' is a YYYY-MM-DD string (the completion date).
function periodStart(frequency, dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (frequency === 'daily') return dateStr;
  if (frequency === 'weekly') {
    const dow = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - dow);
    return d.toISOString().split('T')[0];
  }
  if (frequency === 'biweekly') {
    // Anchor biweekly periods to epoch week 0. Compute which biweekly slot the date falls in,
    // then find the Sunday that started that slot.
    const dow = d.getUTCDay();
    const weekStart = new Date(d);
    weekStart.setUTCDate(d.getUTCDate() - dow);
    // Days since a fixed Sunday reference (2023-01-01 was a Sunday)
    const REF = Date.UTC(2023, 0, 1);
    const weeksSinceRef = Math.floor((weekStart.getTime() - REF) / (7 * 86400000));
    const slotOffset = weeksSinceRef % 2;
    if (slotOffset > 0) weekStart.setUTCDate(weekStart.getUTCDate() - 7 * slotOffset);
    return weekStart.toISOString().split('T')[0];
  }
  if (frequency === 'monthly') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }
  return dateStr;
}

app.post('/api/completions', (req, res) => {
  const { choreId, kidId, date, status } = req.body;
  if (!choreId || !kidId || !date) return res.status(400).json({ error: 'missing fields' });

  const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId);
  if (!chore) return res.status(404).json({ error: 'chore not found' });

  // If the same kid already has a non-rejected claim for this chore in its current period, return it
  const windowStart = periodStart(chore.frequency, date);
  const mine = db.prepare(
    "SELECT * FROM completions WHERE chore_id=? AND kid_id=? AND date >= ? AND status IN ('pending','approved')"
  ).get(choreId, kidId, windowStart);
  if (mine) return res.json(rowToCompletion(mine));

  // For shared/Extra Chores (assigned_to IS NULL), enforce max_claimers within the period.
  if (chore.assigned_to === null) {
    const maxClaimers = chore.max_claimers || 1;
    const claimed = db.prepare(
      "SELECT * FROM completions WHERE chore_id=? AND date >= ? AND status IN ('pending','approved')"
    ).all(choreId, windowStart);
    if (claimed.length >= maxClaimers) {
      return res.status(409).json({
        error: 'fully claimed',
        claimCount: claimed.length,
        maxClaimers,
        completions: claimed.map(rowToCompletion),
      });
    }
  }

  const id = genId('comp');
  db.prepare('INSERT INTO completions (id, chore_id, kid_id, date, status) VALUES (?, ?, ?, ?, ?)').run(
    id, choreId, kidId, date, status || 'pending'
  );
  res.json(rowToCompletion(db.prepare('SELECT * FROM completions WHERE id = ?').get(id)));
});

app.put('/api/completions/:id', (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'bad status' });
  db.prepare('UPDATE completions SET status=? WHERE id=?').run(status, req.params.id);
  const r = db.prepare('SELECT * FROM completions WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(rowToCompletion(r));
});

app.delete('/api/completions/:id', (req, res) => {
  db.prepare('DELETE FROM completions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ----- Goals CRUD -----
app.post('/api/goals', (req, res) => {
  const { kidId, title, icon, target } = req.body;
  if (!kidId || !title || !icon || target == null) return res.status(400).json({ error: 'missing fields' });
  const id = genId('g');
  db.prepare('INSERT INTO goals (id, kid_id, title, icon, target) VALUES (?, ?, ?, ?, ?)').run(
    id, kidId, title, icon, parseFloat(target)
  );
  res.json(rowToGoal(db.prepare('SELECT * FROM goals WHERE id = ?').get(id)));
});

app.put('/api/goals/:id', (req, res) => {
  const { title, icon, target, completedAt } = req.body;
  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE goals SET title=?, icon=?, target=?, completed_at=? WHERE id=?').run(
    title ?? existing.title,
    icon ?? existing.icon,
    target != null ? parseFloat(target) : existing.target,
    completedAt !== undefined ? completedAt : existing.completed_at,
    req.params.id
  );
  res.json(rowToGoal(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id)));
});

app.delete('/api/goals/:id', (req, res) => {
  db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ----- Payouts CRUD -----
// Record that a parent paid a kid $amount (zeroes their unpaid balance by that amount)
app.post('/api/payouts', (req, res) => {
  const { kidId, amount, note, date } = req.body;
  if (!kidId || amount == null || !date) return res.status(400).json({ error: 'missing fields' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'amount must be positive' });
  const id = genId('pay');
  db.prepare('INSERT INTO payouts (id, kid_id, amount, note, date) VALUES (?, ?, ?, ?, ?)').run(
    id, kidId, amt, note || null, date
  );
  res.json(rowToPayout(db.prepare('SELECT * FROM payouts WHERE id = ?').get(id)));
});

app.delete('/api/payouts/:id', (req, res) => {
  db.prepare('DELETE FROM payouts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ----- Custom ("Other") completions -----
// Kid or parent submits a free-form chore description. Status starts pending.
// Parent approves and assigns a value via PUT.
app.post('/api/custom-completions', (req, res) => {
  const { kidId, title, icon, date, value, status } = req.body;
  if (!kidId || !title || !date) return res.status(400).json({ error: 'kidId, title, date required' });
  const id = genId('cust');
  db.prepare(`
    INSERT INTO custom_completions (id, kid_id, title, icon, value, date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, kidId, String(title).slice(0, 200), icon || null, Number(value) || 0, date, status || 'pending');
  const row = db.prepare('SELECT * FROM custom_completions WHERE id = ?').get(id);
  res.json(rowToCustomCompletion(row));
});

app.put('/api/custom-completions/:id', (req, res) => {
  const { status, value, title, icon } = req.body;
  const existing = db.prepare('SELECT * FROM custom_completions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare(`
    UPDATE custom_completions
    SET status = COALESCE(?, status),
        value = COALESCE(?, value),
        title = COALESCE(?, title),
        icon = COALESCE(?, icon)
    WHERE id = ?
  `).run(
    status ?? null,
    value === undefined ? null : Number(value),
    title === undefined ? null : String(title).slice(0, 200),
    icon === undefined ? null : icon,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM custom_completions WHERE id = ?').get(req.params.id);
  res.json(rowToCustomCompletion(row));
});

app.delete('/api/custom-completions/:id', (req, res) => {
  db.prepare('DELETE FROM custom_completions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// SPA fallback — any non-API route serves index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send('Frontend not built yet');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Chorely running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
  CREATE INDEX IF NOT EXISTS idx_completions_status ON completions(status);
  CREATE INDEX IF NOT EXISTS idx_completions_chore_date ON completions(chore_id, date);
 
  CREATE TABLE IF NOT EXISTS goals (
    id TEXT PRIMARY KEY,
    kid_id TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT NOT NULL,
    target REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );
 
  CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    kid_id TEXT NOT NULL,
    amount REAL NOT NULL,
    note TEXT,
    date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );
 
  -- "Other" / custom chore entries. Kids or parents submit these free-form.
  -- Parent approves and sets the value. If icon is null, UI picks a default.
  CREATE TABLE IF NOT EXISTS custom_completions (
    id TEXT PRIMARY KEY,
    kid_id TEXT NOT NULL,
    title TEXT NOT NULL,
    icon TEXT,
    value REAL NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kid_id) REFERENCES kids(id) ON DELETE CASCADE
  );
 
  CREATE INDEX IF NOT EXISTS idx_goals_kid ON goals(kid_id);
  CREATE INDEX IF NOT EXISTS idx_payouts_kid_date ON payouts(kid_id, date);
  CREATE INDEX IF NOT EXISTS idx_custom_completions_kid_date ON custom_completions(kid_id, date);
  CREATE INDEX IF NOT EXISTS idx_custom_completions_status ON custom_completions(status);
`);
 
// ============ MIGRATION: make chores.assigned_to nullable if it isn't already ============
// SQLite can't ALTER COLUMN, so we check and rebuild the table if needed.
const choreColInfo = db.prepare("PRAGMA table_info(chores)").all();
const assignedToCol = choreColInfo.find(c => c.name === 'assigned_to');
if (assignedToCol && assignedToCol.notnull === 1) {
  console.log('Migrating chores table to allow shared (unassigned) chores...');
  db.exec(`
    BEGIN TRANSACTION;
    CREATE TABLE chores_new (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      value REAL NOT NULL,
      assigned_to TEXT,
      frequency TEXT NOT NULL DEFAULT 'daily',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES kids(id) ON DELETE CASCADE
    );
    INSERT INTO chores_new SELECT id, title, icon, value, assigned_to, frequency, created_at FROM chores;
    DROP TABLE chores;
    ALTER TABLE chores_new RENAME TO chores;
    COMMIT;
  `);
}
 
// ============ MIGRATION: add is_required_for_extras column if missing ============
const hasRequiredCol = db.prepare("PRAGMA table_info(chores)").all()
  .some(c => c.name === 'is_required_for_extras');
if (!hasRequiredCol) {
  console.log('Adding is_required_for_extras column to chores...');
  db.exec("ALTER TABLE chores ADD COLUMN is_required_for_extras INTEGER NOT NULL DEFAULT 0");
}
 
// ============ MIGRATION: add max_claimers column if missing ============
const hasMaxClaimersCol = db.prepare("PRAGMA table_info(chores)").all()
  .some(c => c.name === 'max_claimers');
if (!hasMaxClaimersCol) {
  console.log('Adding max_claimers column to chores...');
  db.exec("ALTER TABLE chores ADD COLUMN max_claimers INTEGER NOT NULL DEFAULT 1");
}
 
// ============ SEED DEFAULTS (only on first run) ============
const parentCount = db.prepare('SELECT COUNT(*) as c FROM parents').get().c;
if (parentCount === 0) {
  console.log('First run: seeding default family. Default PIN for parents is 1234 — change it in the Manage tab!');
 
  db.prepare('INSERT INTO parents (id, name, avatar, pin) VALUES (?, ?, ?, ?)').run('p_tanner', 'Tanner', '👨', '1234');
  db.prepare('INSERT INTO parents (id, name, avatar, pin) VALUES (?, ?, ?, ?)').run('p_kelsey', 'Kelsey', '👩', '1234');
 
  db.prepare('INSERT INTO kids (id, name, avatar, color, age, weekly_allowance) VALUES (?, ?, ?, ?, ?, ?)').run(
    'k_stella', 'Stella', '🦊', '#EC4899', 10, 5
  );
  db.prepare('INSERT INTO kids (id, name, avatar, color, age, weekly_allowance) VALUES (?, ?, ?, ?, ?, ?)').run(
    'k_axel', 'Axel', '🐻', '#3B82F6', 8, 4
  );
  db.prepare('INSERT INTO kids (id, name, avatar, color, age, weekly_allowance) VALUES (?, ?, ?, ?, ?, ?)').run(
    'k_nixon', 'Nixon', '🦁', '#F59E0B', 6, 3
  );
 
  // Some starter chores (assigned)
  const starterChores = [
    ['Make bed', '🛏️', 0.5, 'k_stella', 'daily'],
    ['Feed the dog', '🐕', 1, 'k_stella', 'daily'],
    ['Clean room', '🧹', 2, 'k_stella', 'weekly'],
    ['Set the table', '🍽️', 0.5, 'k_axel', 'daily'],
    ['Brush teeth', '🪥', 0.25, 'k_axel', 'daily'],
    ['Take out trash', '🗑️', 1, 'k_axel', 'weekly'],
    ['Put toys away', '🧸', 0.5, 'k_nixon', 'daily'],
    ['Brush teeth', '🪥', 0.25, 'k_nixon', 'daily'],
  ];
  const stmt = db.prepare('INSERT INTO chores (id, title, icon, value, assigned_to, frequency) VALUES (?, ?, ?, ?, ?, ?)');
  starterChores.forEach((c, i) => stmt.run(`c_seed_${i}`, ...c));
 
  // Extra Chores (shared pool, first come first served)
  const extraChores = [
    ['Unload dishwasher', '🍴', 1, null, 'daily'],
    ['Wipe down counters', '🧽', 0.75, null, 'daily'],
    ['Sweep kitchen', '🧹', 1, null, 'weekly'],
    ['Water the plants', '🪴', 0.5, null, 'weekly'],
  ];
  extraChores.forEach((c, i) => stmt.run(`c_extra_${i}`, ...c));
}
 
// ============ HELPERS ============
const genId = (prefix) => `${prefix}_${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
 
function rowToKid(r) {
  return { id: r.id, name: r.name, avatar: r.avatar, color: r.color, age: r.age, weeklyAllowance: r.weekly_allowance };
}
function rowToChore(r) {
  return {
    id: r.id, title: r.title, icon: r.icon, value: r.value,
    assignedTo: r.assigned_to, frequency: r.frequency,
    isRequiredForExtras: !!r.is_required_for_extras,
    maxClaimers: r.max_claimers || 1,
  };
}
function rowToCompletion(r) {
  return { id: r.id, choreId: r.chore_id, kidId: r.kid_id, date: r.date, status: r.status };
}
function rowToParent(r) {
  return { id: r.id, name: r.name, avatar: r.avatar }; // never send PIN to client
}
function rowToGoal(r) {
  return { id: r.id, kidId: r.kid_id, title: r.title, icon: r.icon, target: r.target, createdAt: r.created_at, completedAt: r.completed_at };
}
function rowToPayout(r) {
  return { id: r.id, kidId: r.kid_id, amount: r.amount, note: r.note, date: r.date, createdAt: r.created_at };
}
function rowToCustomCompletion(r) {
  return {
    id: r.id, kidId: r.kid_id, title: r.title, icon: r.icon,
    value: r.value, date: r.date, status: r.status, createdAt: r.created_at,
  };
}
 
// ============ APP ============
const app = express();
app.use(cors());
app.use(express.json());
 
// Serve static frontend
const FRONTEND_DIR = path.join(__dirname, 'public');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
}
 
// ----- Auth: verify parent PIN -----
app.post('/api/parents/verify', (req, res) => {
  const { id, pin } = req.body;
  const p = db.prepare('SELECT * FROM parents WHERE id = ?').get(id);
  if (!p) return res.status(404).json({ error: 'not found' });
  if (p.pin !== String(pin)) return res.status(401).json({ error: 'bad pin' });
  res.json({ ok: true, parent: rowToParent(p) });
});
 
// ----- Update parent PIN -----
app.put('/api/parents/:id/pin', (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!/^\d{4}$/.test(String(newPin))) return res.status(400).json({ error: 'new pin must be 4 digits' });
  const p = db.prepare('SELECT * FROM parents WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  if (p.pin !== String(currentPin)) return res.status(401).json({ error: 'bad current pin' });
  db.prepare('UPDATE parents SET pin = ? WHERE id = ?').run(String(newPin), req.params.id);
  res.json({ ok: true });
});
 
// ----- Family (everything in one shot) -----
app.get('/api/family', (req, res) => {
  const parents = db.prepare('SELECT * FROM parents ORDER BY created_at').all().map(rowToParent);
  const kids = db.prepare('SELECT * FROM kids ORDER BY created_at').all().map(rowToKid);
  const chores = db.prepare('SELECT * FROM chores ORDER BY created_at').all().map(rowToChore);
  const completions = db.prepare('SELECT * FROM completions ORDER BY date DESC').all().map(rowToCompletion);
  const goals = db.prepare('SELECT * FROM goals ORDER BY created_at').all().map(rowToGoal);
  const payouts = db.prepare('SELECT * FROM payouts ORDER BY date DESC').all().map(rowToPayout);
  const customCompletions = db.prepare('SELECT * FROM custom_completions ORDER BY date DESC').all().map(rowToCustomCompletion);
  res.json({ parents, kids, chores, completions, goals, payouts, customCompletions });
});
 
// ----- Parents CRUD -----
app.post('/api/parents', (req, res) => {
  const { name, avatar, pin } = req.body;
  if (!name || !avatar || !pin) return res.status(400).json({ error: 'missing fields' });
  if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'pin must be 4 digits' });
  const id = genId('p');
  db.prepare('INSERT INTO parents (id, name, avatar, pin) VALUES (?, ?, ?, ?)').run(id, name, avatar, String(pin));
  res.json(rowToParent(db.prepare('SELECT * FROM parents WHERE id = ?').get(id)));
});
 
app.delete('/api/parents/:id', (req, res) => {
  const remaining = db.prepare('SELECT COUNT(*) as c FROM parents').get().c;
  if (remaining <= 1) return res.status(400).json({ error: 'must have at least one parent' });
  db.prepare('DELETE FROM parents WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
 
// ----- Kids CRUD -----
app.post('/api/kids', (req, res) => {
  const { name, avatar, color, age, weeklyAllowance } = req.body;
  if (!name || !avatar || !color || age == null) return res.status(400).json({ error: 'missing fields' });
  const id = genId('k');
  db.prepare('INSERT INTO kids (id, name, avatar, color, age, weekly_allowance) VALUES (?, ?, ?, ?, ?, ?)').run(
    id, name, avatar, color, parseInt(age), parseFloat(weeklyAllowance) || 0
  );
  res.json(rowToKid(db.prepare('SELECT * FROM kids WHERE id = ?').get(id)));
});
 
app.put('/api/kids/:id', (req, res) => {
  const { name, avatar, color, age, weeklyAllowance } = req.body;
  db.prepare('UPDATE kids SET name=?, avatar=?, color=?, age=?, weekly_allowance=? WHERE id=?').run(
    name, avatar, color, parseInt(age), parseFloat(weeklyAllowance) || 0, req.params.id
  );
  const r = db.prepare('SELECT * FROM kids WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(rowToKid(r));
});
 
app.delete('/api/kids/:id', (req, res) => {
  db.prepare('DELETE FROM kids WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
 
// ----- Chores CRUD -----
const VALID_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly'];
 
app.post('/api/chores', (req, res) => {
  const { title, icon, value, assignedTo, frequency, isRequiredForExtras, maxClaimers } = req.body;
  if (!title || !icon || value == null) return res.status(400).json({ error: 'missing fields' });
  const freq = frequency || 'daily';
  if (!VALID_FREQUENCIES.includes(freq)) return res.status(400).json({ error: 'invalid frequency' });
  const mc = Math.max(1, parseInt(maxClaimers) || 1);
  // assignedTo === null means it's an Extra Chore (shared pool, anyone can claim)
  const id = genId('c');
  db.prepare('INSERT INTO chores (id, title, icon, value, assigned_to, frequency, is_required_for_extras, max_claimers) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    id, title, icon, parseFloat(value), assignedTo || null, freq, isRequiredForExtras ? 1 : 0, mc
  );
  res.json(rowToChore(db.prepare('SELECT * FROM chores WHERE id = ?').get(id)));
});
 
app.put('/api/chores/:id', (req, res) => {
  const { title, icon, value, assignedTo, frequency, isRequiredForExtras, maxClaimers } = req.body;
  const existing = db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const freq = frequency || existing.frequency;
  if (!VALID_FREQUENCIES.includes(freq)) return res.status(400).json({ error: 'invalid frequency' });
  const mc = maxClaimers !== undefined ? Math.max(1, parseInt(maxClaimers) || 1) : existing.max_claimers;
  db.prepare('UPDATE chores SET title=?, icon=?, value=?, assigned_to=?, frequency=?, is_required_for_extras=?, max_claimers=? WHERE id=?').run(
    title, icon, parseFloat(value), assignedTo || null, freq,
    isRequiredForExtras !== undefined ? (isRequiredForExtras ? 1 : 0) : existing.is_required_for_extras,
    mc,
    req.params.id
  );
  const r = db.prepare('SELECT * FROM chores WHERE id = ?').get(req.params.id);
  res.json(rowToChore(r));
});
 
app.delete('/api/chores/:id', (req, res) => {
  db.prepare('DELETE FROM chores WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
 
// ----- Completions CRUD -----
// Computes the inclusive start date string for a given chore's current period,
// based on its frequency. 'date' is a YYYY-MM-DD string (the completion date).
function periodStart(frequency, dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (frequency === 'daily') return dateStr;
  if (frequency === 'weekly') {
    const dow = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - dow);
    return d.toISOString().split('T')[0];
  }
  if (frequency === 'biweekly') {
    // Anchor biweekly periods to epoch week 0. Compute which biweekly slot the date falls in,
    // then find the Sunday that started that slot.
    const dow = d.getUTCDay();
    const weekStart = new Date(d);
    weekStart.setUTCDate(d.getUTCDate() - dow);
    // Days since a fixed Sunday reference (2023-01-01 was a Sunday)
    const REF = Date.UTC(2023, 0, 1);
    const weeksSinceRef = Math.floor((weekStart.getTime() - REF) / (7 * 86400000));
    const slotOffset = weeksSinceRef % 2;
    if (slotOffset > 0) weekStart.setUTCDate(weekStart.getUTCDate() - 7 * slotOffset);
    return weekStart.toISOString().split('T')[0];
  }
  if (frequency === 'monthly') {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
  }
  return dateStr;
}
 
app.post('/api/completions', (req, res) => {
  const { choreId, kidId, date, status } = req.body;
  if (!choreId || !kidId || !date) return res.status(400).json({ error: 'missing fields' });
 
  const chore = db.prepare('SELECT * FROM chores WHERE id = ?').get(choreId);
  if (!chore) return res.status(404).json({ error: 'chore not found' });
 
  // If the same kid already has a non-rejected claim for this chore in its current period, return it
  const windowStart = periodStart(chore.frequency, date);
  const mine = db.prepare(
    "SELECT * FROM completions WHERE chore_id=? AND kid_id=? AND date >= ? AND status IN ('pending','approved')"
  ).get(choreId, kidId, windowStart);
  if (mine) return res.json(rowToCompletion(mine));
 
  // For shared/Extra Chores (assigned_to IS NULL), enforce max_claimers within the period.
  if (chore.assigned_to === null) {
    const maxClaimers = chore.max_claimers || 1;
    const claimed = db.prepare(
      "SELECT * FROM completions WHERE chore_id=? AND date >= ? AND status IN ('pending','approved')"
    ).all(choreId, windowStart);
    if (claimed.length >= maxClaimers) {
      return res.status(409).json({
        error: 'fully claimed',
        claimCount: claimed.length,
        maxClaimers,
        completions: claimed.map(rowToCompletion),
      });
    }
  }
 
  const id = genId('comp');
  db.prepare('INSERT INTO completions (id, chore_id, kid_id, date, status) VALUES (?, ?, ?, ?, ?)').run(
    id, choreId, kidId, date, status || 'pending'
  );
  res.json(rowToCompletion(db.prepare('SELECT * FROM completions WHERE id = ?').get(id)));
});
 
app.put('/api/completions/:id', (req, res) => {
  const { status } = req.body;
  if (!['pending', 'approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'bad status' });
  db.prepare('UPDATE completions SET status=? WHERE id=?').run(status, req.params.id);
  const r = db.prepare('SELECT * FROM completions WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(rowToCompletion(r));
});
 
app.delete('/api/completions/:id', (req, res) => {
  db.prepare('DELETE FROM completions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
 
// ----- Goals CRUD -----
app.post('/api/goals', (req, res) => {
  const { kidId, title, icon, target } = req.body;
  if (!kidId || !title || !icon || target == null) return res.status(400).json({ error: 'missing fields' });
  const id = genId('g');
  db.prepare('INSERT INTO goals (id, kid_id, title, icon, target) VALUES (?, ?, ?, ?, ?)').run(
    id, kidId, title, icon, parseFloat(target)
  );
  res.json(rowToGoal(db.prepare('SELECT * FROM goals WHERE id = ?').get(id)));
});
 
app.put('/api/goals/:id', (req, res) => {
  const { title, icon, target, completedAt } = req.body;
  const existing = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE goals SET title=?, icon=?, target=?, completed_at=? WHERE id=?').run(
    title ?? existing.title,
    icon ?? existing.icon,
    target != null ? parseFloat(target) : existing.target,
    completedAt !== undefined ? completedAt : existing.completed_at,
    req.params.id
  );
  res.json(rowToGoal(db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id)));
});
 
app.delete('/api/goals/:id', (req, res) => {
  db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
 
// ----- Payouts CRUD -----
// Record that a parent paid a kid $amount (zeroes their unpaid balance by that amount)
app.post('/api/payouts', (req, res) => {
  const { kidId, amount, note, date } = req.body;
  if (!kidId || amount == null || !date) return res.status(400).json({ error: 'missing fields' });
  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: 'amount must be positive' });
  const id = genId('pay');
  db.prepare('INSERT INTO payouts (id, kid_id, amount, note, date) VALUES (?, ?, ?, ?, ?)').run(
    id, kidId, amt, note || null, date
  );
  res.json(rowToPayout(db.prepare('SELECT * FROM payouts WHERE id = ?').get(id)));
});
 
app.delete('/api/payouts/:id', (req, res) => {
  db.prepare('DELETE FROM payouts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
 
// ----- Custom ("Other") completions -----
// Kid or parent submits a free-form chore description. Status starts pending.
// Parent approves and assigns a value via PUT.
app.post('/api/custom-completions', (req, res) => {
  const { kidId, title, icon, date, value, status } = req.body;
  if (!kidId || !title || !date) return res.status(400).json({ error: 'kidId, title, date required' });
  const id = genId('cust');
  db.prepare(`
    INSERT INTO custom_completions (id, kid_id, title, icon, value, date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, kidId, String(title).slice(0, 200), icon || null, Number(value) || 0, date, status || 'pending');
  const row = db.prepare('SELECT * FROM custom_completions WHERE id = ?').get(id);
  res.json(rowToCustomCompletion(row));
});
 
app.put('/api/custom-completions/:id', (req, res) => {
  const { status, value, title, icon } = req.body;
  const existing = db.prepare('SELECT * FROM custom_completions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare(`
    UPDATE custom_completions
    SET status = COALESCE(?, status),
        value = COALESCE(?, value),
        title = COALESCE(?, title),
        icon = COALESCE(?, icon)
    WHERE id = ?
  `).run(
    status ?? null,
    value === undefined ? null : Number(value),
    title === undefined ? null : String(title).slice(0, 200),
    icon === undefined ? null : icon,
    req.params.id
  );
  const row = db.prepare('SELECT * FROM custom_completions WHERE id = ?').get(req.params.id);
  res.json(rowToCustomCompletion(row));
});
 
app.delete('/api/custom-completions/:id', (req, res) => {
  db.prepare('DELETE FROM custom_completions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
 
// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));
 
// SPA fallback — any non-API route serves index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'not found' });
  const indexPath = path.join(FRONTEND_DIR, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send('Frontend not built yet');
});
 
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Chorely running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
 
