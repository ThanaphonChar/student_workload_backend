CREATE TABLE document_submissions (
  id              SERIAL PRIMARY KEY,
  term_subject_id INTEGER NOT NULL REFERENCES term_subjects(id),
  document_type   VARCHAR(20) NOT NULL CHECK (document_type IN ('outline', 'report')),
  file_url        TEXT NOT NULL,
  original_name   VARCHAR NOT NULL,
  round_number    INTEGER NOT NULL DEFAULT 1,
  status          approval_status NOT NULL DEFAULT 'pending',
  submitted_at    TIMESTAMP DEFAULT NOW(),
  submitted_by    INTEGER REFERENCES users(id)
);

CREATE TABLE submission_reviews (
  id              SERIAL PRIMARY KEY,
  submission_id   INTEGER NOT NULL REFERENCES document_submissions(id),
  reviewer_id     INTEGER NOT NULL REFERENCES users(id),
  action          approval_status NOT NULL,
  note            TEXT,
  reason          TEXT,
  reviewed_at     TIMESTAMP DEFAULT NOW()
);
