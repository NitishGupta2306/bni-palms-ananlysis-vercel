-- Reset Database Script for BNI Analytics
-- WARNING: This will DELETE ALL DATA and recreate tables
-- Use with caution!

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS analytics_referral CASCADE;
DROP TABLE IF EXISTS analytics_onetoone CASCADE;
DROP TABLE IF EXISTS analytics_tyfcb CASCADE;
DROP TABLE IF EXISTS reports_membermonthlystats CASCADE;
DROP TABLE IF EXISTS reports_monthlyreport CASCADE;
DROP TABLE IF EXISTS members_member CASCADE;
DROP TABLE IF EXISTS chapters_chapter CASCADE;
DROP TABLE IF EXISTS django_migrations CASCADE;
DROP TABLE IF EXISTS django_content_type CASCADE;
DROP TABLE IF EXISTS auth_permission CASCADE;
DROP TABLE IF EXISTS auth_group_permissions CASCADE;
DROP TABLE IF EXISTS auth_group CASCADE;
DROP TABLE IF EXISTS auth_user_groups CASCADE;
DROP TABLE IF EXISTS auth_user_user_permissions CASCADE;
DROP TABLE IF EXISTS auth_user CASCADE;
DROP TABLE IF EXISTS django_admin_log CASCADE;
DROP TABLE IF EXISTS django_session CASCADE;

-- Recreate tables with correct schema

-- Django migrations table
CREATE TABLE django_migrations (
    id SERIAL PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Chapters
CREATE TABLE chapters_chapter (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    location VARCHAR(200) NOT NULL DEFAULT 'Dubai',
    meeting_day VARCHAR(50) NOT NULL DEFAULT '',
    meeting_time TIME NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Members
CREATE TABLE members_member (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER NOT NULL REFERENCES chapters_chapter(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(200) NOT NULL,
    business_name VARCHAR(200) NOT NULL DEFAULT '',
    classification VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    phone VARCHAR(20) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_date DATE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT members_member_chapter_normalized_name_unique UNIQUE (chapter_id, normalized_name)
);

CREATE INDEX members_member_chapter_id_idx ON members_member(chapter_id);
CREATE INDEX members_member_normalized_name_idx ON members_member(normalized_name);

-- Referrals (NO UNIQUE CONSTRAINT to allow multiple referrals)
CREATE TABLE analytics_referral (
    id SERIAL PRIMARY KEY,
    giver_id INTEGER NOT NULL REFERENCES members_member(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES members_member(id) ON DELETE CASCADE,
    date_given DATE NOT NULL DEFAULT CURRENT_DATE,
    week_of DATE NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX analytics_referral_giver_id_idx ON analytics_referral(giver_id);
CREATE INDEX analytics_referral_receiver_id_idx ON analytics_referral(receiver_id);
CREATE INDEX analytics_referral_date_given_idx ON analytics_referral(date_given);

-- One-to-One Meetings
CREATE TABLE analytics_onetoone (
    id SERIAL PRIMARY KEY,
    member1_id INTEGER NOT NULL REFERENCES members_member(id) ON DELETE CASCADE,
    member2_id INTEGER NOT NULL REFERENCES members_member(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    week_of DATE NULL,
    location VARCHAR(200) NOT NULL DEFAULT '',
    duration_minutes INTEGER NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX analytics_onetoone_member1_id_idx ON analytics_onetoone(member1_id);
CREATE INDEX analytics_onetoone_member2_id_idx ON analytics_onetoone(member2_id);
CREATE INDEX analytics_onetoone_meeting_date_idx ON analytics_onetoone(meeting_date);

-- TYFCB (Thank You For Closed Business)
CREATE TABLE analytics_tyfcb (
    id SERIAL PRIMARY KEY,
    receiver_id INTEGER NOT NULL REFERENCES members_member(id) ON DELETE CASCADE,
    giver_id INTEGER NULL REFERENCES members_member(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'AED',
    within_chapter BOOLEAN NOT NULL DEFAULT TRUE,
    date_closed DATE NOT NULL DEFAULT CURRENT_DATE,
    week_of DATE NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX analytics_tyfcb_receiver_id_idx ON analytics_tyfcb(receiver_id);
CREATE INDEX analytics_tyfcb_giver_id_idx ON analytics_tyfcb(giver_id);
CREATE INDEX analytics_tyfcb_date_closed_idx ON analytics_tyfcb(date_closed);

-- Monthly Reports
CREATE TABLE reports_monthlyreport (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER NOT NULL REFERENCES chapters_chapter(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL,
    slip_audit_file VARCHAR(255) NOT NULL DEFAULT '',
    member_names_file VARCHAR(255) NULL,
    processed_at TIMESTAMP WITH TIME ZONE NULL,
    referral_matrix_data JSONB NULL,
    oto_matrix_data JSONB NULL,
    combination_matrix_data JSONB NULL,
    tyfcb_inside_data JSONB NULL,
    tyfcb_outside_data JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT reports_monthlyreport_chapter_month_unique UNIQUE (chapter_id, month_year)
);

CREATE INDEX reports_monthlyreport_chapter_id_idx ON reports_monthlyreport(chapter_id);
CREATE INDEX reports_monthlyreport_month_year_idx ON reports_monthlyreport(month_year);

-- Member Monthly Stats
CREATE TABLE reports_membermonthlystats (
    id SERIAL PRIMARY KEY,
    monthly_report_id INTEGER NOT NULL REFERENCES reports_monthlyreport(id) ON DELETE CASCADE,
    member_id INTEGER NOT NULL REFERENCES members_member(id) ON DELETE CASCADE,
    referrals_given INTEGER NOT NULL DEFAULT 0,
    referrals_received INTEGER NOT NULL DEFAULT 0,
    one_to_ones_completed INTEGER NOT NULL DEFAULT 0,
    tyfcb_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tyfcb_given NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    missing_referrals_to JSONB NULL,
    missing_one_to_ones_with JSONB NULL,
    priority_connections JSONB NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT reports_membermonthlystats_report_member_unique UNIQUE (monthly_report_id, member_id)
);

CREATE INDEX reports_membermonthlystats_monthly_report_id_idx ON reports_membermonthlystats(monthly_report_id);
CREATE INDEX reports_membermonthlystats_member_id_idx ON reports_membermonthlystats(member_id);

-- Insert initial migration records
INSERT INTO django_migrations (app, name, applied) VALUES
    ('contenttypes', '0001_initial', NOW()),
    ('contenttypes', '0002_remove_content_type_name', NOW()),
    ('auth', '0001_initial', NOW()),
    ('auth', '0002_alter_permission_name_max_length', NOW()),
    ('auth', '0003_alter_user_email_max_length', NOW()),
    ('auth', '0004_alter_user_username_opts', NOW()),
    ('auth', '0005_alter_user_last_login_null', NOW()),
    ('auth', '0006_require_contenttypes_0002', NOW()),
    ('auth', '0007_alter_validators_add_error_messages', NOW()),
    ('auth', '0008_alter_user_username_max_length', NOW()),
    ('auth', '0009_alter_user_last_name_max_length', NOW()),
    ('auth', '0010_alter_group_name_max_length', NOW()),
    ('auth', '0011_update_proxy_permissions', NOW()),
    ('auth', '0012_alter_user_first_name_max_length', NOW()),
    ('chapters', '0001_initial', NOW()),
    ('members', '0001_initial', NOW()),
    ('analytics', '0001_initial', NOW()),
    ('analytics', '0002_remove_referral_unique_constraint', NOW()),
    ('reports', '0001_initial', NOW());

-- Success message
SELECT 'Database reset complete! All tables recreated with latest schema.' as message;
