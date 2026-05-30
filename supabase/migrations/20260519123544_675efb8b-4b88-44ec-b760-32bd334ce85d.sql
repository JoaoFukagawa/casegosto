
-- Add user_id columns
ALTER TABLE public.expenses ADD COLUMN user_id uuid;
ALTER TABLE public.menu_items ADD COLUMN user_id uuid;
ALTER TABLE public.orders ADD COLUMN user_id uuid;
ALTER TABLE public.order_items ADD COLUMN user_id uuid;
ALTER TABLE public.order_payments ADD COLUMN user_id uuid;
ALTER TABLE public.payment_methods ADD COLUMN user_id uuid;

-- Backfill existing data to João
UPDATE public.expenses SET user_id = '2e2b5e3a-ec77-4dd6-85db-0401a95eaa47' WHERE user_id IS NULL;
UPDATE public.menu_items SET user_id = '2e2b5e3a-ec77-4dd6-85db-0401a95eaa47' WHERE user_id IS NULL;
UPDATE public.orders SET user_id = '2e2b5e3a-ec77-4dd6-85db-0401a95eaa47' WHERE user_id IS NULL;
UPDATE public.order_items SET user_id = '2e2b5e3a-ec77-4dd6-85db-0401a95eaa47' WHERE user_id IS NULL;
UPDATE public.order_payments SET user_id = '2e2b5e3a-ec77-4dd6-85db-0401a95eaa47' WHERE user_id IS NULL;
UPDATE public.payment_methods SET user_id = '2e2b5e3a-ec77-4dd6-85db-0401a95eaa47' WHERE user_id IS NULL;

-- Enforce NOT NULL
ALTER TABLE public.expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.menu_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.order_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.order_payments ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.payment_methods ALTER COLUMN user_id SET NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_user ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_user ON public.menu_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_user ON public.order_items(user_id);
CREATE INDEX IF NOT EXISTS idx_order_payments_user ON public.order_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON public.payment_methods(user_id);

-- Replace permissive RLS policies with per-user policies
DROP POLICY IF EXISTS "Authenticated users can access expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can access menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Authenticated users can access orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can access order_items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated users can access order_payments" ON public.order_payments;
DROP POLICY IF EXISTS "Authenticated users can access payment_methods" ON public.payment_methods;

CREATE POLICY "Own expenses" ON public.expenses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own menu_items" ON public.menu_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own orders" ON public.orders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own order_items" ON public.order_items FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own order_payments" ON public.order_payments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own payment_methods" ON public.payment_methods FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
