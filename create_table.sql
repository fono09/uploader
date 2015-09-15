CREATE TABLE upfiles (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	comment TEXT,
	delpass BLOB,
	delsalt BLOB,
	dlpass BLOB,
	dlsalt BLOB,
	name TEXT NOT NULL,
	last_updated TIMESTAMP DEFAULT (DATETIME('now','localtime'))
);
