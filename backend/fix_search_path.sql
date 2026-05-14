ALTER DATABASE postgres SET search_path TO "$user", public;
ALTER ROLE postgres SET search_path TO "$user", public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
