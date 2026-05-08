const STORAGE_KEY = "uenote-records-v5";
const CONFIG = window.UENOTE_CONFIG || {};

const demoRecords = [
  {
    id: "demo-1",
    restaurant: "港虛咖啡西湖店",
    item: "卡布奇諾 Cappuccino",
    type: "咖啡",
    author: "R",
    note: "",
    source: "manual",
    createdAt: "2026-05-07T02:17:00+08:00",
    updatedAt: "2026-05-07T02:17:00+08:00",
  },
  {
    id: "demo-2",
    restaurant: "有煎餃子館 忠杭店",
    item: "五小福套餐",
    type: "回購",
    author: "Joey",
    note: "皮還是很香。",
    source: "manual",
    createdAt: "2026-05-07T08:48:00+08:00",
    updatedAt: "2026-05-07T08:48:00+08:00",
  },
];

const state = {
  records: [],
  selectedRecordId: null,
  currentPage: "add",
  loading: false,
};

const els = {
  pages: document.querySelectorAll(".page"),
  navButtons: document.querySelectorAll(".top-switch-button"),
  restaurantInput: document.querySelector("#restaurant-input"),
  itemInput: document.querySelector("#item-input"),
  typeInput: document.querySelector("#type-input"),
  authorInput: document.querySelector("#author-input"),
  noteInput: document.querySelector("#note-input"),
  restaurantSuggestions: document.querySelector("#restaurant-suggestions"),
  itemSuggestions: document.querySelector("#item-suggestions"),
  saveRecord: document.querySelector("#save-record"),
  searchInput: document.querySelector("#search-input"),
  recordList: document.querySelector("#record-list"),
  syncStatus: document.querySelector("#sync-status"),
};

const apiClient = createApiClient(CONFIG);

bindEvents();
boot();

async function boot() {
  renderPage();
  renderRecords();
  setSyncStatus(apiClient.enabled ? "正在同步資料..." : "目前是本機預覽模式。");

  try {
    state.records = await apiClient.listRecords();
    persistLocalRecords(state.records);
    renderSuggestions();
    renderRecords();
    setSyncStatus(
      apiClient.enabled
        ? `已同步 ${state.records.length} 筆記錄`
        : "目前是本機預覽模式。"
    );
  } catch (error) {
    console.error(error);
    state.records = loadLocalRecords();
    renderSuggestions();
    renderRecords();
    setSyncStatus(`讀取失敗，先用本機資料：${error.message || error}`);
  }
}

function bindEvents() {
  els.navButtons.forEach((button) => {
    button.addEventListener("click", () => switchPage(button.dataset.page));
  });

  els.restaurantInput.addEventListener("input", renderSuggestions);
  els.itemInput.addEventListener("input", renderSuggestions);
  els.searchInput.addEventListener("input", renderRecords);
  els.saveRecord.addEventListener("click", handleSaveRecord);
}

function renderPage() {
  els.pages.forEach((page) => {
    page.classList.toggle("is-active", page.id === `page-${state.currentPage}`);
  });

  els.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.page === state.currentPage);
  });
}

function switchPage(pageName) {
  state.currentPage = pageName;
  renderPage();
}

function renderSuggestions() {
  const restaurants = unique(
    state.records.map((record) => record.restaurant).filter(Boolean)
  );
  const items = getSuggestedItems();

  fillDatalist(
    els.restaurantSuggestions,
    filterByKeyword(restaurants, els.restaurantInput.value.trim())
  );
  fillDatalist(
    els.itemSuggestions,
    filterByKeyword(items, els.itemInput.value.trim())
  );
}

async function handleSaveRecord() {
  const restaurant = els.restaurantInput.value.trim();
  const item = els.itemInput.value.trim();

  if (!restaurant || !item) {
    window.alert("請先填入店家與餐點。");
    return;
  }

  const existing = state.records.find((record) => record.id === state.selectedRecordId);
  const now = new Date().toISOString();

  const payload = {
    id: state.selectedRecordId || "",
    restaurant,
    item,
    type: els.typeInput.value.trim(),
    author: els.authorInput.value || "R",
    note: els.noteInput.value.trim(),
    source: "manual",
    createdAt: existing && existing.createdAt ? existing.createdAt : now,
  };

  els.saveRecord.disabled = true;
  setSyncStatus(state.selectedRecordId ? "正在更新資料..." : "正在儲存資料...");

  try {
    const savedRecord = await apiClient.saveRecord(payload);
    upsertRecord(savedRecord);
    persistLocalRecords(state.records);
    clearForm();
    renderSuggestions();
    renderRecords();
    switchPage("list");
    setSyncStatus("已儲存記錄");
  } catch (error) {
    console.error(error);
    setSyncStatus(`儲存失敗：${error.message || error}`);
  } finally {
    els.saveRecord.disabled = false;
  }
}

function renderRecords() {
  if (state.loading) {
    els.recordList.innerHTML = `
      <article class="record-card">
        <p class="record-title">讀取中...</p>
      </article>
    `;
    return;
  }

  const keyword = (els.searchInput.value || "").trim().toLowerCase();
  const filtered = state.records.filter((record) => {
    const corpus = `${record.restaurant} ${record.item} ${record.type} ${record.note} ${record.author}`.toLowerCase();
    return corpus.includes(keyword);
  });

  if (!filtered.length) {
    els.recordList.innerHTML = `
      <article class="record-card">
        <p class="record-title">還沒有記錄</p>
        <p class="record-subtitle">先新增一筆，之後就能在這裡編輯或刪除。</p>
      </article>
    `;
    return;
  }

  els.recordList.innerHTML = filtered.map((record) => {
    const noteText = record.note && record.note.trim() ? record.note.trim() : "無備註";
    return `
      <article class="record-card">
        <div class="record-top">
          <div>
            <p class="record-title">${escapeHtml(record.item)}</p>
            <p class="record-subtitle">${escapeHtml(record.restaurant)}</p>
          </div>
          <div class="record-actions">
            <button class="icon-button" data-action="edit" data-id="${escapeAttribute(record.id)}" type="button" aria-label="編輯" title="編輯">
              ${iconMarkup("edit")}
            </button>
            <button class="icon-button danger-button" data-action="delete" data-id="${escapeAttribute(record.id)}" type="button" aria-label="刪除" title="刪除">
              ${iconMarkup("delete")}
            </button>
          </div>
        </div>
        <div class="record-meta">
          <span class="record-chip">${iconMarkup("tag")}${escapeHtml(record.type || "未分類")}</span>
          <span class="record-chip">${iconMarkup("user")}${escapeHtml(record.author || "未指定")}</span>
          <span class="record-chip">${iconMarkup("clock")}${escapeHtml(formatDisplayTime(record.updatedAt))}</span>
        </div>
        <p class="record-subtitle">${escapeHtml(noteText)}</p>
      </article>
    `;
  }).join("");

  document.querySelectorAll('[data-action="edit"]').forEach((button) => {
    button.addEventListener("click", () => loadRecordIntoForm(button.dataset.id));
  });

  document.querySelectorAll('[data-action="delete"]').forEach((button) => {
    button.addEventListener("click", () => handleDeleteRecord(button.dataset.id));
  });
}

function loadRecordIntoForm(recordId) {
  const record = state.records.find((entry) => entry.id === recordId);
  if (!record) {
    return;
  }

  state.selectedRecordId = record.id;
  els.restaurantInput.value = record.restaurant || "";
  els.itemInput.value = record.item || "";
  els.typeInput.value = record.type || "";
  els.authorInput.value = record.author || "R";
  els.noteInput.value = record.note || "";
  renderSuggestions();
  switchPage("add");
  window.scrollTo({ top: 0, behavior: "smooth" });
  setSyncStatus("已帶入記錄，修改後再儲存即可。");
}

async function handleDeleteRecord(recordId) {
  const record = state.records.find((entry) => entry.id === recordId);
  if (!record) {
    return;
  }

  if (!window.confirm(`要刪除「${record.item}」嗎？`)) {
    return;
  }

  setSyncStatus("正在刪除資料...");

  try {
    await apiClient.deleteRecord(recordId);
    state.records = state.records.filter((entry) => entry.id !== recordId);
    persistLocalRecords(state.records);
    if (state.selectedRecordId === recordId) {
      clearForm();
    }
    renderSuggestions();
    renderRecords();
    setSyncStatus("已刪除記錄");
  } catch (error) {
    console.error(error);
    setSyncStatus(`刪除失敗：${error.message || error}`);
  }
}

function clearForm() {
  state.selectedRecordId = null;
  els.restaurantInput.value = "";
  els.itemInput.value = "";
  els.typeInput.value = "";
  els.authorInput.value = "R";
  els.noteInput.value = "";
}

function setSyncStatus(message) {
  els.syncStatus.textContent = message || "";
}

function fillDatalist(element, items) {
  element.innerHTML = items
    .slice(0, 10)
    .map((item) => `<option value="${escapeAttribute(item)}"></option>`)
    .join("");
}

function filterByKeyword(items, keyword) {
  if (!keyword) {
    return items;
  }

  const normalizedKeyword = keyword.toLowerCase();
  return items.filter((item) => item.toLowerCase().includes(normalizedKeyword));
}

function getSuggestedItems() {
  const restaurant = els.restaurantInput.value.trim();
  if (!restaurant) {
    return unique(state.records.map((record) => record.item).filter(Boolean));
  }

  return unique(
    state.records
      .filter((record) => record.restaurant === restaurant)
      .map((record) => record.item)
      .filter(Boolean)
  );
}

function upsertRecord(record) {
  const normalized = normalizeRecord(record);
  const existingIndex = state.records.findIndex((entry) => entry.id === normalized.id);

  if (existingIndex >= 0) {
    state.records[existingIndex] = normalized;
    return;
  }

  state.records.unshift(normalized);
}

function normalizeRecord(record) {
  const now = new Date().toISOString();
  return {
    id: String(record && record.id ? record.id : createId()),
    restaurant: String(record && record.restaurant ? record.restaurant : "").trim(),
    item: String(record && record.item ? record.item : "").trim(),
    type: String(record && record.type ? record.type : "").trim(),
    author: String(record && record.author ? record.author : "R").trim(),
    note: String(record && record.note ? record.note : "").trim(),
    source: String(record && record.source ? record.source : "manual").trim(),
    createdAt: String(record && record.createdAt ? record.createdAt : now),
    updatedAt: String(record && record.updatedAt ? record.updatedAt : now),
  };
}

function loadLocalRecords() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return demoRecords.map(normalizeRecord);
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length
      ? parsed.map(normalizeRecord)
      : demoRecords.map(normalizeRecord);
  } catch (error) {
    console.error(error);
    return demoRecords.map(normalizeRecord);
  }
}

function persistLocalRecords(records) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function formatDisplayTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function unique(items) {
  return [...new Set(items)];
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function iconMarkup(type) {
  const paths = {
    edit: '<path d="m4 20 4.5-1 9.25-9.25a1.75 1.75 0 0 0 0-2.5l-1-1a1.75 1.75 0 0 0-2.5 0L5 15.5 4 20Z"></path><path d="M12.5 7.5 16.5 11.5"></path>',
    delete: '<path d="M5.5 7.5h13"></path><path d="M9 7.5V5.75A1.25 1.25 0 0 1 10.25 4.5h3.5A1.25 1.25 0 0 1 15 5.75V7.5"></path><path d="M8.5 10.5v6"></path><path d="M12 10.5v6"></path><path d="M15.5 10.5v6"></path><path d="M6.5 7.5v10.75A1.25 1.25 0 0 0 7.75 19.5h8.5A1.25 1.25 0 0 0 17.5 18.25V7.5"></path>',
    tag: '<path d="M6.75 8.25h7.5l3.5 3.5-7.5 7.5-3.5-3.5Z"></path><circle cx="9.75" cy="11.25" r="1"></circle>',
    user: '<path d="M12 12.25a3.75 3.75 0 1 0-3.75-3.75A3.75 3.75 0 0 0 12 12.25Z"></path><path d="M5.25 19.25a6.75 6.75 0 0 1 13.5 0"></path>',
    clock: '<circle cx="12" cy="12" r="8"></circle><path d="M12 7.75v4.5l3 1.75"></path>',
  };

  return `<svg viewBox="0 0 24 24" class="ui-icon">${paths[type] || ""}</svg>`;
}

function createApiClient(config) {
  const apiUrl = String(config.apiUrl || "").trim();
  const apiToken = String(config.apiToken || "").trim();
  const enabled = Boolean(apiUrl);

  if (!enabled) {
    return {
      enabled: false,
      async listRecords() {
        return loadLocalRecords();
      },
      async saveRecord(record) {
        const saved = normalizeRecord({
          ...record,
          id: record.id || createId(),
          updatedAt: new Date().toISOString(),
        });
        return saved;
      },
      async deleteRecord() {
        return { ok: true };
      },
    };
  }

  return {
    enabled: true,
    async listRecords() {
      try {
        const data = await fetchJson(buildApiUrl(apiUrl, "records", { token: apiToken }));
        return normalizeRecordsFromApi(data.records);
      } catch (error) {
        const data = await loadJsonp(buildApiUrl(apiUrl, "records", { token: apiToken }));
        return normalizeRecordsFromApi(data.records);
      }
    },
    async saveRecord(record) {
      const payload = {
        action: "saveRecord",
        token: apiToken,
        record,
      };

      try {
        const data = await postJson(apiUrl, payload);
        return normalizeRecord(data.record || record);
      } catch (error) {
        const data = await loadJsonp(buildApiUrl(apiUrl, "saveRecord", {
          token: apiToken,
          record: JSON.stringify(record),
        }));
        return normalizeRecord(data.record || record);
      }
    },
    async deleteRecord(recordId) {
      const payload = {
        action: "deleteRecord",
        token: apiToken,
        id: recordId,
      };

      try {
        return await postJson(apiUrl, payload);
      } catch (error) {
        return await loadJsonp(buildApiUrl(apiUrl, "deleteRecord", {
          token: apiToken,
          id: recordId,
        }));
      }
    },
  };
}

function normalizeRecordsFromApi(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .map(normalizeRecord)
    .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || "資料讀取失敗");
  }
  return data;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    mode: "cors",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(data.error || "資料寫入失敗");
  }
  return data;
}

function loadJsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = `uenoteJsonp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const script = document.createElement("script");
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("連線逾時"));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    }

    window[callbackName] = (data) => {
      cleanup();
      if (!data || data.ok === false) {
        reject(new Error((data && data.error) || "資料讀取失敗"));
        return;
      }
      resolve(data);
    };

    script.src = `${url}${url.includes("?") ? "&" : "?"}callback=${callbackName}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("無法連到後端"));
    };

    document.body.appendChild(script);
  });
}

function buildApiUrl(baseUrl, api, params = {}) {
  const url = new URL(baseUrl);
  url.searchParams.set("api", api);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}
