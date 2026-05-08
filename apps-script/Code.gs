const SPREADSHEET_ID = "1jXY0Yr06seR-oqAuMd6pPAZRnImOm4h9x5YvXpIgtUI";
const SHEET_NAME = "Records";
const ALLOWED_EMAILS = [
  "jimmy61704@yahoo.com.tw",
  "joeylin0514@gmail.com",
];
const HEADERS = [
  "id",
  "restaurant",
  "item",
  "type",
  "note",
  "author",
  "source",
  "createdAt",
  "updatedAt",
];
const APP_PASSWORD_KEY = "UENOTE_APP_PASSWORD";

function doGet(e) {
  if (isApiRequest_(e)) {
    return handleApiGet_(e);
  }

  return HtmlService
    .createHtmlOutput(
      [
        "<!DOCTYPE html>",
        "<html lang='zh-Hant'>",
        "<head>",
        "<meta charset='UTF-8'>",
        "<meta name='viewport' content='width=device-width, initial-scale=1.0, viewport-fit=cover'>",
        "<title>UENote Backend</title>",
        "<style>",
        "body{margin:0;padding:32px;background:#435cad;color:#fff2f2;font-family:-apple-system,BlinkMacSystemFont,'PingFang TC','Noto Sans TC',sans-serif;}",
        ".card{max-width:520px;margin:0 auto;padding:24px;border-radius:24px;background:#eab7bb;color:#24479f;box-shadow:10px 12px 0 rgba(40,56,118,.26);}",
        "h1{margin:0 0 10px;font-size:32px;line-height:1;}",
        "p{margin:0 0 12px;line-height:1.6;}",
        "code{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.28);}",
        "</style>",
        "</head>",
        "<body>",
        "<div class='card'>",
        "<h1>UENote Backend</h1>",
        "<p>這個 Apps Script 現在只負責資料 API。</p>",
        "<p>請在 GitHub Pages 前端輸入密碼後，再透過這個網址讀寫資料。</p>",
        "<p>測試用：<code>?api=ping</code></p>",
        "</div>",
        "</body>",
        "</html>",
      ].join("")
    )
    .setTitle("UENote Backend")
    .addMetaTag(
      "viewport",
      "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    )
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  return handleApiPost_(e);
}

function listRecords() {
  assertAllowedUser_();
  return listRecordsInternal_();
}

function saveRecord(record) {
  assertAllowedUser_();
  return saveRecordInternal_(record);
}

function deleteRecord(recordId) {
  assertAllowedUser_();
  return deleteRecordInternal_(recordId);
}

function getRecordsSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet);
  return sheet;
}

function handleApiGet_(e) {
  try {
    assertApiAccess_(e, null);
    const action = String((e && e.parameter && e.parameter.api) || "").trim();

    if (action === "records") {
      return jsonResponse_({
        ok: true,
        records: listRecordsInternal_(),
      }, e);
    }

    if (action === "ping") {
      return jsonResponse_({
        ok: true,
        status: "ready",
      }, e);
    }

    if (action === "saveRecord") {
      const raw = String((e && e.parameter && e.parameter.record) || "").trim();
      if (!raw) {
        throw new Error("Missing record payload");
      }

      const record = JSON.parse(raw);
      return jsonResponse_({
        ok: true,
        record: saveRecordInternal_(record),
      }, e);
    }

    if (action === "deleteRecord") {
      const recordId = String((e && e.parameter && e.parameter.id) || "").trim();
      if (!recordId) {
        throw new Error("Missing record id");
      }

      return jsonResponse_({
        ok: true,
        result: deleteRecordInternal_(recordId),
      }, e);
    }

    return jsonResponse_({
      ok: false,
      error: "Unsupported API action",
    }, e);
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message,
    }, e);
  }
}

function handleApiPost_(e) {
  try {
    const payload = parseJsonBody_(e);
    assertApiAccess_(e, payload);
    const action = String(payload.action || "").trim();

    if (action === "saveRecord") {
      return jsonResponse_({
        ok: true,
        record: saveRecordInternal_(payload.record || payload),
      });
    }

    if (action === "deleteRecord") {
      return jsonResponse_({
        ok: true,
        result: deleteRecordInternal_(payload.id || payload.recordId),
      });
    }

    if (action === "ping") {
      return jsonResponse_({
        ok: true,
        status: "ready",
      });
    }

    return jsonResponse_({
      ok: false,
      error: "Unsupported action",
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error.message,
    });
  }
}

function listRecordsInternal_() {
  const sheet = getRecordsSheet();
  const rows = sheet.getDataRange().getValues();

  if (rows.length <= 1) {
    return [];
  }

  return rows
    .slice(1)
    .filter((row) => row[0])
    .map(rowToRecord_)
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

function saveRecordInternal_(record) {
  const sheet = getRecordsSheet();
  const now = new Date().toISOString();
  const payload = normalizeRecord_(record, now);
  const rows = sheet.getDataRange().getValues();
  const existingIndex = rows.findIndex((row, index) => index > 0 && row[0] === payload.id);

  if (existingIndex >= 0) {
    payload.createdAt = rows[existingIndex][7] || payload.createdAt || now;
    sheet.getRange(existingIndex + 1, 1, 1, HEADERS.length).setValues([recordToRow_(payload)]);
    return payload;
  }

  payload.id = payload.id || Utilities.getUuid();
  payload.createdAt = payload.createdAt || now;
  sheet.appendRow(recordToRow_(payload));
  return payload;
}

function deleteRecordInternal_(recordId) {
  const targetId = String(recordId || "").trim();
  if (!targetId) {
    throw new Error("Missing record id");
  }

  const sheet = getRecordsSheet();
  const rows = sheet.getDataRange().getValues();
  const existingIndex = rows.findIndex((row, index) => index > 0 && row[0] === targetId);

  if (existingIndex < 0) {
    throw new Error("Record not found");
  }

  sheet.deleteRow(existingIndex + 1);
  return { id: targetId };
}

function ensureHeaders_(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  const values = range.getValues()[0];
  const hasHeaders = HEADERS.every((header, index) => values[index] === header);

  if (!hasHeaders) {
    range.setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function assertAllowedUser_() {
  const email = Session.getActiveUser().getEmail();

  if (!email) {
    throw new Error("Unable to verify Google account");
  }

  if (!ALLOWED_EMAILS.includes(email)) {
    throw new Error("This Google account is not allowed");
  }
}

function assertApiAccess_(e, payload) {
  const configuredPassword = getConfiguredPassword_();

  if (configuredPassword) {
    const suppliedPassword = extractPassword_(e, payload);
    if (suppliedPassword !== configuredPassword) {
      throw new Error("Invalid password");
    }
    return;
  }

  assertAllowedUser_();
}

function getConfiguredPassword_() {
  return String(
    PropertiesService
      .getScriptProperties()
      .getProperty(APP_PASSWORD_KEY) || ""
  ).trim();
}

function extractPassword_(e, payload) {
  return String(
    (payload && payload.password) ||
    (e && e.parameter && e.parameter.password) ||
    ""
  ).trim();
}

function parseJsonBody_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : "{}";

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error("Invalid JSON payload");
  }
}

function jsonResponse_(data, e) {
  const callback = String((e && e.parameter && e.parameter.callback) || "").trim();

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(data)})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function isApiRequest_(e) {
  return Boolean(e && e.parameter && e.parameter.api);
}

function normalizeRecord_(record, now) {
  return {
    id: String(record && record.id ? record.id : "").trim(),
    restaurant: String(record && record.restaurant ? record.restaurant : "").trim(),
    item: String(record && record.item ? record.item : "").trim(),
    type: String(record && record.type ? record.type : "").trim(),
    note: String(record && record.note ? record.note : "").trim(),
    author: String(record && record.author ? record.author : "R").trim(),
    source: String(record && record.source ? record.source : "manual").trim(),
    createdAt: String(record && record.createdAt ? record.createdAt : now).trim(),
    updatedAt: now,
  };
}

function rowToRecord_(row) {
  return {
    id: row[0],
    restaurant: row[1],
    item: row[2],
    type: row[3],
    note: row[4],
    author: row[5],
    source: row[6],
    createdAt: row[7],
    updatedAt: row[8],
  };
}

function recordToRow_(record) {
  return [
    record.id,
    record.restaurant,
    record.item,
    record.type,
    record.note,
    record.author,
    record.source,
    record.createdAt,
    record.updatedAt,
  ];
}
