export default {
  routes: [
    {
      method: 'POST',
      path: '/orders/checkout',
      handler: 'order.checkout',
      config: {
        // O checkout precisa de autenticação (JWT)
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/orders/webhook', // Rota que você cadastrará no painel do Asaas
      handler: 'order.webhook',
      config: {
        auth: false, // CRÍTICO: O Asaas não faz login, precisa ser público
        policies: [],
        middlewares: [],
      },
    },
  ],
};