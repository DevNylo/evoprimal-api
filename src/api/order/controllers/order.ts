/**
 * order controller
 */
import asaasService from '../services/asaas'; 

export default ({ strapi }: { strapi: any }) => ({
  
  async checkout(ctx: any) {
    // 🔥 RASTREADOR: Esse log vai provar se a requisição chegou no Backend
    console.log("🔥 [CHECKOUT] O Backend recebeu a requisição! Iniciando processamento...");

    const { cart, userId } = ctx.request.body;

    // --- VALIDAÇÕES ---
    if (!cart || cart.length === 0) {
      console.warn("⚠️ [CHECKOUT] Carrinho vazio.");
      return ctx.badRequest("Carrinho vazio");
    }

    const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);

    if (!user) {
        console.warn(`⚠️ [CHECKOUT] Usuário ID ${userId} não encontrado.`);
        return ctx.badRequest("Usuário não encontrado");
    }
    
    if (!user.cpf) {
        console.warn(`⚠️ [CHECKOUT] Usuário ID ${userId} sem CPF.`);
        return ctx.badRequest("Usuário precisa ter CPF cadastrado para comprar.");
    }

    // --- CÁLCULO DO TOTAL ---
    let total = 0;
    const descriptionItems = [];

    for (const item of cart) {
        const qtd = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        
        total += price * qtd;
        descriptionItems.push(`${qtd}x ${item.name}`);
    }

    console.log(`💰 [CHECKOUT] Total calculado: R$ ${total}. Itens: ${descriptionItems.length}`);

    try {
        // --- INTEGRAÇÃO ASAAS ---
        console.log("🔄 [CHECKOUT] Criando cliente no Asaas...");
        const asaasCustomerId = await asaasService.createCustomer(user);

        console.log("🔄 [CHECKOUT] Gerando link de pagamento...");
        const paymentLink = await asaasService.createPaymentLink(
            asaasCustomerId, 
            total, 
            `Pedido EvoPrimal: ${descriptionItems.join(', ').substring(0, 200)}`
        );
        
        console.log(`✅ [CHECKOUT] Link gerado com sucesso: ${paymentLink}`);

        // --- SALVAR PEDIDO ---
        try {
           await strapi.entityService.create('api::order.order', { 
              data: {
                  user: userId,
                  total: total,
                  status_payment: 'pending', 
                  asaas_link: paymentLink,
                  products: cart 
              }
           });
           console.log("💾 [CHECKOUT] Pedido salvo no banco de dados.");
        } catch (dbError) {
           console.warn("⚠️ [CHECKOUT] Erro ao salvar pedido no banco (mas o link foi gerado):", dbError);
        }

        // --- RETORNO PARA O FRONTEND ---
        return { paymentUrl: paymentLink };

    } catch (error: any) {
        // Esse log detalhado vai nos mostrar se o erro foi Chave Inválida, URL errada, etc.
        console.error("❌ [CHECKOUT] Erro CRÍTICO no Asaas:", error.response?.data || error.message);
        return ctx.internalServerError("Erro ao processar pagamento com Asaas.");
    }
  },
  
  // Métodos padrão
  async find(ctx: any) { ctx.body = "Use o painel admin para ver pedidos."; },
  async findOne(ctx: any) { ctx.body = "Use o painel admin para ver pedidos."; },
  async create(ctx: any) { return this.checkout(ctx); },
  async update(ctx: any) { ctx.body = "Proibido"; },
  async delete(ctx: any) { ctx.body = "Proibido"; }
});