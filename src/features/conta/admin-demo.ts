// Acesso demonstrativo do protótipo. Sai na Fase 2, quando o login passa a ser real.
export const DEMO_ADMIN = { email: "admin@slick.demo", password: "slick123" };

export function checkAdmin(email: string, password: string) {
  return email.trim().toLowerCase() === DEMO_ADMIN.email && password === DEMO_ADMIN.password;
}
