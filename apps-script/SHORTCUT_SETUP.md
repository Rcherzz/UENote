# Shortcut Setup

This setup keeps Google Sheets as the database and lets iPhone Shortcuts send records directly to Apps Script.

## 1. Update Apps Script

Use the latest local files:

- [Code.gs](C:/Users/user/Desktop/ANTI/UENote/apps-script/Code.gs)
- [Index.html](C:/Users/user/Desktop/ANTI/UENote/apps-script/Index.html)
- [Style.html](C:/Users/user/Desktop/ANTI/UENote/apps-script/Style.html)
- [App.html](C:/Users/user/Desktop/ANTI/UENote/apps-script/App.html)

## 2. Set a shortcut secret

In `Code.gs`, change:

```javascript
const SHORTCUT_SECRET = "";
```

to a random string, for example:

```javascript
const SHORTCUT_SECRET = "uenote-shortcut-2026-04";
```

## 3. Deploy Apps Script for shortcut use

Deploy as Web App:

- Execute as: `Me`
- Who has access: `Anyone with the link`

This is needed because Shortcuts will call the web endpoint directly.

## 4. Shortcut request format

Use `Get Contents of URL` with:

- Method: `POST`
- Request body: `JSON`
- URL: your Apps Script Web App URL

JSON body example:

```json
{
  "action": "saveRecords",
  "secret": "uenote-shortcut-2026-04",
  "records": [
    {
      "restaurant": "小皮咖啡輕食",
      "item": "莊園拿鐵",
      "rating": 5,
      "note": "",
      "author": "R",
      "source": "shortcut"
    },
    {
      "restaurant": "小皮咖啡輕食",
      "item": "橘皮拿鐵",
      "rating": 5,
      "note": "",
      "author": "R",
      "source": "shortcut"
    }
  ]
}
```

## 5. Suggested shortcut flow

1. Receive image from Share Sheet.
2. Extract text from image.
3. Use regex / text replacement to get:
   - restaurant
   - item lines
4. Let user choose items.
5. Build JSON.
6. POST to Apps Script.
7. Show success notification.
