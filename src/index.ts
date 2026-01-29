// src/index.ts

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register({ strapi }: { strapi: any }) {
    console.log("🔥 [INDEX] Injetando lógica de cadastro via src/index.ts...");

    // 1. Acessamos o plugin de usuários programaticamente
    const usersPermissionsPlugin = strapi.plugin('users-permissions');
    
    // 2. Guardamos o controller original
    const originalRegister = usersPermissionsPlugin.controllers.auth.register;

    // 3. Sobrescrevemos a função register DIRETAMENTE na memória do plugin
    usersPermissionsPlugin.controllers.auth.register = async (ctx: any) => {
      console.log("🔥 [REGISTER] Requisição interceptada via Index!");

      const { email, username, password, ...customFields } = ctx.request.body;

      // Limpa para o Strapi aceitar
      ctx.request.body = { email, username, password };

      try {
        // Chama original
        await originalRegister(ctx);
      } catch (err) {
        console.error("🔥 [ERRO] Falha no registro original:", err);
        throw err;
      }

      // Salva dados extras
      if (ctx.response.status === 200 && ctx.response.body.user) {
        const userId = ctx.response.body.user.id;
        console.log(`🔥 [SUCESSO] User ${userId} criado. Salvando dados extras...`);

        try {
          await strapi.entityService.update('plugin::users-permissions.user', userId, {
            data: customFields
          });
          
          // Atualiza retorno
          const updatedUser = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
          ctx.response.body.user = updatedUser;
          console.log("🔥 [SUCESSO] Dados salvos com sucesso!");
        } catch (saveError) {
           console.error("🔥 [ERRO] Falha ao salvar extras:", saveError);
        }
      }
    };

    console.log("🔥 [INDEX] Lógica injetada com sucesso!");
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  bootstrap(/*{ strapi }*/) {},
};