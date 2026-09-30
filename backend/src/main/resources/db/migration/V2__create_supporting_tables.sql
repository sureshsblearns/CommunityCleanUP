-- Supporting tables: rewards, certificates, gallery, report status history, password reset

CREATE TABLE reward_transactions (
    reward_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    event_id    BIGINT,
    points      INT          NOT NULL,
    reason      VARCHAR(40)  NOT NULL,
    description VARCHAR(255),
    created_at  DATETIME(6)  NOT NULL,
    CONSTRAINT uk_reward_user_event_reason UNIQUE (user_id, event_id, reason),
    CONSTRAINT fk_rewards_user FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT fk_rewards_event FOREIGN KEY (event_id) REFERENCES events (event_id)
);
CREATE INDEX idx_rewards_user ON reward_transactions (user_id);

CREATE TABLE certificates (
    certificate_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id            BIGINT      NOT NULL,
    event_id           BIGINT      NOT NULL,
    certificate_number VARCHAR(40) NOT NULL,
    issued_at          DATETIME(6) NOT NULL,
    CONSTRAINT uk_certificates_number UNIQUE (certificate_number),
    CONSTRAINT uk_certificates_user_event UNIQUE (user_id, event_id),
    CONSTRAINT fk_certificates_user FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT fk_certificates_event FOREIGN KEY (event_id) REFERENCES events (event_id)
);

CREATE TABLE gallery_items (
    gallery_id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id         BIGINT,
    title            VARCHAR(150) NOT NULL,
    description      VARCHAR(1000),
    location         VARCHAR(255),
    before_image_url VARCHAR(500) NOT NULL,
    before_public_id VARCHAR(255),
    after_image_url  VARCHAR(500) NOT NULL,
    after_public_id  VARCHAR(255),
    completion_date  DATE,
    approved         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by       BIGINT,
    created_at       DATETIME(6)  NOT NULL,
    updated_at       DATETIME(6)  NOT NULL,
    CONSTRAINT fk_gallery_event FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE SET NULL,
    CONSTRAINT fk_gallery_creator FOREIGN KEY (created_by) REFERENCES users (user_id)
);
CREATE INDEX idx_gallery_approved ON gallery_items (approved);

CREATE TABLE report_status_history (
    history_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id  BIGINT       NOT NULL,
    old_status VARCHAR(30),
    new_status VARCHAR(30)  NOT NULL,
    changed_by BIGINT,
    comment    VARCHAR(500),
    changed_at DATETIME(6)  NOT NULL,
    CONSTRAINT fk_history_report FOREIGN KEY (report_id) REFERENCES reports (report_id) ON DELETE CASCADE,
    CONSTRAINT fk_history_user FOREIGN KEY (changed_by) REFERENCES users (user_id)
);
CREATE INDEX idx_history_report ON report_status_history (report_id);

CREATE TABLE password_reset_tokens (
    token_id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT       NOT NULL,
    token_hash VARCHAR(64)  NOT NULL,
    expires_at DATETIME(6)  NOT NULL,
    used       BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at DATETIME(6)  NOT NULL,
    CONSTRAINT uk_reset_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
);
