import { pool } from './db.js';

async function describeAllTables() {
  try {
    // Get list of tables
    const [tables] = await pool.query('SHOW TABLES');
    const tableKey = Object.keys(tables[0])[0]; // usually "Tables_in_dbname"
    const tableNames = tables.map(row => row[tableKey]);

    console.log(`Found ${tableNames.length} tables:`, tableNames);

    const schema = {};

    for (const tableName of tableNames) {
      const [columns] = await pool.query(`DESCRIBE \`${tableName}\``);
      schema[tableName] = columns;
    }

    console.log(JSON.stringify(schema, null, 2));

  } catch (err) {
    console.error('Error describing tables:', err);
  } finally {
    await pool.end();
    process.exit();
  }
}

describeAllTables();
