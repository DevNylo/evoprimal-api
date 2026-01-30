/**
 * order controller
 */
import asaasService from '../services/asaas'; 

export default ({ strapi }: { strapi: any }) => ({
  
  async checkout(ctx: any) {
    const { cart, userId, paymentMethod } = ctx.request.body;

    // Validações básicas
    if (!cart || cart.length === 0) return ctx.badRequest("Carrinho vazio");

    const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
    if (!user) return ctx.badRequest("Usuário não encontrado");
    if (!user.cpf) return ctx.badRequest("CPF Obrigatório no perfil");

    // --- CÁLCULO SEGURO DO TOTAL (Busca preço no Banco) ---
    let total = 0;
    const descriptionItems = [];

    for (const item of cart) {
        const qtd = Number(item.quantity) || 1;
        
        // 🔒 SEGURANÇA MÁXIMA: Buscamos o produto no banco pelo ID
        // Ajuste 'api::produto.produto' se o nome da sua collection for diferente
        const dbProduct = await strapi.entityService.findOne('api::produto.produto', item.id);

        if (!dbProduct) {
            return ctx.badRequest(`O produto "${item.name}" (ID: ${item.id}) não está mais disponível.`);
        }

        // Usamos o preço do BANCO (preco), ignorando o que veio do frontend
        const realPrice = Number(dbProduct.preco); 
        
        total += realPrice * qtd;
        descriptionItems.push(`${qtd}x ${dbProduct.nome}`);
    }

    // --- LÓGICA DE DESCONTO E TRAVA DO ASAAS ---
    let finalTotal = total;
    let billingType = 'UNDEFINED';

    if (paymentMethod === 'PIX_BOLETO') {
        // Aplica 5% de desconto
        finalTotal = total * 0.95; 
        billingType = 'BOLETO'; // Trava no Asaas (Boleto + Pix)
    } else {
        // Preço Cheio
        finalTotal = total;
        billingType = 'CREDIT_CARD'; // Trava no Asaas (Só Cartão)
    }

    try {
        // --- GERADOR DE CÓDIGO (EVP0000X) ---
        const count = await strapi.entityService.count('api::order.order');
        const orderCode = `EVP${String(count + 1).padStart(5, '0')}`;

        console.log(`🔐 Pedido Seguro: ${orderCode} | Total Real: ${finalTotal}`);

        // --- INTEGRAÇÃO ASAAS ---
        const asaasCustomerId = await asaasService.createCustomer(user);
        
        const paymentLink = await asaasService.createPaymentLink(
            asaasCustomerId, 
            finalTotal, 
            `Pedido ${orderCode} - EvoPrimal`,
            billingType // Envia a trava de pagamento
        );

        // --- SALVAR NO BANCO ---
        // Aqui salvamos os produtos do carrinho apenas para histórico visual
        // Mas o valor financeiro (total) foi calculado pelo backend
        await strapi.entityService.create('api::order.order', { 
            data: {
                user: userId,
                total: finalTotal,
                status_payment: 'pending', 
                asaas_link: paymentLink,
                products: cart, // JSON com os itens visuais
                order_code: orderCode
            }
        });

        return { paymentUrl: paymentLink, orderCode: orderCode };

    } catch (error: any) {
        console.error("❌ Erro no Checkout:", error);
        // Retorna erro detalhado se for problema no Asaas
        return ctx.internalServerError(error.response?.data?.errors?.[0]?.description || "Erro ao processar pagamento.");
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