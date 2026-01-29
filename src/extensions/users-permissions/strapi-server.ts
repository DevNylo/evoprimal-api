// src/extensions/users-permissions/strapi-server.ts

// Usamos module.exports para garantir que o Strapi carregue em modo CommonJS
module.exports = (plugin: any) => {
  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx: any) => {
    // 1. Limpeza dos dados (Tira CPF/Rua da frente do validador)
    const { email, username, password, ...customFields } = ctx.request.body;

    // Engana o Strapi original entregando só o básico
    ctx.request.body = { email, username, password };

    try {
      // 2. Chama o registro original
      await originalRegister(ctx);
    } catch (err) {
      throw err;
    }

    // 3. Se o usuário foi criado (mesmo que confirmed=false), salvamos os dados extras
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;

      // Usamos o EntityService que tem "super poderes" para pular permissões e validações
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: customFields
      });

      // Busca o usuário atualizado para devolver ao Frontend
      const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      ctx.response.body.user = updatedUser;
    }
  };

  return plugin;
};