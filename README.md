# LINE 圖文選單管理系統

一個部署在 Netlify 上、以 Supabase 作為後端的 LINE Rich Menu 管理系統。
讓多位使用者可以透過網頁介面，管理各自 LINE 官方帳號的圖文選單，免去手動呼叫 API 的麻煩。

## 功能特色

- 多帳號管理：支援多個 LINE 官方帳號（頻道）
- 圖文選單編輯器：視覺化的區域劃分與動作設定
- 預設佈局模板：2 欄、3 欄、2x2、3x2、1 上 + 2 下
- 動作類型支援：開啟網址 (URI)、發送訊息 (Message)、Postback
- 草稿 / 發布流程：先在本地儲存草稿，確認後一鍵發布到 LINE
- 自動更新發布：編輯已發布的選單儲存後，自動同步更新到 LINE（無需手動重新發布）
- 預設選單管理：可設定哪個選單為所有使用者的預設選單

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | React (Vite) + Tailwind CSS v4 |
| 後端 API | Netlify Functions (serverless) |
| 資料庫 | Supabase (PostgreSQL) |
| 認證 | Supabase Auth (email/password) |
| 圖片儲存 | Supabase Storage |
| 部署 | Netlify |

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定 Supabase

1. 到 [Supabase Dashboard](https://supabase.com/dashboard) 建立專案
2. 在 **SQL Editor** 中執行 `supabase-schema.sql`（會自動建立資料表、trigger、Storage bucket）

### 3. 設定環境變數

#### 本地開發

複製 `.env.example` 為 `.env`，填入 Supabase 設定：

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **注意**：`SUPABASE_SERVICE_ROLE_KEY` 不加 `VITE_` 前綴，僅供 Netlify Functions 後端使用，不會暴露於前端。本地開發使用 `netlify dev` 時需要此金鑰才能正常操作資料庫與 Storage。

#### Netlify 部署

在 Netlify **Site settings > Environment variables** 中設定以下三個變數：

| 變數名稱 | 來源 | 說明 |
|----------|------|------|
| `VITE_SUPABASE_URL` | Supabase > Project Settings > API > Project URL | Supabase 專案網址 |
| `VITE_SUPABASE_ANON_KEY` | Supabase > Project Settings > API > anon public | 前端用的公開金鑰 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API > service_role | 後端 Functions 用的管理金鑰（**勿加 `VITE_` 前綴**） |

### 4. 啟動開發伺服器

```bash
# 使用 Netlify CLI（推薦，支援 Functions）
netlify dev

# 或只啟動前端
npm run dev
```

### 5. 部署到 Netlify

1. 將專案推送到 GitHub
2. 在 Netlify 連結 GitHub repo
3. 設定上述三個環境變數
4. 部署完成！

## 專案結構

```
├── netlify/functions/              # Netlify serverless functions
│   ├── channels.mjs                # 頻道 CRUD
│   ├── menus.mjs                   # 圖文選單 CRUD（本地 DB）
│   ├── richmenu-create.mjs         # 建立選單到 LINE API
│   ├── richmenu-upload-image.mjs   # 上傳選單圖片到 LINE API
│   ├── richmenu-list.mjs           # 從 LINE API 取得選單列表
│   ├── richmenu-set-default.mjs    # 設定預設選單
│   ├── richmenu-delete.mjs         # 刪除選單
│   └── storage-upload.mjs          # 上傳圖片到 Supabase Storage
├── src/
│   ├── components/
│   │   ├── Layout.jsx              # 共用版面（header + 登出）
│   │   ├── ProtectedRoute.jsx      # 登入保護
│   │   ├── RichMenuEditor.jsx      # 圖文選單編輯器
│   │   ├── AreaSelector.jsx        # 點擊區域視覺化選取
│   │   └── ActionConfig.jsx        # 區域動作設定
│   ├── pages/
│   │   ├── Login.jsx               # 登入頁
│   │   ├── Register.jsx            # 註冊頁
│   │   ├── Dashboard.jsx           # 頻道列表
│   │   ├── ChannelDetail.jsx       # 頻道詳情 / 選單列表
│   │   └── RichMenuEdit.jsx        # 建立 / 編輯圖文選單
│   ├── lib/
│   │   ├── supabase.js             # Supabase client 初始化
│   │   └── api.js                  # API 呼叫工具（自動帶 JWT）
│   ├── App.jsx                     # 路由設定
│   └── main.jsx                    # 入口
├── supabase-schema.sql             # 資料庫 schema + Storage bucket
├── netlify.toml                    # Netlify 部署設定
└── .env.example                    # 環境變數範本
```

## 架構說明

所有資料庫與 Storage 操作皆透過 **Netlify Functions** 以 `service_role` key 執行，前端不直接操作 Supabase 資料庫。

```
瀏覽器 → Netlify Function（驗證 JWT + 操作 DB）→ Supabase
                                                  → LINE API
```

- **認證**：前端使用 Supabase Auth 登入，取得 JWT
- **資料操作**：前端呼叫 Netlify Function，Function 驗證 JWT 後以 service_role key 操作資料庫
- **LINE API**：Channel Access Token 僅在 server-side 使用，不暴露於前端

## 使用流程

1. 註冊 / 登入帳號
2. 新增 LINE 頻道（輸入名稱 + Channel Access Token）
3. 進入頻道 → 建立圖文選單
4. 上傳選單圖片 → 選擇佈局模板 → 設定每個區域的動作
5. 儲存草稿
6. 點擊「發布到 LINE」→ 系統自動建立選單 + 上傳圖片
7. 設為預設選單（所有使用者都會看到）
8. 後續編輯已發布的選單 → 儲存時自動更新到 LINE（刪除舊選單、建立新選單、重新上傳圖片，若為預設選單也會自動恢復）

## LINE Channel Access Token 取得方式

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 選擇你的 Provider → 選擇 Messaging API Channel
3. 在 Messaging API 分頁中，找到 Channel Access Token
4. 點擊 Issue 產生 long-lived token
