-- Community Clean-Up Portal: core schema (users, reports, events, participants, photos, badges, feedback)

CREATE TABLE users (
    user_id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(100)  NOT NULL,
    email             VARCHAR(150)  NOT NULL,
    password          VARCHAR(100)  NOT NULL,
    role              VARCHAR(20)   NOT NULL,
    phone             VARCHAR(20),
    organization_name VARCHAR(150),
    points            INT           NOT NULL DEFAULT 0,
    active            BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        DATETIME(6)   NOT NULL,
    updated_at        DATETIME(6)   NOT NULL,
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT ck_users_role CHECK (role IN ('RESIDENT', 'VOLUNTEER', 'NGO', 'ADMIN'))
);
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_points ON users (points);

CREATE TABLE reports (
    report_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT        NOT NULL,
    title         VARCHAR(150)  NOT NULL,
    description   TEXT          NOT NULL,
    location      VARCHAR(255)  NOT NULL,
    latitude      DECIMAL(10, 7),
    longitude     DECIMAL(10, 7),
    waste_type    VARCHAR(30)   NOT NULL,
    urgency       VARCHAR(20)   NOT NULL,
    status        VARCHAR(30)   NOT NULL,
    admin_comment VARCHAR(500),
    created_date  DATETIME(6)   NOT NULL,
    updated_date  DATETIME(6)   NOT NULL,
    CONSTRAINT fk_reports_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);
CREATE INDEX idx_reports_status ON reports (status);
CREATE INDEX idx_reports_user ON reports (user_id);
CREATE INDEX idx_reports_created ON reports (created_date);

CREATE TABLE events (
    event_id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    created_by          BIGINT        NOT NULL,
    related_report_id   BIGINT,
    title               VARCHAR(150)  NOT NULL,
    description         TEXT          NOT NULL,
    event_date          DATE          NOT NULL,
    start_time          TIME          NOT NULL,
    end_time            TIME,
    location            VARCHAR(255)  NOT NULL,
    latitude            DECIMAL(10, 7),
    longitude           DECIMAL(10, 7),
    volunteers_required INT           NOT NULL,
    status              VARCHAR(20)   NOT NULL,
    created_at          DATETIME(6)   NOT NULL,
    updated_at          DATETIME(6)   NOT NULL,
    CONSTRAINT fk_events_creator FOREIGN KEY (created_by) REFERENCES users (user_id),
    CONSTRAINT fk_events_report FOREIGN KEY (related_report_id) REFERENCES reports (report_id),
    CONSTRAINT ck_events_volunteers CHECK (volunteers_required > 0)
);
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_date ON events (event_date);
CREATE INDEX idx_events_creator ON events (created_by);

CREATE TABLE event_participants (
    participant_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id          BIGINT      NOT NULL,
    user_id           BIGINT      NOT NULL,
    registration_date DATETIME(6) NOT NULL,
    attendance        BOOLEAN     NOT NULL DEFAULT FALSE,
    CONSTRAINT uk_participant_event_user UNIQUE (event_id, user_id),
    CONSTRAINT fk_participants_event FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE,
    CONSTRAINT fk_participants_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);
CREATE INDEX idx_participants_user ON event_participants (user_id);

CREATE TABLE photos (
    photo_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_id     BIGINT,
    event_id      BIGINT,
    photo_url     VARCHAR(500) NOT NULL,
    public_id     VARCHAR(255),
    photo_type    VARCHAR(10)  NOT NULL,
    uploaded_by   BIGINT,
    uploaded_date DATETIME(6)  NOT NULL,
    CONSTRAINT fk_photos_report FOREIGN KEY (report_id) REFERENCES reports (report_id) ON DELETE CASCADE,
    CONSTRAINT fk_photos_event FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE,
    CONSTRAINT fk_photos_uploader FOREIGN KEY (uploaded_by) REFERENCES users (user_id),
    CONSTRAINT ck_photos_type CHECK (photo_type IN ('REPORT', 'BEFORE', 'AFTER'))
);
CREATE INDEX idx_photos_report ON photos (report_id);
CREATE INDEX idx_photos_event ON photos (event_id);

CREATE TABLE badges (
    badge_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id      BIGINT      NOT NULL,
    badge_name   VARCHAR(40) NOT NULL,
    awarded_date DATETIME(6) NOT NULL,
    CONSTRAINT uk_badges_user_name UNIQUE (user_id, badge_name),
    CONSTRAINT fk_badges_user FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE TABLE feedback (
    feedback_id    BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT      NOT NULL,
    event_id       BIGINT      NOT NULL,
    rating         INT         NOT NULL,
    comments       VARCHAR(1000),
    submitted_date DATETIME(6) NOT NULL,
    CONSTRAINT uk_feedback_user_event UNIQUE (user_id, event_id),
    CONSTRAINT fk_feedback_user FOREIGN KEY (user_id) REFERENCES users (user_id),
    CONSTRAINT fk_feedback_event FOREIGN KEY (event_id) REFERENCES events (event_id) ON DELETE CASCADE,
    CONSTRAINT ck_feedback_rating CHECK (rating BETWEEN 1 AND 5)
);
