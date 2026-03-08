-- =============================================
-- LINE 圖文選單管理系統 - Supabase Schema
-- 請在 Supabase Dashboard > SQL Editor 中執行此腳本
-- 可重複執行（已加入 IF NOT EXISTS / DROP IF EXISTS）
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

-- 3. 啟用 RLS
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE rich_menus ENABLE ROW LEVEL SECURITY;

-- 4. channels RLS policies（先移除再建立，確保一致）
DROP POLICY IF EXISTS "Users can view own channels" ON channels;
DROP POLICY IF EXISTS "Users can insert own channels" ON channels;
DROP POLICY IF EXISTS "Users can update own channels" ON channels;
DROP POLICY IF EXISTS "Users can delete own channels" ON channels;

CREATE POLICY "Users can view own channels"
  ON channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own channels"
  ON channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own channels"
  ON channels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own channels"
  ON channels FOR DELETE
  USING (auth.uid() = user_id);

-- 5. rich_menus RLS policies（先移除再建立，確保一致）
DROP POLICY IF EXISTS "Users can view own rich menus" ON rich_menus;
DROP POLICY IF EXISTS "Users can insert own rich menus" ON rich_menus;
DROP POLICY IF EXISTS "Users can update own rich menus" ON rich_menus;
DROP POLICY IF EXISTS "Users can delete own rich menus" ON rich_menus;

CREATE POLICY "Users can view own rich menus"
  ON rich_menus FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = rich_menus.channel_id
      AND channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own rich menus"
  ON rich_menus FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = rich_menus.channel_id
      AND channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own rich menus"
  ON rich_menus FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = rich_menus.channel_id
      AND channels.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own rich menus"
  ON rich_menus FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM channels
      WHERE channels.id = rich_menus.channel_id
      AND channels.user_id = auth.uid()
    )
  );

-- 6. 建立 updated_at 自動更新 trigger
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

-- 7. 建立 Storage bucket
-- 請在 Supabase Dashboard > Storage 中手動建立 bucket:
--   名稱: richmenu-images
--   Public: false
--
-- 然後在 Storage > Policies 中新增以下 policies:
--
-- SELECT policy (讀取):
--   (bucket_id = 'richmenu-images') AND (auth.uid()::text = (storage.foldername(name))[1])
--
-- INSERT policy (上傳):
--   (bucket_id = 'richmenu-images') AND (auth.uid()::text = (storage.foldername(name))[1])
--
-- UPDATE policy (更新):
--   (bucket_id = 'richmenu-images') AND (auth.uid()::text = (storage.foldername(name))[1])
--
-- DELETE policy (刪除):
--   (bucket_id = 'richmenu-images') AND (auth.uid()::text = (storage.foldername(name))[1])
