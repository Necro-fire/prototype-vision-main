export const normalizePhone = (phone: string) =>
  phone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
