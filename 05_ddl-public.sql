-- Create auth_user table in public schema (Django auth table)
CREATE TABLE IF NOT EXISTS auth_user (
    id SERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(150) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add column comments for auth_user
COMMENT ON TABLE auth_user IS 'Django User model - stores user authentication information';
COMMENT ON COLUMN auth_user.id IS 'Primary key for the user';
COMMENT ON COLUMN auth_user.password IS 'Hashed password';
COMMENT ON COLUMN auth_user.last_login IS 'Timestamp of last login';
COMMENT ON COLUMN auth_user.is_superuser IS 'Whether user has superuser privileges';
COMMENT ON COLUMN auth_user.username IS 'Unique username';
COMMENT ON COLUMN auth_user.first_name IS 'User first name';
COMMENT ON COLUMN auth_user.last_name IS 'User last name';
COMMENT ON COLUMN auth_user.email IS 'User email address';
COMMENT ON COLUMN auth_user.is_staff IS 'Whether user can access admin interface';
COMMENT ON COLUMN auth_user.is_active IS 'Whether user account is active';
COMMENT ON COLUMN auth_user.date_joined IS 'Timestamp when user account was created';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_auth_user_username ON auth_user(username);
CREATE INDEX IF NOT EXISTS idx_auth_user_email ON auth_user(email);
CREATE INDEX IF NOT EXISTS idx_auth_user_is_active ON auth_user(is_active);

-- Create Profile table in public schema (matches Django default behavior)
CREATE TABLE IF NOT EXISTS profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    email VARCHAR(254),
    phone VARCHAR(20),
    company VARCHAR(255),
    position VARCHAR(255),
    bio TEXT,
    avatar VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add column comments
COMMENT ON TABLE profile IS 'User profiles table - stores additional user information';
COMMENT ON COLUMN profile.id IS 'Primary key for the profile';
COMMENT ON COLUMN profile.user_id IS 'Foreign key reference to auth_user.id';
COMMENT ON COLUMN profile.first_name IS 'User first name';
COMMENT ON COLUMN profile.last_name IS 'User last name';
COMMENT ON COLUMN profile.email IS 'User email address';
COMMENT ON COLUMN profile.phone IS 'User phone number';
COMMENT ON COLUMN profile.company IS 'User company name';
COMMENT ON COLUMN profile.position IS 'User job position';
COMMENT ON COLUMN profile.bio IS 'User biography/description';
COMMENT ON COLUMN profile.avatar IS 'Path to user avatar image';
COMMENT ON COLUMN profile.is_active IS 'Whether the profile is active';
COMMENT ON COLUMN profile.created_at IS 'Timestamp when the profile was created';
COMMENT ON COLUMN profile.updated_at IS 'Timestamp when the profile was last updated';

-- Add foreign key constraint for profile table
ALTER TABLE profile ADD CONSTRAINT fk_profile_user_id FOREIGN KEY (user_id) REFERENCES auth_user(id);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_profile_user_id ON profile(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_email ON profile(email);
CREATE INDEX IF NOT EXISTS idx_profile_is_active ON profile(is_active);

-- Grant permissions for auth_user table
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_user TO dynamic_writer;
GRANT SELECT ON auth_user TO webapp_writer;
GRANT USAGE, SELECT ON SEQUENCE auth_user_id_seq TO dynamic_writer;

-- Grant permissions for profile table
GRANT SELECT, INSERT, UPDATE, DELETE ON profile TO dynamic_writer;
GRANT SELECT ON profile TO webapp_writer;
GRANT USAGE, SELECT ON SEQUENCE profile_id_seq TO dynamic_writer;

-- Insert default gsheets user for spreadsheet operations
INSERT INTO auth_user (username, email, first_name, last_name, password, is_active, is_staff, is_superuser, date_joined)
VALUES ('gsheets', 'gsheets@dynamic-pricing.com', 'Google', 'Sheets', '', TRUE, FALSE, FALSE, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;
