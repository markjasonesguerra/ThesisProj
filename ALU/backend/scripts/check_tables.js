import { runQuery, pool } from '../db.js';

const checkTables = async () => {
  try {
    const tables = ['admins', 'admin_sessions', 'audit_logs'];
    for (const table of tables) {
      try {
        await runQuery(`SELECT 1 FROM ${table} LIMIT 1`);
        console.log(`Table '${table}' exists.`);
      } catch (e) {
        console.error(`Table '${table}' DOES NOT EXIST or error:`, e.message);
      }
    }
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    pool.end();
  }
};

checkTables();
