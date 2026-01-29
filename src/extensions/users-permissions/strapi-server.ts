// src/extensions/users-permissions/strapi-server.ts

module.exports = (plugin: any) => {
  // 1. Guardamos a função original (que sabe criar usuário e mandar e-mail)
  const originalRegister = plugin.controllers.auth.register;

  // 2. SUBSTITUÍMOS a função 'register' pela nossa versão turbinada.
  // Mantemos o mesmo nome para não dar erro de "Handler not found".
  plugin.controllers.auth.register = async (ctx: any) => {
    console.log("🔥 [REGISTER] Interceptado com sucesso!");

    // A. Captura os dados extras (CPF, Rua, etc)
    const { email, username, password, ...customFields } = ctx.request.body;

    // B. Limpa o corpo da requisição. 
    // Isso engana o validador original do Strapi, evitando o erro 400.
    ctx.request.body = { email, username, password };

    try {
      // C. Chama o original (que agora aceita os dados "limpos")
      await originalRegister(ctx);
    } catch (err) {
      console.error("🔥 [ERRO] Falha no registro original:", err);
      throw err;
    }

    // D. Se o usuário foi criado, salvamos os dados extras
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;
      
      console.log(`🔥 [SUCESSO] Usuário ${userId} criado. Salvando CPF/Endereço...`);

      // O entityService salva direto no banco, ignorando validações de rota
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