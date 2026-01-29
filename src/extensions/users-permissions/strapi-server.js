module.exports = (plugin) => {
  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx) => {
    // 1. Separa os dados Padrão dos dados Personalizados
    const { 
      email, 
      username, 
      password, 
      ...customFields // Aqui ficam cpf, street, phone, etc.
    } = ctx.request.body;

    // 2. LIMPA o corpo da requisição
    // Deixamos apenas o que o Strapi original espera receber.
    // Isso evita o erro "Invalid parameters".
    ctx.request.body = { email, username, password };

    // 3. Chama o registro original (agora seguro)
    try {
      await originalRegister(ctx);
    } catch (err) {
      throw err;
    }

    // 4. Se o usuário foi criado com sucesso...
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;

      // 5. Atualiza o usuário com os campos personalizados que separamos antes
      // O EntityService ignora validações de rota, então ele aceita salvar.
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: customFields
      });

      // 6. Busca o usuário atualizado para devolver ao Frontend
      const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      
      // Atualiza a resposta final
      ctx.response.body.user = updatedUser;
    }
  };

  return plugin;
};