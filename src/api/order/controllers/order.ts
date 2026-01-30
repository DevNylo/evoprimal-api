/**
 * order controller
 */
import asaasService from '../services/asaas'; 

export default ({ strapi }: { strapi: any }) => ({
  
  async checkout(ctx: any) {
    const { cart, userId } = ctx.request.body;

    if (!cart || cart.length === 0) return ctx.badRequest("Carrinho vazio");

    const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
    if (!user) return ctx.badRequest("Usuário não encontrado");
    if (!user.cpf) return ctx.badRequest("CPF Obrigatório");

    let total = 0;
    const descriptionItems = [];

    for (const item of cart) {
        const qtd = Number(item.quantity) || 1;
        const price = Number(item.price) || 0;
        total += price * qtd;
        descriptionItems.push(`${qtd}x ${item.name}`);
    }

    try {
        // --- 1. GERADOR DE CÓDIGO (EVP0000X) ---
        const count = await strapi.entityService.count('api::order.order');
        const nextId = count + 1;
        const orderCode = `EVP${String(nextId).padStart(5, '0')}`; // Gera EVP00001

        console.log(`🎫 Código Gerado: ${orderCode}`);

        // --- 2. INTEGRAÇÃO ASAAS ---
        const asaasCustomerId = await asaasService.createCustomer(user);
        const paymentLink = await asaasService.createPaymentLink(
            asaasCustomerId, 
            total, 
            `Pedido ${orderCode} - EvoPrimal`
        );

        // --- 3. SALVAR NO BANCO ---
        await strapi.entityService.create('api::order.order', { 
            data: {
                user: userId,
                total: total,
                status_payment: 'pending', 
                asaas_link: paymentLink,
                products: cart,
                order_code: orderCode // Salva o código novo
            }
        });

        // Retorna o link e o código
        return { paymentUrl: paymentLink, orderCode: orderCode };

    } catch (error: any) {
        console.error("❌ Erro no Checkout:", error);
        return ctx.internalServerError("Erro no processamento.");
    }
  },
  
  // --- MÉTODO DE BUSCA CORRIGIDO ---
  async find(ctx: any) { 
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized();

    const { query } = ctx;
    // Filtra apenas pedidos DO usuário logado
    query.filters = { ...query.filters, user: { id: user.id } };
    query.sort = { createdAt: 'desc' }; // Ordena do mais novo para o mais antigo
    
    // Retorna direto a lista (Array) para o frontend
    return strapi.entityService.findMany('api::order.order', query);
  },
  
  async findOne(ctx: any) { return strapi.entityService.findOne('api::order.order', ctx.params.id); },
  async create(ctx: any) { return this.checkout(ctx); },
  async update(ctx: any) { ctx.body = "Proibido"; },
  async delete(ctx: any) { ctx.body = "Proibido"; }
});