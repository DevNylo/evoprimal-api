import axios from 'axios';

const getClient = () => {
  const token = process.env.ASAAS_API_KEY;
  const url = process.env.ASAAS_API_URL;

  if (!token || !url) {
    throw new Error("Asaas API Key ou URL não configurados no .env");
  }

  return axios.create({
    baseURL: url,
    headers: {
      access_token: token,
      'Content-Type': 'application/json',
    },
  });
};

export default {
  async createCustomer(user: any) {
    const api = getClient();

    try {
      // Evita duplicidade no Asaas buscando pelo CPF
      const { data: existing } = await api.get(`/customers?cpfCnpj=${user.cpf}`);
      if (existing.data && existing.data.length > 0) {
        return existing.data[0].id;
      }
    } catch (error) {
      console.log("Cliente não encontrado, criando novo...");
    }

    const { data: newCustomer } = await api.post('/customers', {
      name: user.full_name,
      email: user.email,
      cpfCnpj: user.cpf,
      mobilePhone: user.phone,
      notificationDisabled: false,
    });

    return newCustomer.id;
  },

  // Recebe o billingType para travar a forma de pagamento
  async createPaymentLink(customerId: string, value: number, description: string, billingType = "UNDEFINED") {
    const api = getClient();

    const { data: payment } = await api.post('/payments', {
      customer: customerId,
      billingType: billingType, // Aqui a mágica da segurança acontece
      value: value,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 dias
      description: description,
    });

    return payment.invoiceUrl;
  }
};