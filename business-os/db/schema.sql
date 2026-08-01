-- ═══════════════════════════════════════════════════════════════════
-- Business OS — Enterprise Brain (Neon Postgres)
-- Una empresa. Un Business OS. Una única memoria. Un único modelo.
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Business Constitution ─────────────────────────────────────────
-- Documento fundacional: identidad, principios, límites, forma de razonar.
CREATE TABLE IF NOT EXISTS bo_constitution (
  id          serial PRIMARY KEY,
  version     int NOT NULL DEFAULT 1,
  empresa     text NOT NULL,
  contenido   text NOT NULL,
  activa      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Enterprise Knowledge: modelo vivo de la empresa ───────────────
CREATE TABLE IF NOT EXISTS bo_entities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text NOT NULL,  -- persona|cliente|producto|proveedor|proyecto|proceso|contrato|activo|otro
  nombre      text NOT NULL,
  descripcion text,
  datos       jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bo_entities_tipo_idx ON bo_entities(tipo);

CREATE TABLE IF NOT EXISTS bo_entity_links (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origen     uuid NOT NULL REFERENCES bo_entities(id) ON DELETE CASCADE,
  destino    uuid NOT NULL REFERENCES bo_entities(id) ON DELETE CASCADE,
  relacion   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Knowledge Engine: documentos → conocimiento ───────────────────
CREATE TABLE IF NOT EXISTS bo_documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo     text NOT NULL,
  fuente     text NOT NULL DEFAULT 'manual',  -- manual|archivo|email|reunion|contrato|otro
  contenido  text NOT NULL,
  resumen    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bo_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES bo_documents(id) ON DELETE CASCADE,
  idx         int NOT NULL,
  contenido   text NOT NULL,
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('spanish', contenido)) STORED
);
ALTER TABLE bo_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS bo_chunks_tsv_idx ON bo_chunks USING gin(tsv);
CREATE INDEX IF NOT EXISTS bo_chunks_trgm_idx ON bo_chunks USING gin(contenido gin_trgm_ops);
CREATE INDEX IF NOT EXISTS bo_chunks_embedding_idx ON bo_chunks USING hnsw (embedding vector_cosine_ops);

-- ── Business Memory: historial de decisiones, eventos y contexto ──
CREATE TABLE IF NOT EXISTS bo_memory (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       text NOT NULL,  -- evento|decision|accion|aprendizaje|conversacion|conocimiento
  titulo     text NOT NULL,
  detalle    text,
  ref_id     uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bo_memory_created_idx ON bo_memory(created_at DESC);

-- ── Decision Engine ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bo_decisions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pregunta     text NOT NULL,
  estado       text NOT NULL DEFAULT 'analizando',  -- analizando|completada|error
  analisis     jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- ── Automation Engine: cola de acciones ───────────────────────────
CREATE TABLE IF NOT EXISTS bo_actions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        text NOT NULL,  -- email|reunion|tarea|documento|reporte|notificacion|otro
  titulo      text NOT NULL,
  detalle     text,
  estado      text NOT NULL DEFAULT 'pendiente',  -- pendiente|ejecutada|rechazada|error
  resultado   text,
  origen      text NOT NULL DEFAULT 'manual',     -- decision|agente|manual
  ref_id      uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  executed_at timestamptz
);

-- ── Business Intelligence: KPIs ───────────────────────────────────
CREATE TABLE IF NOT EXISTS bo_kpis (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre    text NOT NULL UNIQUE,
  unidad    text,
  objetivo  numeric,
  direccion text NOT NULL DEFAULT 'subir',  -- subir|bajar
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bo_kpi_snapshots (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id     uuid NOT NULL REFERENCES bo_kpis(id) ON DELETE CASCADE,
  valor      numeric NOT NULL,
  nota       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bo_kpi_snap_idx ON bo_kpi_snapshots(kpi_id, created_at DESC);

-- ── Specialized Agents: todos sobre el mismo cerebro ──────────────
CREATE TABLE IF NOT EXISTS bo_agents (
  id     text PRIMARY KEY,
  nombre text NOT NULL,
  emoji  text NOT NULL DEFAULT '🤖',
  rol    text NOT NULL,
  activo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS bo_agent_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   text NOT NULL REFERENCES bo_agents(id) ON DELETE CASCADE,
  role       text NOT NULL,  -- user|assistant
  contenido  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bo_agent_msgs_idx ON bo_agent_messages(agent_id, created_at);

-- ── Ajustes del sistema (vinculación Telegram, tokens Google) ─────
CREATE TABLE IF NOT EXISTS bo_settings (
  key   text PRIMARY KEY,
  value text NOT NULL
);

-- ── Centinela: reglas de eventos sobre KPIs ───────────────────────
-- "Si el KPI X cruza el umbral → notificar y ejecutar instrucción"
CREATE TABLE IF NOT EXISTS bo_rules (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         text NOT NULL,
  kpi_id         uuid NOT NULL REFERENCES bo_kpis(id) ON DELETE CASCADE,
  condicion      text NOT NULL,           -- menor|mayor
  umbral         numeric NOT NULL,
  instruccion    text,                    -- opcional: qué ejecutar al dispararse
  activo         boolean NOT NULL DEFAULT true,
  cooldown_horas int NOT NULL DEFAULT 24, -- no re-disparar antes de este lapso
  last_triggered timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Feedback del dueño: alimenta al Learning Engine ───────────────
CREATE TABLE IF NOT EXISTS bo_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contexto   text NOT NULL,          -- jarvis|agente
  referencia text,                   -- agent_id u orden ejecutada
  respuesta  text NOT NULL,          -- lo que el OS respondió (recortado)
  voto       text NOT NULL,          -- up|down
  nota       text,                   -- corrección opcional del dueño
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bo_feedback_idx ON bo_feedback(voto, created_at DESC);

-- ── Gobierno: auditoría de operaciones sensibles ──────────────────
CREATE TABLE IF NOT EXISTS bo_audit (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canal      text NOT NULL,   -- web|telegram|cron|regla|sistema
  evento     text NOT NULL,   -- decision|accion_ejecutada|accion_rechazada|email|constitucion|cron_creado|...
  detalle    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bo_audit_created_idx ON bo_audit(created_at DESC);

-- ── Cron Jobs: automatización programada ──────────────────────────
CREATE TABLE IF NOT EXISTS bo_schedules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,
  cron        text NOT NULL,          -- expresión cron de 5 campos
  instruccion text NOT NULL,          -- instrucción en lenguaje natural que ejecuta el router
  activo      boolean NOT NULL DEFAULT true,
  last_run    timestamptz,
  last_result text,
  next_run    timestamptz,
  fail_count  int NOT NULL DEFAULT 0,   -- fallos consecutivos (a 3 se auto-pausa y avisa)
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE bo_schedules ADD COLUMN IF NOT EXISTS fail_count int NOT NULL DEFAULT 0;

-- ── Autenticación y Equipo (Multi-empleado opcional) ──────────────
CREATE TABLE IF NOT EXISTS bo_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  nombre        text NOT NULL,
  rol           text NOT NULL DEFAULT 'staff',  -- admin|staff
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bo_sessions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES bo_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

