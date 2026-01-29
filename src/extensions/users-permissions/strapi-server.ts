export default (plugin: any) => {
  // 1. Guardamos o controller original
  const originalRegister = plugin.controllers.auth.register;

  // 2. Criamos o nosso controller customizado
  plugin.controllers.auth['registerCustom'] = async (ctx: any) => {
    console.log("🔥 [CUSTOM REGISTER] Recebido:", ctx.request.body.email);

    const { email, username, password, ...customFields } = ctx.request.body;

    // Prepara o corpo para o registro padrão (só o básico)
    ctx.request.body = { email, username, password };

    try {
      // Chama o registro padrão
      await originalRegister(ctx);
    } catch (err) {
      throw err;
    }

    // Se criou, salva os extras
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;
      
      console.log("✅ [SUCESSO] Salvando extras para ID:", userId);
      
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: customFields
      });

      const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      ctx.response.body.user = updatedUser;
    }
  };

  // 3. Adicionamos a nova rota nas configurações do plugin
  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/auth/local/register-custom', // <--- NOVA ROTA
    handler: 'auth.registerCustom',
    config: {
      prefix: '',
      policies: []
    }
  });

  return plugin;
};