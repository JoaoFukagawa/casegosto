-- Substitui o plano de contas ad-hoc por um plano de contas formal
-- (12 linhas em 5 grupos numerados, modelo "fundo de quintal" pra
-- marmitaria), com código hierárquico (1.1, 2.1, 2.2...) pra permitir
-- abrir subcontas no futuro sem quebrar o histórico.

ALTER TABLE public.categorias_financeiras ADD COLUMN IF NOT EXISTS codigo text;

DELETE FROM public.categorias_financeiras;

-- Plano de contas oficial (Marmitaria, fundo de quintal) — 12 linhas em 5 grupos.
INSERT INTO public.categorias_financeiras (codigo, slug, nome, tipo, grupo, is_operacional, ordem) VALUES
  ('1.1', 'vendas_marmitas', 'Vendas de marmitas', 'receita', '1. Receitas', false, 110),

  ('2.1', 'mercado', 'Insumos alimentares', 'despesa', '2. Custos Diretos', true, 210),
  ('2.2', 'embalagens', 'Embalagens', 'despesa', '2. Custos Diretos', true, 220),
  ('2.3', 'gas', 'Gás', 'despesa', '2. Custos Diretos', true, 230),

  ('3.1', 'utilidades', 'Utilidades', 'despesa', '3. Despesas Operacionais', false, 310),
  ('3.2', 'taxas_recebimento', 'Taxas de recebimento e intermediação', 'despesa', '3. Despesas Operacionais', true, 320),
  ('3.3', 'marketing', 'Marketing', 'despesa', '3. Despesas Operacionais', false, 330),
  ('3.4', 'manutencao_limpeza', 'Manutenção e limpeza', 'despesa', '3. Despesas Operacionais', true, 340),
  ('3.5', 'funcionarios', 'Mão de obra', 'despesa', '3. Despesas Operacionais', false, 350),

  ('4.1', 'impostos', 'DAS MEI / taxas municipais', 'despesa', '4. Impostos e Taxas', false, 410),

  ('5.1', 'equipamentos', 'Equipamentos e utensílios', 'despesa', '5. Investimentos e Retiradas', false, 510),
  ('5.2', 'retirada', 'Pró-labore', 'despesa', '5. Investimentos e Retiradas', true, 520);

-- Categoria de segurança usada internamente pelo app como fallback quando
-- nenhuma categoria específica é encontrada (não faz parte das 12 linhas do
-- plano oficial, mas evita lançamentos "órfãos").
INSERT INTO public.categorias_financeiras (codigo, slug, nome, tipo, grupo, is_operacional, ordem) VALUES
  (NULL, 'outros', 'Outros (não classificado)', 'despesa', '3. Despesas Operacionais', true, 390);

-- Categorias antigas que já têm dinheiro real lançado, mas não fazem parte do
-- novo plano — ficam desativadas (não aparecem pra escolher em novos
-- lançamentos), só existem pra manter a categorização do histórico.
INSERT INTO public.categorias_financeiras (codigo, slug, nome, tipo, grupo, is_operacional, ativo, ordem) VALUES
  (NULL, 'entregador', 'Entregador (legado)', 'despesa', 'Legado (histórico)', false, false, 900),
  (NULL, 'diaria', 'Diária (legado)', 'despesa', 'Legado (histórico)', false, false, 901),
  (NULL, 'troco', 'Troco (legado)', 'despesa', 'Legado (histórico)', false, false, 902),
  (NULL, 'caixinha', 'Caixinha (legado)', 'despesa', 'Legado (histórico)', false, false, 903);
