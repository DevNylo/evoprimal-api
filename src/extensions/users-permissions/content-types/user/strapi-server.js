// ARQUIVO: src/extensions/users-permissions/strapi-server.js

module.exports = (plugin) => {
  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx) => {
    // 1. Captura os dados que vieram do site (CPF, Rua, etc)
    const { 
      full_name, cpf, phone, cep, street, number, 
      neighborhood, city, state, complement 
    } = ctx.request.body;

    // 2. Executa o cadastro padrão (Cria User + Envia Email)
    await originalRegister(ctx);

    // 3. Se o usuário foi criado com sucesso...
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;

      // 4. Força a atualização dos campos extras (Bypassing validação de email)
      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: {
          full_name, cpf, phone, cep, street, number, 
          neighborhood, city, state, complement
        }
      });

      // 5. Atualiza o objeto de retorno para o Frontend já receber tudo pronto
      const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      ctx.response.body.user = updatedUser;
    }
  };

  return plugin;
};