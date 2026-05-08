const fs = require('fs');
const sql = fs.readFileSync('/Volumes/Projects/MansurBhai/Optimus Campus/supabase/migrations/001_complete_setup.sql', 'utf8');

const tableCols = {};

const createTables = [...sql.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/g)];
createTables.forEach(match => {
  const tableName = match[1];
  const columnsInfo = match[2];
  tableCols[tableName] = columnsInfo.includes('tenant_id');
});

// Check regular policies
const policies = [...sql.matchAll(/CREATE POLICY\s+"[^"]+"\s+ON\s+([a-zA-Z0-9_]+)\s+[\s\S]*?USING\s*\(([\s\S]*?)\)/g)];
policies.forEach(match => {
  const tableName = match[1];
  const condition = match[2];
  if (condition.includes('tenant_id') && tableCols[tableName] === false) {
    console.log(`Error: Policy on ${tableName} uses tenant_id but column does not exist in CREATE TABLE`);
  }
});

// Check indices
const indices = [...sql.matchAll(/CREATE INDEX\s+IF\s+NOT\s+EXISTS\s+[a-zA-Z0-9_]+\s+ON\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/g)];
indices.forEach(match => {
  const tableName = match[1];
  const columns = match[2];
  if (columns.includes('tenant_id') && tableCols[tableName] === false) {
    console.log(`Error: Index on ${tableName} uses tenant_id but column does not exist`);
  }
});

// check do loops
const loops = [...sql.matchAll(/FOR\s+t\s+IN\s+SELECT\s+unnest\(ARRAY\[([^\]]+)\]\).*?tenant_id/gs)];
loops.forEach(match => {
  const tables = match[1].replace(/'/g, '').split(',').map(s => s.trim());
  tables.forEach(t => {
    if (tableCols[t] === false) {
        console.log(`Error: DO loop policy uses tenant_id on table ${t} which lacks it`);
    }
  });
});
