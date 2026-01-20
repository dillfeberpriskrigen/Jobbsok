CREATE TABLE jobs (
    id VARCHAR(64) PRIMARY KEY,
    headline TEXT,
    employer_name TEXT,
    municipality TEXT,
    webpage_url TEXT,
    publication_date DATETIME,
    application_deadline DATE,
    description LONGTEXT,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

