export default [
  'strapi::logger',
  'strapi::errors',
  
  /* --- INÍCIO DA ALTERAÇÃO DE SEGURANÇA --- */
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'res.cloudinary.com', // <--- AQUI: Liberamos o Cloudinary
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            'res.cloudinary.com', // <--- AQUI: Liberamos vídeos do Cloudinary
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  /* --- FIM DA ALTERAÇÃO --- */

  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];