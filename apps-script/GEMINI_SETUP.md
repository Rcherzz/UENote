## Gemini OCR Setup

這版 Apps Script 已支援：

- `Gemini API` 優先辨識 Uber Eats 截圖
- `Tesseract.js` 本機備援

### 1. 在 Apps Script 設定 API Key

進入 Apps Script：

1. 點 `專案設定`
2. 找到 `指令碼屬性`
3. 新增：

```text
GEMINI_API_KEY = 你的 Gemini API key
```

### 2. 重新部署 Web App

1. 點 `部署`
2. `管理部署作業`
3. 編輯目前部署
4. 建立新版本後重新部署

### 3. Google Sheet 欄位

請確認第一列欄位為：

```text
id | restaurant | item | type | note | author | source | createdAt | updatedAt
```

### 4. 若 Gemini 沒設好會怎樣

如果：

- `GEMINI_API_KEY` 沒有設定
- Gemini API 呼叫失敗

前端會自動退回本機 `Tesseract.js` 辨識，不會整個功能壞掉。
