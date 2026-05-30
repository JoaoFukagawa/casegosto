
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  value text NOT NULL UNIQUE,
  label text NOT NULL,
  emoji text NOT NULL DEFAULT '💳',
  active boolean NOT NULL DEFAULT true,
  is_cash boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can access payment_methods"
ON public.payment_methods FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_methods (value, label, emoji, is_cash, sort_order) VALUES
  ('dinheiro', 'Dinheiro', '💵', true, 1),
  ('pix', 'PIX', '📱', false, 2),
  ('cartao', 'Cartão', '💳', false, 3),
  ('haver', 'Haver', '📋', false, 4);
