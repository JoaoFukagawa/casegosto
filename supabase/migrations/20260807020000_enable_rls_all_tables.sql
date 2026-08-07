-- Habilita RLS em todas as tabelas que estavam completamente abertas
-- (qualquer pessoa com a chave pública do site conseguia ler/escrever tudo,
-- logada ou não — inclusive dados de clientes e financeiro).

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;

-- Dados sensíveis (clientes, financeiro, estoque) — só para quem está logado.
CREATE POLICY "authenticated_all" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.bills FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.pratos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.payment_methods FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.categorias_financeiras FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Perfis: qualquer logado pode ver (só nomes), mas só edita o próprio.
CREATE POLICY "authenticated_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own_write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cardápio: equipe gerencia tudo; visitante do cardápio online só lê itens ativos.
CREATE POLICY "authenticated_all" ON public.menu_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_active" ON public.menu_items FOR SELECT TO anon USING (active = true);

-- Pedidos: equipe gerencia tudo; visitante só consegue INSERIR (não ler pedidos de outras pessoas).
CREATE POLICY "authenticated_all" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON public.order_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_insert_payment" ON public.order_payments FOR INSERT TO anon WITH CHECK (true);

-- Função segura para o cardápio online calcular estoque do dia sem
-- precisar ler a tabela orders (que tem nome/telefone/endereço de clientes).
CREATE OR REPLACE FUNCTION public.get_today_sold_quantities()
RETURNS TABLE(menu_item_id uuid, sold_qty numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT oi.menu_item_id, SUM(oi.quantity)::numeric as sold_qty
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE o.created_at >= date_trunc('day', now())
    AND o.status <> 'cancelado'
  GROUP BY oi.menu_item_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_today_sold_quantities() TO anon, authenticated;
