const pg = require('pg');
const pool = new pg.Pool({ connectionString: 'postgresql://admin:admin123@localhost:5432/salon_mgm' });

async function checkIds() {
  try {
    console.log("--- SALON CHECK ---");
    const salons = await pool.query("SELECT id, name FROM salons LIMIT 5");
    console.log(JSON.stringify(salons.rows, null, 2));

    console.log("\n--- BRANCH CHECK ---");
    const branches = await pool.query("SELECT id, salon_id, name FROM branches LIMIT 5");
    console.log(JSON.stringify(branches.rows, null, 2));

    console.log("\n--- STOCKTAKES CHECK ---");
    const stocktakes = await pool.query("SELECT id, branch_id, name FROM stock_takes LIMIT 5");
    console.log(JSON.stringify(stocktakes.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkIds();
