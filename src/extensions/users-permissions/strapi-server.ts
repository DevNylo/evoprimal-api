// ATENÇÃO: Se este log não aparecer no Render, o arquivo está no lugar errado ou sendo ignorado.
console.log("🔥 [DIAGNOSTICO] 1. O arquivo strapi-server.ts foi LIDO pelo Strapi!");

export default (plugin: any) => {
  console.log("🔥 [DIAGNOSTICO] 2. O plugin users-permissions carregou esta extensão!");

  const originalRegister = plugin.controllers.auth.register;

  plugin.controllers.auth.register = async (ctx: any) => {
    console.log("🔥 [DIAGNOSTICO] 3. Rota /register interceptada!");
    console.log("🔥 [DIAGNOSTICO] 4. Dados recebidos:", JSON.stringify(ctx.request.body));

    // Tenta executar o original sem mexer em nada, só para ver se o log acima sai.
    // Se der erro de Invalid Parameters aqui, confirmamos que a interceptação funcionou 
    // (porque vimos o log 3 e 4) mas a limpeza falhou.
    try {
        await originalRegister(ctx);
    } catch (err) {
        console.error("🔥 [DIAGNOSTICO] 5. Erro no registro original:", err);
        throw err;
    }
  };

  return plugin;
};