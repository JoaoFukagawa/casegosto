-- Run this in Supabase SQL Editor to enable public ordering

-- 1. Add photo_url column (if not exists)
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Create storage bucket for menu photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('menu-photos', 'menu-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
-- Public read access
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read menu-photos') THEN
    CREATE POLICY "Public Read menu-photos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'menu-photos');
  END IF;
END $$;

-- Authenticated users can upload
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth Upload menu-photos') THEN
    CREATE POLICY "Auth Upload menu-photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'menu-photos');
  END IF;
END $$;

-- Authenticated users can delete their own uploads
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth Delete menu-photos') THEN
    CREATE POLICY "Auth Delete menu-photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'menu-photos' AND auth.role() = 'authenticated');
  END IF;
END $$;
