-- =============================================
-- LINE 圖文選單管理系統 - Supabase Schema
-- 請在 Supabase Dashboard > SQL Editor 中執行此腳本
-- 可重複執行（已加入 IF NOT EXISTS / DROP IF EXISTS）
--
-- 注意：本系統所有資料庫操作皆透過 Netlify Functions
-- 使用 service_role key，因此 RLS 已停用。
-- =============================================

-- 1. 建立 channels 表
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  channel_name TEXT NOT NULL,
  channel_access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 建立 rich_menus 表
CREATE TABLE IF NOT EXISTS rich_menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE NOT NULL,
  line_rich_menu_id TEXT,
  name TEXT NOT NULL,
  chat_bar_text TEXT NOT NULL DEFAULT '查看更多',
  size_height INT NOT NULL DEFAULT 1686,
  selected BOOLEAN DEFAULT false,
  image_path TEXT,
  areas JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 停用 RLS（所有操作透過 server-side service_role key，不需要 RLS）
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE rich_menus DISABLE ROW LEVEL SECURITY;

-- 清除舊的 RLS policies（如果存在）
DROP POLICY IF EXISTS "Users can view own channels" ON channels;
DROP POLICY IF EXISTS "Users can insert own channels" ON channels;
DROP POLICY IF EXISTS "Users can update own channels" ON channels;
DROP POLICY IF EXISTS "Users can delete own channels" ON channels;
DROP POLICY IF EXISTS "Users can view own rich menus" ON rich_menus;
DROP POLICY IF EXISTS "Users can insert own rich menus" ON rich_menus;
DROP POLICY IF EXISTS "Users can update own rich menus" ON rich_menus;
DROP POLICY IF EXISTS "Users can delete own rich menus" ON rich_menus;

-- 4. 建立 updated_at 自動更新 trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rich_menus_updated_at ON rich_menus;
CREATE TRIGGER rich_menus_updated_at
  BEFORE UPDATE ON rich_menus
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 5. 建立 Storage bucket（公開，供圖片預覽用）
INSERT INTO storage.buckets (id, name, public)
VALUES ('richmenu-images', 'richmenu-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
