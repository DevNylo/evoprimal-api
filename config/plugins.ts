export default ({ env }) => ({
  // --- CONFIGURAÇÃO DE UPLOAD (CLOUDINARY) ---
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },

  // --- CONFIGURAÇÃO DE E-MAIL (RESEND) - ADICIONADO ---
  email: {
    config: {
      provider: 'strapi-provider-email-resend',
      providerOptions: {
        apiKey: env('RESEND_API_KEY'), // Pega do arquivo .env
      },
      settings: {
        defaultFrom: 'noreply@send.evoprimal.com.br',
        defaultReplyTo: 'noreply@send.evoprimal.com.br',
      },
    },
  },
});