// src/extensions/users-permissions/strapi-server.ts

// MANTENHA O LOG PARA SABERMOS SE FUNCIONOU
console.log("🔥 [DIAGNOSTICO] ARQUIVO CARREGADO! O Strapi leu sua extensão.");

module.exports = (plugin: any) => {
  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx: any) => {
    console.log("🔥 [DIAGNOSTICO] Rota /register acessada. Limpando dados...");

    // 1. Separa os dados extras (CPF, Rua, etc)
    const { email, username, password, ...customFields } = ctx.request.body;

    // 2. Limpa o corpo da requisição para o Strapi Original não reclamar
    ctx.request.body = { email, username, password };

    try {
      // 3. Chama o registro original (cria usuário + envia email)
      await originalRegister(ctx);
    } catch (err) {
      console.error("🔥 [ERRO] Falha no registro original:", err);
      throw err;
    }

    // 4. Se chegou aqui, o usuário foi criado. Vamos salvar os extras.
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;
      
      console.log(`🔥 [SUCESSO] Usuário ${userId} criado. Salvando CPF/Endereço...`);

      // Usa entityService para pular validação de "user confirmed"
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: customFields
      });

      // Atualiza o retorno para o frontend
      const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      ctx.response.body.user = updatedUser;
    }
  };

  return plugin;
};