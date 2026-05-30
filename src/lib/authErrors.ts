// Traduz mensagens comuns do Supabase Auth para PT-BR
export function translateAuthError(message?: string): string {
  if (!message) return "Erro na autenticação";
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos";
  if (m.includes("email not confirmed")) return "E-mail ainda não confirmado. Verifique sua caixa de entrada.";
  if (m.includes("user already registered") || m.includes("already registered")) return "Este e-mail já está cadastrado";
  if (m.includes("password should be at least")) return "A senha deve ter no mínimo 6 caracteres";
  if (m.includes("invalid email")) return "E-mail inválido";
  if (m.includes("rate limit") || m.includes("too many requests")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("network") || m.includes("failed to fetch")) return "Erro de conexão. Verifique sua internet.";
  if (m.includes("signup is disabled")) return "Cadastro desabilitado no momento";
  if (m.includes("user not found")) return "Usuário não encontrado";
  if (m.includes("token") && m.includes("expired")) return "Sessão expirada. Faça login novamente.";
  return message;
}
