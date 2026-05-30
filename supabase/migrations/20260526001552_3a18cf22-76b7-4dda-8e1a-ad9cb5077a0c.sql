
CREATE TABLE public.bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  status TEXT NOT NULL DEFAULT 'proxima',
  meses_atrasada INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas próprias contas" ON public.bills
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuários criam suas próprias contas" ON public.bills
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários atualizam suas próprias contas" ON public.bills
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuários excluem suas próprias contas" ON public.bills
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
