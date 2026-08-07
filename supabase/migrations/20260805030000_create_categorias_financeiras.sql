CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.categorias_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  grupo text NOT NULL,
  emoji text,
  is_operacional boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TRIGGER update_categorias_financeiras_updated_at
  BEFORE UPDATE ON public.categorias_financeiras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.categorias_financeiras (slug, nome, tipo, grupo, emoji, is_operacional, ordem) VALUES
  ('mercado', 'Mercado/Ingredientes', 'despesa', 'Custo (CMV)', '🛒', true, 10),
  ('embalagens', 'Embalagens', 'despesa', 'Custo (CMV)', '📦', true, 20),
  ('gas', 'Gás', 'despesa', 'Custo (CMV)', '🔥', true, 30),
  ('entregador', 'Entregador', 'despesa', 'Operacional', '🛵', true, 40),
  ('retirada', 'Retirada/Pró-labore', 'despesa', 'Pessoal', '💵', true, 50),
  ('diaria', 'Diária', 'despesa', 'Pessoal', '🗓️', true, 60),
  ('caixinha', 'Caixinha', 'despesa', 'Pessoal', '🐷', true, 70),
  ('troco', 'Troco', 'despesa', 'Operacional', '🔄', true, 80),
  ('moradia', 'Moradia/Aluguel', 'despesa', 'Administrativo', '🏠', false, 90),
  ('energia_agua', 'Energia/Água', 'despesa', 'Administrativo', '💡', false, 100),
  ('internet_telefone', 'Internet/Telefone', 'despesa', 'Administrativo', '📶', false, 110),
  ('funcionarios', 'Funcionários', 'despesa', 'Administrativo', '👷', false, 120),
  ('transporte', 'Transporte', 'despesa', 'Administrativo', '🚗', false, 130),
  ('impostos', 'Impostos', 'despesa', 'Administrativo', '📑', false, 140),
  ('outros', 'Outros', 'despesa', 'Administrativo', '📋', true, 150),
  ('vendas_marmitas', 'Vendas Marmitas', 'receita', 'Receitas', '🍱', false, 10),
  ('vendas_assados', 'Vendas Assados', 'receita', 'Receitas', '🍗', false, 20),
  ('delivery', 'Delivery', 'receita', 'Receitas', '🚚', false, 30),
  ('outras_receitas', 'Outras Receitas', 'receita', 'Receitas', '💰', false, 40);
