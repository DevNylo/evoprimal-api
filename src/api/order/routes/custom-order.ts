// src/api/order/routes/custom-order.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/orders/checkout', // A URL será /api/orders/checkout
      handler: 'order.checkout',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};