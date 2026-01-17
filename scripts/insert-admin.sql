-- Insert default admin user
-- Username: admin
-- Password: changeme123
-- Role: MAIN_ADMIN

INSERT OR IGNORE INTO Admin (id, username, password, role, createdAt, updatedAt)
VALUES (
  'admin-1',
  'admin',
  '$2b$10$08.rxgL1qkCMTt5Is67.6ukIIMINT84w9oYrMEH4wRzM2NbWO61kG',
  'MAIN_ADMIN',
  datetime('now'),
  datetime('now')
);
