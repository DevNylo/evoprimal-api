// -----------------------------------------------------------------------------
// SINAL DE FUMAÇA 1: Se isso não aparecer no log, o Render não compilou o arquivo.
console.log("🔥 [SYSTEM] O arquivo strapi-server.ts foi CARREGADO pelo Node.js!");
// -----------------------------------------------------------------------------

module.exports = (plugin: any) => {
  // SINAL DE FUMAÇA 2: Se isso não aparecer, o Strapi ignorou a exportação.
  console.log("🔥 [SYSTEM] Inicializando extensão do plugin Users-Permissions...");

  const originalRegister = plugin.controllers.auth.register;

  // Substituição do Controller
  plugin.controllers.auth.register = async (ctx: any) => {
    console.log("🔥 [REGISTER] Requisição interceptada!");

    // 1. Captura e Limpeza
    const { email, username, password, ...customFields } = ctx.request.body;
    
    // Log para debug (ver o que chegou)
    console.log(`🔥 [DEBUG] Dados extras recebidos: ${Object.keys(customFields).join(', ')}`);

    // Limpa o body para o Strapi aceitar
    ctx.request.body = { email, username, password };

    try {
      // 2. Registro Original (Cria User + Manda Email)
      await originalRegister(ctx);
    } catch (err) {
      console.error("🔥 [ERRO] Falha no registro original:", err);
      throw err;
    }

    // 3. Salva os dados extras
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;
      console.log(`🔥 [SUCESSO] User ${userId} criado. Gravando extras...`);

      try {
        await strapi.entityService.update('plugin::users-permissions.user', userId, {
            data: customFields
        });
        
        // Atualiza retorno
        const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
        ctx.response.body.user = updatedUser;
        console.log("🔥 [SUCESSO] Tudo salvo!");
      } catch (saveError) {
         console.error("🔥 [ERRO] Falha ao salvar dados extras:", saveError);
         // Não damos throw aqui para não cancelar o cadastro, apenas logamos o erro de perfil
      }
    }
  };

  return plugin;
};