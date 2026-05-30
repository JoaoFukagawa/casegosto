
-- Add unit_type to menu_items (unidade or kg)
ALTER TABLE public.menu_items 
ADD COLUMN unit_type text NOT NULL DEFAULT 'unidade';

-- Add weight to order_items for kg-based items
ALTER TABLE public.order_items
ADD COLUMN weight numeric NULL;
