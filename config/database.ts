import path from 'path';

export default ({ env }) => {
  // O Render define NODE_ENV como 'production' automaticamente
  if (env('NODE_ENV') === 'production') {
    const parse = require('pg-connection-string').parse;
    const config = parse(env('DATABASE_URL')); // Lê a URL do Postgres

    return {
      connection: {
        client: 'postgres',
        connection: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
          ssl: {
            rejectUnauthorized: false, // CRÍTICO para o Render
          },
        },
        debug: false,
      },
    };
  }

  // Configuração Local (Seu PC)
  return {
    connection: {
      client: 'sqlite',
      connection: {
        filename: path.join(__dirname, '..', '..', '.tmp/data.db'),
      },
      useNullAsDefault: true,
    },
  };
};