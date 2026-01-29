export function normalizePhoneToE164BR(raw: string): string {
  // Remove tudo que não for dígito
  const digits = raw.replace(/\D/g, '');

  // Validação básica de comprimento
  // Aceita:
  // - 10 dígitos: DD + 8 números (fixo ou móvel antigo, embora móvel seja 9) -> vamos assumir móvel 9 sempre hoje em dia, mas...
  // - 11 dígitos: DD + 9 números (móvel atual)
  // - 12 ou 13 dígitos: 55 + DD + ...

  let clean = digits;

  // Se começar com 55 e tiver 12 ou 13 dígitos, assume que já tem DDI
  if (clean.startsWith('55') && (clean.length === 12 || clean.length === 13)) {
    // ok
  } else {
    // Se tiver 10 ou 11 dígitos, adiciona 55
    if (clean.length === 10 || clean.length === 11) {
      clean = '55' + clean;
    }
  }

  // Retorna com +
  return '+' + clean;
}
