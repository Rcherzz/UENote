# UENote

UENote 現在使用這個架構：

- 前端：GitHub Pages 或其他靜態網站
- 後端：Google Apps Script Web App
- 資料庫：Google Sheets

## 現在的登入方式

網站打開後，會先顯示密碼頁。

- 前端必須先輸入密碼
- Apps Script 後端也會驗證同一組密碼
- 密碼正確後才會顯示頁面，並允許讀寫資料

這樣比把 token 直接寫在前端安全很多。

## 前端檔案

- `index.html`
- `style.css`
- `app.js`
- `config.js`

## Apps Script 後端檔案

- `apps-script/Code.gs`

## config.js

本機預覽時可先這樣：

```js
window.UENOTE_CONFIG = {
  apiUrl: "",
  previewPassword: "demo",
};
```

正式上線時請填入：

```js
window.UENOTE_CONFIG = {
  apiUrl: "你的 Apps Script Web App 網址",
  previewPassword: "demo",
};
```

`previewPassword` 只在沒有接後端時使用。  
正式連到 Apps Script 後，真正的驗證會以後端密碼為準。

## Apps Script 設定

1. 打開 Google Sheet  
   `https://docs.google.com/spreadsheets/d/1jXY0Yr06seR-oqAuMd6pPAZRnImOm4h9x5YvXpIgtUI/edit`

2. 打開 `擴充功能 -> Apps Script`

3. 更新：
   - `Code.gs`

4. 到 `專案設定 -> 指令碼屬性` 新增：

```text
UENOTE_APP_PASSWORD = 你要使用的密碼
```

5. 重新部署 Web App

建議部署設定：

- Execute as：`Me`
- Who has access：`Anyone`

## Google Sheets 欄位

`Records` 工作表第一列應為：

```text
id | restaurant | item | type | note | author | source | createdAt | updatedAt
```

## API 行為

Apps Script Web App 現在支援：

- `GET ?api=ping&password=...`
- `GET ?api=records&password=...`
- `POST { action: "saveRecord", password, record }`
- `POST { action: "deleteRecord", password, id }`

另外也保留 JSONP / GET fallback：

- `GET ?api=saveRecord&password=...&record=...&callback=...`
- `GET ?api=deleteRecord&password=...&id=...&callback=...`

## 注意

- repo 如果是 public，別人可以看到你的前端原始碼
- 但現在前端不再保存真正的後端密碼
- 真正可寫入的判斷在 Apps Script 後端
