-- Receitas particulares: lançamentos manuais de receita, fora das vendas
-- automáticas de marmita (que continuam vindo de `orders`). Espelha a
-- tabela `expenses` (mesmo padrão de colunas e RLS por usuário).

CREATE TABLE public.receitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outras_receitas',
  amount NUMERIC NOT NULL DEFAULT 0,
  receita_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_receitas_user ON public.receitas(user_id);

ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own receitas" ON public.receitas FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_receitas_updated_at
  BEFORE UPDATE ON public.receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Categoria padrão pra receita particular avulsa (o plano de contas oficial
-- só tinha "Vendas de marmitas", que é a categoria automática das vendas).
INSERT INTO public.categorias_financeiras (codigo, slug, nome, tipo, grupo, is_operacional, ordem)
VALUES ('1.2', 'outras_receitas', 'Outras receitas', 'receita', '1. Receitas', false, 120)
ON CONFLICT (slug) DO NOTHING;
