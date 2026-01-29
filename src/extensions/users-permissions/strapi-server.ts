export default (plugin: any) => {
  // 1. Guarda o registro original do Strapi
  const originalRegister = plugin.controllers.auth.register;

  // 2. SUBSTITUI o método "register" oficial pelo nosso
  plugin.controllers.auth.register = async (ctx: any) => {
    
    // Separa os dados: O que é padrão vs O que é extra
    const { email, username, password, ...customFields } = ctx.request.body;

    // --- O TRUQUE DE MESTRE ---
    // Nós limpamos o body da requisição, deixando só o que o Strapi original aceita.
    // Assim, ele NÃO vai dar o erro "Invalid parameters".
    ctx.request.body = { email, username, password };

    try {
      // Chama o registro original (agora seguro, pois está limpo)
      await originalRegister(ctx);
    } catch (err) {
      throw err;
    }

    // Se o usuário foi criado com sucesso...
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;

      // Injetamos os dados extras usando o EntityService (que ignora validações chatas)
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: customFields
      });

      // Busca o usuário atualizado para devolver ao Frontend completo
      const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      ctx.response.body.user = updatedUser;
    }
  };

  return plugin;
};