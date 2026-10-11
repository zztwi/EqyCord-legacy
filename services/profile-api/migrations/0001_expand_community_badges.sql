-- D1 applies migrations transactionally. Preserve all existing badge grants.
CREATE TABLE badges_expanded (user_id TEXT NOT NULL, badge TEXT NOT NULL CHECK (badge IN ('contributor','innovator','limitedEdition','veteran','collabPartner','eventWinner','communitySpark','support','betaTester','first10')), assigned_by TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY(user_id,badge));
INSERT INTO badges_expanded (user_id,badge,assigned_by,updated_at) SELECT user_id,badge,assigned_by,updated_at FROM badges;
DROP TABLE badges;
ALTER TABLE badges_expanded RENAME TO badges;
CREATE TRIGGER first10_capacity BEFORE INSERT ON badges
WHEN NEW.badge='first10' AND NOT EXISTS (SELECT 1 FROM badges WHERE user_id=NEW.user_id AND badge='first10') AND (SELECT count(*) FROM badges WHERE badge='first10')>=10
BEGIN SELECT RAISE(ABORT, 'FIRST10_LIMIT'); END;
