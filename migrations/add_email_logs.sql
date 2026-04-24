-- Migration: เพิ่มตาราง email_logs
-- บันทึกผลการส่ง email ทุกประเภท

CREATE TABLE email_logs (
  id            SERIAL PRIMARY KEY,
  recipient     VARCHAR   NOT NULL,
  email_type    VARCHAR   NOT NULL,  -- 'review_notification' | 'reminder'
  subject_ref   VARCHAR,             -- term_subject_id หรือ subject_code
  status        VARCHAR   NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  error_message TEXT,
  sent_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_logs_recipient  ON email_logs (recipient);
CREATE INDEX idx_email_logs_email_type ON email_logs (email_type);
CREATE INDEX idx_email_logs_sent_at    ON email_logs (sent_at);
