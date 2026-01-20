CREATE TABLE job_status (
    job_id VARCHAR(64) PRIMARY KEY,
    status ENUM('new','interesting','applied','rejected') DEFAULT 'new',
    notes TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
);

