/**
 * order controller
 */
import asaasService from '../services/asaas'; 

export default ({ strapi }: { strapi: any }) => ({
  
  async checkout(ctx: any) {
    const { cart, userId } = ctx.request.body;

    // --- VALIDAÇÕES ---
    if (!cart || cart.length === 0) {
      return ctx.badRequest("Carrinho vazio");
    }

    const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);

    if (!user) return ctx.badRequest("Usuário não encontrado");
    if (!user.cpf) return ctx.badRequest("Usuário precisa ter CPF cadastrado para comprar.");

    // --- CÁLCULO DO TOTAL ---
    let total = 0;
    const descriptionItems = [];

    for (const item of cart) {
        const qtd = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        
        total += price * qtd;
        descriptionItems.push(`${qtd}x ${item.name}`);
    }

    try {
        // --- INTEGRAÇÃO ASAAS ---
        const asaasCustomerId = await asaasService.createCustomer(user);

        const paymentLink = await asaasService.createPaymentLink(
            asaasCustomerId, 
            total, 
            `Pedido EvoPrimal: ${descriptionItems.join(', ').substring(0, 200)}`
        );

        // --- SALVAR PEDIDO ---
        try {
           await strapi.entityService.create('api::order.order', { 
              data: {
                  user: userId,
                  total: total,
                  // CORREÇÃO AQUI: Mudamos de 'status' para 'status_payment'
                  status_payment: 'pending', 
                  asaas_link: paymentLink,
                  products: cart 
              }
           });
        } catch (dbError) {
           console.warn("⚠️ Erro ao salvar pedido no banco:", dbError);
        }

        // --- RETORNO PARA O FRONTEND ---
        return { paymentUrl: paymentLink };

    } catch (error: any) {
        console.error("Erro no checkout Asaas:", error.response?.data || error);
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