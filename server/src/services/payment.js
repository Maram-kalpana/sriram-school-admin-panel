const providers = {
  pay_at_school: {
    id: 'pay_at_school',
    label: 'Pay at school',
    async createPayment() {
      return { payment_status: 'pending', payment_method: 'pay_at_school', provider_ref: null };
    },
  },
  cash_on_delivery: {
    id: 'cash_on_delivery',
    label: 'Cash on delivery',
    async createPayment() {
      return { payment_status: 'pending', payment_method: 'cash_on_delivery', provider_ref: null };
    },
  },
  razorpay: {
    id: 'razorpay',
    label: 'Razorpay (INR) — stub',
    async createPayment() {
      return {
        payment_status: 'pending',
        payment_method: 'razorpay',
        provider_ref: null,
        stub: true,
        message: 'Razorpay keys not configured. Use pay_at_school for now.',
      };
    },
  },
};

function getProvider(id) {
  return providers[id] || providers.pay_at_school;
}

module.exports = { providers, getProvider };
