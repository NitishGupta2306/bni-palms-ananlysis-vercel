-- Clean up Supabase - Drop all old tables
DROP TABLE IF EXISTS auth_group_permissions CASCADE;
DROP TABLE IF EXISTS auth_user_groups CASCADE;
DROP TABLE IF EXISTS auth_user_user_permissions CASCADE;
DROP TABLE IF EXISTS auth_permission CASCADE;
DROP TABLE IF EXISTS auth_group CASCADE;
DROP TABLE IF EXISTS auth_user CASCADE;
DROP TABLE IF EXISTS django_admin_log CASCADE;
DROP TABLE IF EXISTS django_content_type CASCADE;
DROP TABLE IF EXISTS django_session CASCADE;
DROP TABLE IF EXISTS django_migrations CASCADE;
DROP TABLE IF EXISTS analytics_dataimportsession CASCADE;
DROP TABLE IF EXISTS analytics_referral CASCADE;
DROP TABLE IF EXISTS analytics_onetoone CASCADE;
DROP TABLE IF EXISTS analytics_tyfcb CASCADE;
DROP TABLE IF EXISTS chapters_chapter CASCADE;
DROP TABLE IF EXISTS chapters_member CASCADE;
DROP TABLE IF EXISTS chapters_monthlyreport CASCADE;
DROP TABLE IF EXISTS chapters_membermonthlystats CASCADE;

-- Create fresh lean schema
BEGIN;

-- Chapters table
CREATE TABLE chapters_chapter (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    location VARCHAR(200) NOT NULL,
    meeting_day VARCHAR(20) NOT NULL,
    meeting_time TIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Members table
CREATE TABLE chapters_member (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER NOT NULL REFERENCES chapters_chapter(id) ON DELETE CASCADE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL,
    business_name VARCHAR(200) NOT NULL DEFAULT '',
    classification VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    phone VARCHAR(20) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_date DATE NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(chapter_id, normalized_name)
);
CREATE INDEX idx_member_chapter ON chapters_member(chapter_id);
CREATE INDEX idx_member_normalized_name ON chapters_member(normalized_name);

-- Monthly Reports table
CREATE TABLE chapters_monthlyreport (
    id SERIAL PRIMARY KEY,
    chapter_id INTEGER NOT NULL REFERENCES chapters_chapter(id) ON DELETE CASCADE,
    month_year VARCHAR(7) NOT NULL,
    slip_audit_file VARCHAR(255) NOT NULL DEFAULT '',
    member_names_file VARCHAR(255) NULL,
    referral_matrix_data JSONB DEFAULT '{}',
    oto_matrix_data JSONB DEFAULT '{}',
    combination_matrix_data JSONB DEFAULT '{}',
    tyfcb_inside_data JSONB DEFAULT '{}',
    tyfcb_outside_data JSONB DEFAULT '{}',
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP NULL,
    UNIQUE(chapter_id, month_year)
);
CREATE INDEX idx_monthlyreport_chapter ON chapters_monthlyreport(chapter_id);

-- Member Monthly Stats table
CREATE TABLE chapters_membermonthlystats (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES chapters_member(id) ON DELETE CASCADE,
    monthly_report_id INTEGER NOT NULL REFERENCES chapters_monthlyreport(id) ON DELETE CASCADE,
    referrals_given INTEGER NOT NULL DEFAULT 0,
    referrals_received INTEGER NOT NULL DEFAULT 0,
    one_to_ones_completed INTEGER NOT NULL DEFAULT 0,
    tyfcb_inside_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tyfcb_outside_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    missing_otos JSONB DEFAULT '[]',
    missing_referrals_given_to JSONB DEFAULT '[]',
    missing_referrals_received_from JSONB DEFAULT '[]',
    priority_connections JSONB DEFAULT '[]',
    UNIQUE(member_id, monthly_report_id)
);
CREATE INDEX idx_memberstats_member ON chapters_membermonthlystats(member_id);
CREATE INDEX idx_memberstats_report ON chapters_membermonthlystats(monthly_report_id);

-- Referrals table
CREATE TABLE analytics_referral (
    id SERIAL PRIMARY KEY,
    giver_id INTEGER NOT NULL REFERENCES chapters_member(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES chapters_member(id) ON DELETE CASCADE,
    date_given DATE NOT NULL DEFAULT CURRENT_DATE,
    week_of DATE NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(giver_id, receiver_id, date_given)
);
CREATE INDEX idx_referral_giver ON analytics_referral(giver_id);
CREATE INDEX idx_referral_receiver ON analytics_referral(receiver_id);

-- One-to-One meetings table
CREATE TABLE analytics_onetoone (
    id SERIAL PRIMARY KEY,
    member1_id INTEGER NOT NULL REFERENCES chapters_member(id) ON DELETE CASCADE,
    member2_id INTEGER NOT NULL REFERENCES chapters_member(id) ON DELETE CASCADE,
    meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    week_of DATE NULL,
    location VARCHAR(200) NOT NULL DEFAULT '',
    duration_minutes INTEGER NULL CHECK (duration_minutes >= 0),
    notes TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_onetoone_member1 ON analytics_onetoone(member1_id);
CREATE INDEX idx_onetoone_member2 ON analytics_onetoone(member2_id);

-- TYFCB table
CREATE TABLE analytics_tyfcb (
    id SERIAL PRIMARY KEY,
    receiver_id INTEGER NOT NULL REFERENCES chapters_member(id) ON DELETE CASCADE,
    giver_id INTEGER NULL REFERENCES chapters_member(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'AED',
    within_chapter BOOLEAN NOT NULL DEFAULT true,
    date_closed DATE NOT NULL DEFAULT CURRENT_DATE,
    week_of DATE NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tyfcb_receiver ON analytics_tyfcb(receiver_id);
CREATE INDEX idx_tyfcb_giver ON analytics_tyfcb(giver_id);

COMMIT;
