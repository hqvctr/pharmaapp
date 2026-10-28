-- Login por código de e-mail: marca quando a pessoa provou o e-mail (primeiro código válido). Serve a
-- `Usuario.metodos_login` ("métodos já usados por esta conta"): conta criada pelo Google não usou o e-mail.
ALTER TABLE users ADD COLUMN email_verificado_em timestamptz;
