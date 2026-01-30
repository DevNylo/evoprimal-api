/**
 * order controller
 */
import asaasService from '../services/asaas'; 

export default ({ strapi }: { strapi: any }) => ({
  
  // --- CHECKOUT ---
  async checkout(ctx: any) {
    const { cart, userId, paymentMethod } = ctx.request.body;

    if (!cart || cart.length === 0) return ctx.badRequest("Carrinho vazio");

    const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
    if (!user) return ctx.badRequest("Usuário não encontrado");
    if (!user.cpf) return ctx.badRequest("CPF Obrigatório no perfil");

    // --- CÁLCULO SEGURO DO TOTAL ---
    let total = 0;
    const descriptionItems = [];

    for (const item of cart) {
        const qtd = Number(item.quantity) || 1;
        const dbProduct = await strapi.entityService.findOne('api::produto.produto', item.id);

        if (!dbProduct) {
            return ctx.badRequest(`O produto "${item.name}" (ID: ${item.id}) não está mais disponível.`);
        }

        const realPrice = Number(dbProduct.preco); 
        total += realPrice * qtd;
        descriptionItems.push(`${qtd}x ${dbProduct.nome}`);
    }

    // --- LÓGICA DE DESCONTO E TRAVA ---
    let finalTotal = total;
    let billingType = 'UNDEFINED';

    if (paymentMethod === 'PIX_BOLETO') {
        finalTotal = total * 0.95; 
        billingType = 'BOLETO'; 
    } else {
        finalTotal = total;
        billingType = 'CREDIT_CARD'; 
    }

    try {
        const count = await strapi.entityService.count('api::order.order');
        const orderCode = `EVP${String(count + 1).padStart(5, '0')}`;

        console.log(`🔐 Pedido Seguro: ${orderCode} | Total: ${finalTotal}`);

        // --- INTEGRAÇÃO ASAAS ---
        const asaasCustomerId = await asaasService.createCustomer(user);
        
        // Recebe o Objeto { id, url } do serviço atualizado
        const paymentData = await asaasService.createPaymentLink(
            asaasCustomerId, 
            finalTotal, 
            `Pedido ${orderCode} - EvoPrimal`,
            billingType
        );

        // --- SALVAR NO BANCO ---
        await strapi.entityService.create('api::order.order', { 
            data: {
                user: userId,
                total: finalTotal,
                status_payment: 'pending', 
                asaas_link: paymentData.url, // URL para o usuário pagar
                asaas_id: paymentData.id,    // ID para o Webhook encontrar o pedido depois
                products: cart,
                order_code: orderCode
            }
        });

        return { paymentUrl: paymentData.url, orderCode: orderCode };

    } catch (error: any) {
        console.error("❌ Erro no Checkout:", error);
        return ctx.internalServerError(error.response?.data?.errors?.[0]?.description || "Erro ao processar pagamento.");
    }
  },

  // --- WEBHOOK (Recebe atualizações do Asaas) ---
  async webhook(ctx: any) {
    const { event, payment } = ctx.request.body;

    console.log(`🔔 Webhook: ${event} | ID: ${payment.id}`);

    // Mapeamento de Status Asaas -> Strapi
    let newStatus = '';
    switch (event) {
        case 'PAYMENT_CONFIRMED':
        case 'PAYMENT_RECEIVED':
            newStatus = 'paid';
            break;
        case 'PAYMENT_OVERDUE': // Venceu
        case 'PAYMENT_REFUNDED': // Estornado
            newStatus = 'canceled';
            break;
        default:
            return { status: 'ignored' }; // Ignora eventos irrelevantes
    }

    try {
        // 1. Encontra o pedido pelo ID do Asaas
        const orders = await strapi.entityService.findMany('api::order.order', {
            filters: { asaas_id: payment.id }
        });

        if (!orders || orders.length === 0) return ctx.notFound("Pedido não encontrado");

        const order = orders[0];

        // 2. Atualiza o status no banco
        await strapi.entityService.update('api::order.order', order.id, {
            data: { status_payment: newStatus }
        });

        console.log(`✅ Pedido ${order.order_code} atualizado para: ${newStatus}`);
        return { status: 'success' };

    } catch (error) {
        console.error("❌ Erro no Webhook:", error);
        return ctx.internalServerError("Erro ao atualizar pedido");
    }
  },
  
  // --- MÉTODOS PADRÃO ---
  async find(ctx: any) { 
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();
    const { query } = ctx;
    query.filters = { ...query.filters, user: { id: user.id } };
    query.sort = { createdAt: 'desc' };
    return strapi.entityService.findMany('api::order.order', query);
  },
  async findOne(ctx: any) { return strapi.entityService.findOne('api::order.order', ctx.params.id); },
  async create(ctx: any) { return this.checkout(ctx); },
  async update(ctx: any) { ctx.body = "Proibido"; },
  async delete(ctx: any) { ctx.body = "Proibido"; }
});