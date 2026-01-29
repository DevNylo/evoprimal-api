export default (plugin: any) => {
  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx: any) => {
    // 1. Separa os dados (limpeza)
    const { email, username, password, ...customFields } = ctx.request.body;

    // 2. Engana o validador padrão entregando só o básico
    ctx.request.body = { email, username, password };

    // 3. Executa o registro padrão
    try {
      await originalRegister(ctx);
    } catch (err) {
      throw err;
    }

    // 4. Se criou, salva os dados extras (CPF, Rua, etc)
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;

      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: customFields
      });

      const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      ctx.response.body.user = updatedUser;
    }
  };

  return plugin;
};