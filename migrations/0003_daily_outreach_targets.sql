INSERT INTO settings(key,value,updated_at) VALUES ('engineering_daily_target','25',CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value='25',updated_at=CURRENT_TIMESTAMP;
INSERT INTO settings(key,value,updated_at) VALUES ('software_daily_target','10',CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value='10',updated_at=CURRENT_TIMESTAMP;
INSERT INTO settings(key,value,updated_at) VALUES ('daily_total_limit','35',CURRENT_TIMESTAMP)
ON CONFLICT(key) DO UPDATE SET value='35',updated_at=CURRENT_TIMESTAMP;
