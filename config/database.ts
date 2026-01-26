import path from 'path';

export default ({ env }) => {
  // Verifica se estamos rodando no Render (Produção)
  if (env('NODE_ENV') === 'production') {
    const parse = require('pg-connection-string').parse;
    const config = parse(env('DATABASE_URL')); // Lê a URL que você pegou

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
            rejectUnauthorized: false, // Obrigatório para o Render aceitar a conexão
          },
        },
        debug: false,
      },
    };
  }

  // Se não for produção, usa o SQLite local (seu PC)
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