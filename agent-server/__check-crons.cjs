// Chequeo temporal de crons y últimos resultados — se borra tras el chequeo
const Database = require('better-sqlite3');
const db = new Database(__dirname + '/store/agent-server.db', { readonly: true });
const rows = db.prepare("select id, schedule, status, next_run, last_run, last_result from scheduled_tasks order by last_run desc").all();
for (const r of rows) {
  const res = (r.last_result || '').replace(/\s+/g, ' ').slice(0, 220);
  console.log(`--- ${r.id} [${r.status}] schedule=${r.schedule}`);
  console.log(`    last_run=${r.last_run} next_run=${r.next_run}`);
  console.log(`    result: ${res || '(sin resultado)'}`);
}
