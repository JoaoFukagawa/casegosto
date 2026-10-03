// Só dígitos, sem o +55 de quem cola número copiado do WhatsApp: um número
// nacional tem 10-11 dígitos, então 12-13 começando com 55 é código do país.
function phoneDigits(raw: string | null | undefined): string {
  const d = (raw || "").replace(/\D/g, "");
  return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d.slice(2) : d;
}

// O mesmo número com e sem o 9º dígito do celular — o cadastro tem os dois formatos.
function phoneVariants(raw: string | null | undefined): string[] {
  const d = phoneDigits(raw);
  if (d.length === 10) return [d, d.slice(0, 2) + "9" + d.slice(2)];
  if (d.length === 11 && d[2] === "9") return [d, d.slice(0, 2) + d.slice(3)];
  return [d];
}

// Máscara progressiva: (DD) DDDD-DDDD com 10 dígitos, (DD) DDDDD-DDDD com 11.
// Não insere nem remove o 9: formata exatamente o que foi digitado.
export function formatPhoneBR(value: string | null | undefined): string {
  const digits = phoneDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const splitAt = digits.length <= 10 ? 4 : 5;
  const part1 = rest.slice(0, splitAt);
  const part2 = rest.slice(splitAt);

  return part2 ? `(${ddd}) ${part1}-${part2}` : `(${ddd}) ${part1}`;
}

export function isCompletePhone(raw: string | null | undefined): boolean {
  return phoneDigits(raw).length >= 10;
}

// Compara pelos 8 últimos dígitos, o que ignora DDD, +55 e o 9º dígito.
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  return da.length >= 8 && db.length >= 8 && da.slice(-8) === db.slice(-8);
}

// Para sugestões enquanto digita: aceita o trecho digitado com ou sem DDD e com ou sem o 9.
export function phoneContains(stored: string | null | undefined, typed: string): boolean {
  const t = typed.replace(/\D/g, "");
  if (t.length < 3) return false;
  return phoneVariants(stored).some((v) => v.includes(t));
}
