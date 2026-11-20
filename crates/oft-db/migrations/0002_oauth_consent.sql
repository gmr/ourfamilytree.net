-- After sign-in, a request waits for the administrator to approve the client on a consent page.
ALTER TABLE oauth_request ADD COLUMN user_id uuid REFERENCES app_user (id) ON DELETE CASCADE;
ALTER TABLE oauth_client ALTER COLUMN name SET DEFAULT '';
