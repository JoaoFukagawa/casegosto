
ALTER TABLE public.orders
ADD COLUMN delivery_type text NOT NULL DEFAULT 'retirada',
ADD COLUMN delivery_address text,
ADD COLUMN payment_method text NOT NULL DEFAULT 'dinheiro';
