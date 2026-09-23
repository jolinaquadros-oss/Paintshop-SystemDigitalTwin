import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';

const { Pool } = pkg;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'system_digitaltwin',
  password: process.env.DB_PASSWORD || 'root',
  port: process.env.DB_PORT || 5432,
});

const initDb = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS production (
      id SERIAL PRIMARY KEY,
      production_id VARCHAR(50),
      component_type VARCHAR(50),
      start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      end_time TIMESTAMP,
      status VARCHAR(20) DEFAULT 'Running',
      total_count INTEGER,
      ok_count INTEGER,
      performance NUMERIC,
      availability NUMERIC,
      quality NUMERIC,
      oee NUMERIC,
      downtime NUMERIC
    );

    CREATE TABLE IF NOT EXISTS stages (
      id INTEGER PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      subtitle VARCHAR(150),
      sequence_order INTEGER NOT NULL UNIQUE,
      duration_minutes NUMERIC(10, 2) NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS components (
      component_id VARCHAR(100) PRIMARY KEY,
      component_type VARCHAR(100) NOT NULL,
      shape VARCHAR(20) NOT NULL DEFAULT 'box'
    );
  `;
  try {
    await pool.query(createTableQuery);
    await pool.query('ALTER TABLE stages DROP COLUMN IF EXISTS category, DROP COLUMN IF EXISTS created_at');
    await pool.query(`
      DO $$
      BEGIN
        IF to_regclass('component_types') IS NOT NULL
           AND to_regclass('components') IS NULL THEN
          ALTER TABLE component_types RENAME TO components;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'components' AND column_name = 'code'
        ) THEN
          ALTER TABLE components RENAME COLUMN code TO component_id;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'components' AND column_name = 'name'
        ) THEN
          ALTER TABLE components RENAME COLUMN name TO component_type;
        END IF;
      END $$;
    `);
    await pool.query('ALTER TABLE components DROP COLUMN IF EXISTS size, DROP COLUMN IF EXISTS created_at');
    await pool.query('ALTER TABLE components ALTER COLUMN component_id TYPE VARCHAR(100)');
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'id') THEN
          ALTER TABLE stages RENAME COLUMN id TO stage_id;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'name') THEN
          ALTER TABLE stages RENAME COLUMN name TO stage_name;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'subtitle') THEN
          ALTER TABLE stages RENAME COLUMN subtitle TO information;
        END IF;
      END $$;
    `);
    await pool.query('ALTER TABLE stages ALTER COLUMN stage_id SET NOT NULL, ALTER COLUMN stage_name SET NOT NULL');
    await pool.query(`
      INSERT INTO stages (stage_id, stage_name, information, sequence_order, duration_minutes)
      VALUES
        (0, 'Component Input', '', 0, 0.00),
        (1, 'Initial Inspection', '', 1, 0.00),
        (2, 'Pre-Treatment Line', 'WR1-Degreasing-WR2-WR3-Nano Coating-WR4', 2, 8.47),
        (3, 'Air Drying', '', 3, 3.53),
        (4, 'WDO', '140 C', 4, 5.20),
        (5, 'Force Cooling', '', 5, 2.60),
        (6, 'Painting Booth', '', 6, 21.00),
        (7, 'PCO', '170 C', 7, 30.00),
        (8, 'Part Cooling', '', 8, 2.16),
        (9, 'Painted Part Inspection', '', 9, 0.71),
        (10, 'Unloading Stage 1', '', 10, 0.71),
        (11, 'Unloading Stage 2', '', 11, 0.71),
        (12, 'Unloading Stage 3', '', 12, 0.71),
        (13, 'Final Good', '', 13, 0.00)
      ON CONFLICT (stage_id) DO UPDATE SET
        stage_name = EXCLUDED.stage_name,
        information = EXCLUDED.information,
        sequence_order = EXCLUDED.sequence_order,
        duration_minutes = EXCLUDED.duration_minutes
    `);
    await pool.query(`
      ALTER TABLE production
        ALTER COLUMN start_time TYPE TIMESTAMP(0) USING date_trunc('second', start_time),
        ALTER COLUMN end_time TYPE TIMESTAMP(0) USING date_trunc('second', end_time),
        ALTER COLUMN performance TYPE NUMERIC(10, 2) USING ROUND(performance, 2),
        ALTER COLUMN availability TYPE NUMERIC(10, 2) USING ROUND(availability, 2),
        ALTER COLUMN quality TYPE NUMERIC(10, 2) USING ROUND(quality, 2),
        ALTER COLUMN oee TYPE NUMERIC(10, 2) USING ROUND(oee, 2),
        ALTER COLUMN downtime TYPE NUMERIC(10, 2) USING ROUND(downtime, 2)
    `);
    await pool.query(`
      INSERT INTO components (component_id, component_type, shape)
      VALUES
        ('A', 'Front Panel', 'front_panel'),
        ('B', 'Back Panel', 'back_panel'),
        ('C', 'Side 1', 'side_panel'),
        ('D', 'Side 2', 'side_panel'),
        ('E', 'Top Panel', 'top_panel'),
        ('F', 'Bottom Panel', 'top_panel')
      ON CONFLICT (component_id) DO UPDATE SET component_type = EXCLUDED.component_type, shape = EXCLUDED.shape
    `);
    await pool.query('UPDATE production SET downtime = 0 WHERE downtime IS NULL');
    console.log('Database initialized: production, stages, and components tables exist.');
  } catch (err) {
    console.error('Failed to initialize database:', err.message);
  }
};

initDb();

app.get('/api/stages', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stages ORDER BY sequence_order');
    res.json({ success: true, stages: result.rows });
  } catch (err) {
    console.error('Error fetching stages:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/component-types', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT component_id, component_type, shape FROM components ORDER BY component_id'
    );
    res.json({ success: true, componentTypes: result.rows });
  } catch (err) {
    console.error('Error fetching component types:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/component-types', async (req, res) => {
  const { component_id, component_type, shape } = req.body || {};
  const normalizedId = String(component_id || '').trim();
  const normalizedType = String(component_type || '').trim();
  const allowedShapes = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'front_panel', 'back_panel', 'top_panel', 'side_panel', 'base_tray', 'top_cover'];
  const normalizedShape = String(shape || 'box').trim().toLowerCase();

  if (!normalizedId || !normalizedType
    || !allowedShapes.includes(normalizedShape)) {
    return res.status(400).json({ error: 'Invalid component type' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO components (component_id, component_type, shape)
       VALUES ($1, $2, $3)
       RETURNING component_id, component_type, shape`,
      [normalizedId, normalizedType, normalizedShape]
    );
    res.status(201).json({ success: true, componentType: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Component ID already exists' });
    }
    console.error('Error creating component type:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST endpoint to start a run
app.post('/api/runs/start', async (req, res) => {
  const { componentType } = req.body || {};
  try {
    // Generate a new production_id like P001, P002
    const countRes = await pool.query('SELECT COUNT(*) FROM production');
    const nextId = parseInt(countRes.rows[0].count, 10) + 1;
    const prodId = 'P' + nextId.toString().padStart(3, '0');
    let compType = 'Unknown';
    if (componentType) {
      const typeRes = await pool.query('SELECT component_type FROM components WHERE component_id = $1', [componentType]);
      if (typeRes.rows.length > 0) compType = typeRes.rows[0].component_type;
      else compType = `Component ${componentType}`;
    } else {
      compType = 'Front Panel';
    }

    const result = await pool.query(
      'INSERT INTO production (production_id, component_type, status, downtime) VALUES ($1, $2, $3, $4) RETURNING id',
      [prodId, compType, 'Running', 0]
    );
    res.status(201).json({ success: true, runId: result.rows[0].id, prodId });
  } catch (err) {
    console.error('Error starting run:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// PATCH endpoint to update a run's lifecycle status without creating a new run
app.patch('/api/runs/:id/status', async (req, res) => {
  const runId = req.params.id;
  const { status, downtime } = req.body || {};
  const allowedStatuses = ['Running', 'Paused', 'Cancelled'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid run status' });
  }

  try {
    const result = await pool.query(
      `UPDATE production
       SET status = $1::varchar,
           downtime = COALESCE($2::numeric, downtime, 0),
           end_time = CASE WHEN $1::varchar = 'Cancelled' THEN CURRENT_TIMESTAMP ELSE end_time END
       WHERE id = $3 AND status NOT IN ('Completed', 'Cancelled')
       RETURNING *`,
      [status, downtime ?? null, runId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Active run not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating run status:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// PUT endpoint to complete a run
app.put('/api/runs/:id', async (req, res) => {
  const runId = req.params.id;
  const { oee, availability, performance, quality, downtime, totalCount, okCount } = req.body;

  try {
    const query = `
      UPDATE production 
      SET end_time = CURRENT_TIMESTAMP,
          oee = $1,
          availability = $2,
          performance = $3,
          quality = $4,
          downtime = $5,
          total_count = $6,
          ok_count = $7,
          status = 'Completed'
      WHERE id = $8
      RETURNING *
    `;
    const values = [oee, availability, performance, quality, downtime, totalCount, okCount, runId];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error completing run:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET endpoint to fetch history for table
app.get('/api/runs', async (req, res) => {
  try {
    const totalRes = await pool.query('SELECT COUNT(*) FROM production');
    const recentRes = await pool.query('SELECT * FROM production ORDER BY id DESC LIMIT 100');
    
    const totalComponentsRes = await pool.query("SELECT SUM(total_count) FROM production WHERE status = 'Completed'");
    const perComponentRes = await pool.query("SELECT component_type, SUM(total_count) as total FROM production WHERE status = 'Completed' GROUP BY component_type ORDER BY total DESC");

    res.json({
      totalRuns: parseInt(totalRes.rows[0].count, 10),
      recentRuns: recentRes.rows,
      totalComponents: parseInt(totalComponentsRes.rows[0].sum || 0, 10),
      componentsSummary: perComponentRes.rows.map(r => ({ type: r.component_type, total: parseInt(r.total, 10) }))
    });
  } catch (err) {
    console.error('Error fetching runs:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET endpoint to fetch daily aggregated metrics
app.get('/api/production/daily', async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const query = `
      SELECT 
        SUM(total_count) as daily_total,
        SUM(ok_count) as daily_ok,
        AVG(oee) as avg_oee,
        AVG(availability) as avg_availability,
        AVG(performance) as avg_performance,
        AVG(quality) as avg_quality,
        SUM(downtime) as daily_downtime
      FROM production 
      WHERE DATE(start_time) = $1 AND status = 'Completed'
    `;
    const result = await pool.query(query, [date]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching daily production:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
