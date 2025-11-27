USE patient_system;
GO
CREATE USER node_user FOR LOGIN node_user;
ALTER ROLE db_owner ADD MEMBER node_user;
GO

