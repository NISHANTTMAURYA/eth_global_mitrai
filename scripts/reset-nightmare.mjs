import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    // 1. Delete all chat messages
    const r1 = await client.query("DELETE FROM messages WHERE key LIKE 'b7474e8e-83a9-4495-baef-53dbeb2d7efc%'");
    console.log('✅ Deleted messages for Nightmare:', r1.rowCount);

    // 2. Reset brain memories and sessions to 0
    const charRes = await client.query("SELECT body FROM characters WHERE id='b7474e8e-83a9-4495-baef-53dbeb2d7efc'");
    if (charRes.rows.length) {
      const c = charRes.rows[0].body;
      c.brain.memories = [];
      c.brain.sessions = 0;
      c.brain.evidence = [];
      c.brain.version = 1;
      await client.query("UPDATE characters SET body=$1 WHERE id='b7474e8e-83a9-4495-baef-53dbeb2d7efc'", [JSON.stringify(c)]);
      console.log('✅ Reset Nightmare brain memories to 0');
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run();
