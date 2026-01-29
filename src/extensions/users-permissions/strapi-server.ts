// src/extensions/users-permissions/strapi-server.ts

module.exports = (plugin: any) => {
  // 1. Guardamos a função original de registro para usar depois
  const originalRegister = plugin.controllers.auth.register;

  // 2. Criamos nossa própria função de registro (Blindada)
  plugin.controllers.auth.registerWithExtras = async (ctx: any) => {
    console.log("🔥 [HIJACK] Rota sequestrada com sucesso! Processando...");

    // A. Separa o que é do Strapi do que é nosso
    const { email, username, password, ...customFields } = ctx.request.body;

    // B. Limpa o corpo da requisição para enganar o validador original
    ctx.request.body = { email, username, password };

    try {
      // C. Chama o registro original (agora ele aceita porque limpamos os dados)
      await originalRegister(ctx);
    } catch (err) {
      console.error("🔥 [ERRO] Falha no registro original:", err);
      throw err;
    }

    // D. Se criou, salvamos os dados extras
    if (ctx.response.status === 200 && ctx.response.body.user) {
      const userId = ctx.response.body.user.id;
      
      console.log(`🔥 [SUCESSO] Usuário ${userId} criado. Gravando CPF e Endereço...`);

      await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: customFields
      });

      // Busca usuário atualizado para retornar
      const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      ctx.response.body.user = updatedUser;
    }
  };

  // 3. AQUI ESTÁ O TRUQUE: Alteramos a Rota na força bruta
  // Procuramos a rota que aponta para '/auth/local/register' e mudamos o dono dela.
  const routes = plugin.routes['content-api'].routes;
  
  const registerRoute = routes.find((route: any) => 
    route.path === '/auth/local/register' && route.method === 'POST'
  );

  if (registerRoute) {
    console.log("🔥 [CONFIG] Rota /register encontrada. Redirecionando para registerWithExtras...");
    registerRoute.handler = 'auth.registerWithExtras'; // Aponta para a nossa função
  } else {
    console.error("⚠️ [PERIGO] Não encontrei a rota /auth/local/register para modificar!");
  }

  return plugin;
};