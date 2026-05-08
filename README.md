# UENote

UENote 現在改成這個架構：

- 前端：GitHub Pages 或其他靜態網站
- 後端：Google Apps Script Web App
- 資料庫：Google Sheets

這樣做的好處是：

- 前端樣式可自由調整，不再受 Apps Script 畫面限制
- Google Sheets 仍保留成最直覺的資料庫
- 只要更新靜態檔案，就能改前端版面

## 專案檔案

前端主要使用：

- `index.html`
- `style.css`
- `app.js`
- `config.js`

Apps Script 後端主要使用：

- `apps-script/Code.gs`

## 前端設定

`config.js` 目前是空白設定：

```js
window.UENOTE_CONFIG = {
  apiUrl: "",
  apiToken: "",
};
```

部署前請填入：

- `apiUrl`
  Apps Script Web App 的正式網址
- `apiToken`
  你在 Apps Script `Script Properties` 裡設定的共享 token

範例可看：

- `config.example.js`

## Apps Script 後端設定

1. 打開你的 Google Sheet  
   `https://docs.google.com/spreadsheets/d/1jXY0Yr06seR-oqAuMd6pPAZRnImOm4h9x5YvXpIgtUI/edit`

2. 開啟 `擴充功能 -> Apps Script`

3. 只需要更新：
   - `Code.gs`

4. 到 `專案設定 -> 指令碼屬性` 新增：

```text
UENOTE_API_TOKEN = 你自訂的一串字
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

- `GET ?api=ping`
- `GET ?api=records&token=...`
- `POST { action: "saveRecord", token, record }`
- `POST { action: "deleteRecord", token, id }`

另外也保留 JSONP / GET fallback，讓 GitHub Pages 與 Apps Script 跨網域時更穩：

- `GET ?api=saveRecord&token=...&record=...&callback=...`
- `GET ?api=deleteRecord&token=...&id=...&callback=...`

## GitHub Pages 部署方向

建議把這些檔案放到 GitHub repo 根目錄：

- `index.html`
- `style.css`
- `app.js`
- `config.js`
- `uenote-icon.png`

之後在 GitHub 開啟 Pages 即可。

## 注意

- `config.js` 裡的 token 會存在前端，所以這是「方便共享」而不是高安全等級方案。
- 如果之後要更安全，建議再補登入或改成更正式的後端。
