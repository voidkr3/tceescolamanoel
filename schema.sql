-- Rode no SQL Editor do Neon
CREATE TABLE IF NOT EXISTS users(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  pass TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'voluntario' CHECK(role IN('principal','secundaria','voluntario','escola')),
  area TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  terms_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requests(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  requester TEXT,
  objective TEXT,
  event_date DATE,
  support_type TEXT,
  details TEXT,
  status TEXT DEFAULT 'pendente',
  area TEXT,
  notes TEXT,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  area TEXT,
  assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS minutes(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date DATE,
  participants TEXT,
  decisions TEXT,
  pending TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notices(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE,
  place TEXT,
  responsible TEXT,
  status TEXT DEFAULT 'planejamento',
  objective TEXT,
  results TEXT,
  difficulties TEXT,
  lessons TEXT,
  attendance INT,
  checklist JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incidents(
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  level INT DEFAULT 1 CHECK(level BETWEEN 1 AND 3),
  status TEXT DEFAULT 'aberta',
  measures TEXT,
  reporter_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS candidates(
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT,
  area TEXT,
  s1 INT,
  s2 INT,
  s3 INT,
  s4 INT,
  s5 INT,
  s6 INT,
  decision TEXT DEFAULT 'em análise',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
