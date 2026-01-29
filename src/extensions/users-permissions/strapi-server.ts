// src/extensions/users-permissions/strapi-server.ts

export default (plugin: any) => {
  console.log("🔥 [SUCESSO] Extensão carregada! Pronto para interceptar cadastros.");

  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx: any) => {
    console.log("🔥 [REGISTER] 1. Nova tentativa de cadastro recebida.");

    // 1. CAPTURA E LIMPEZA
    // Separamos o que é do Strapi (email/user/pass) do que é nosso (customFields)
    const { email, username, password, ...customFields } = ctx.request.body;

    // AQUI ESTÁ O SEGREDO:
    // Substituímos o corpo da requisição apenas pelo que o Strapi original aceita.
    // Isso IMPEDE o erro "Invalid parameters".
    ctx.request.body = { email, username, password };

    try {
      // 2. CRIAÇÃO DO USUÁRIO (E ENVIO DE E-MAIL)
      // Chamamos o registro original. Como o body está limpo, ele não vai reclamar.
      await originalRegister(ctx);
    } catch (err) {
      console.error("🔥 [ERRO] O registro original falhou:", err);
      throw err;
    }

    // 3. SALVAMENTO DOS DADOS EXTRAS
    // Se o usuário foi criado com sucesso (status 200), salvamos o resto.
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;
      
      console.log(`🔥 [REGISTER] 2. Usuário ID ${userId} criado! Salvando dados extras (CPF, Endereço)...`);

      // Usamos o entityService para atualizar o usuário.
      // Ele ignora validações de rota e permissões, gravando direto no banco.
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: customFields
      });

      // Buscamos os dados atualizados para devolver ao Frontend já com tudo preenchido
      const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      ctx.response.body.user = updatedUser;
      
      console.log("🔥 [REGISTER] 3. Sucesso total! Dados salvos.");
    }
  };

  return plugin;
};