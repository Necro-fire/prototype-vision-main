// Links de contato montados a partir do que o dono cadastrou. Funções puras.
import { normalizePhone } from "@/lib/telefone";

// "(11) 91234-5678" → "tel:+5511912345678"
export function linkDoTelefone(telefone: string) {
  const digitos = normalizePhone(telefone);
  return /^\d{10,11}$/.test(digitos) ? `tel:+55${digitos}` : null;
}

// "(11) 91234-5678" → "https://wa.me/5511912345678"
export function linkDoWhatsapp(numero: string) {
  const digitos = normalizePhone(numero);
  return /^\d{10,11}$/.test(digitos) ? `https://wa.me/55${digitos}` : null;
}

export const linkDoInstagram = (usuario: string) =>
  /^[A-Za-z0-9._]{1,30}$/.test(usuario) ? `https://www.instagram.com/${usuario}/` : null;

// Abre a busca do endereço no Google Maps (o endereço vai codificado na URL).
export const linkDoMapa = (endereco: string) =>
  endereco.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco.trim())}`
    : null;
