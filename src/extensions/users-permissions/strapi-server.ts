// Mantivemos o log para você confirmar no Render que carregou
console.log("🔥 [BACKEND] O arquivo strapi-server.ts foi lido!");

module.exports = (plugin: any) => {
  console.log("🔥 [BACKEND] Plugin carregado. Substituindo controller de registro...");

  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx: any) => {
    console.log("🔥 [REGISTER] Recebendo nova requisição...");

    // 1. CAPTURA: Separa email/senha dos dados extras (CPF, Rua, etc)
    const { email, username, password, ...customFields } = ctx.request.body;

    // 2. LIMPEZA: Engana o Strapi entregando só o que ele aceita
    // Isso evita o erro 400 "Invalid parameters"
    ctx.request.body = { email, username, password };

    try {
      // 3. REGISTRO: Cria o usuário e envia o e-mail de confirmação
      await originalRegister(ctx);
    } catch (err) {
      console.error("🔥 [ERRO] Falha no registro original:", err);
      throw err;
    }

    // 4. PERSISTÊNCIA: Se criou, salva o CPF e Endereço à força
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;
      
      console.log(`🔥 [REGISTER] Salvando dados extras para usuário ID: ${userId}`);

      // O entityService ignora se o email está confirmado ou não
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