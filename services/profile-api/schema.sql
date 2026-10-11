CREATE TABLE IF NOT EXISTS profiles (user_id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS oauth_pending (state TEXT PRIMARY KEY, challenge TEXT NOT NULL, user_id TEXT, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS pending_expiry ON oauth_pending(expires_at);
CREATE TABLE IF NOT EXISTS badges (user_id TEXT NOT NULL, badge TEXT NOT NULL CHECK (badge IN ('contributor','innovator','limitedEdition','veteran','collabPartner','eventWinner','communitySpark','support','betaTester','first10')), assigned_by TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,badge));
CREATE TABLE IF NOT EXISTS badge_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_id TEXT NOT NULL, user_id TEXT NOT NULL, badge TEXT NOT NULL, action TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS first10_capacity BEFORE INSERT ON badges
WHEN NEW.badge='first10' AND NOT EXISTS (SELECT 1 FROM badges WHERE user_id=NEW.user_id AND badge='first10') AND (SELECT count(*) FROM badges WHERE badge='first10')>=10
BEGIN SELECT RAISE(ABORT, 'FIRST10_LIMIT'); END;
