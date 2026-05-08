const NOTION_VERSION = "2022-06-28";

export default async function handler(req, res) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }

  if (req.method === "POST") {
    return handlePost(req, res);
  }

  if (req.method === "PATCH") {
    return handlePatch(req, res);
  }

  res.setHeader("Allow", "GET,POST,PATCH");
  return res.status(405).json({ error: "Method not allowed" });
}

async function handleGet(_req, res) {
  try {
    assertConfig();

    const response = await notionFetch(`https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: "POST",
      body: JSON.stringify({
        sorts: [
          {
            property: "Updated At",
            direction: "descending"
          }
        ],
        page_size: 100
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || "Failed to query Notion" });
    }

    return res.status(200).json({
      records: (data.results || []).map(mapNotionPage)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handlePost(req, res) {
  try {
    assertConfig();
    const payload = normalizePayload(req.body);

    const response = await notionFetch("https://api.notion.com/v1/pages", {
      method: "POST",
      body: JSON.stringify({
        parent: {
          database_id: process.env.NOTION_DATABASE_ID
        },
        properties: buildNotionProperties(payload)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || "Failed to create page" });
    }

    return res.status(200).json({
      record: mapNotionPage(data)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handlePatch(req, res) {
  try {
    assertConfig();
    const payload = normalizePayload(req.body);
    if (!payload.id) {
      return res.status(400).json({ error: "Missing page id" });
    }

    const response = await notionFetch(`https://api.notion.com/v1/pages/${payload.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        properties: buildNotionProperties(payload)
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || "Failed to update page" });
    }

    return res.status(200).json({
      record: mapNotionPage(data)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function assertConfig() {
  if (!process.env.NOTION_TOKEN) {
    throw new Error("Missing NOTION_TOKEN");
  }

  if (!process.env.NOTION_DATABASE_ID) {
    throw new Error("Missing NOTION_DATABASE_ID");
  }
}

function normalizePayload(body) {
  return {
    id: body?.id || "",
    restaurant: String(body?.restaurant || "").trim(),
    item: String(body?.item || "").trim(),
    rating: Number(body?.rating || 0),
    author: String(body?.author || "A").trim() || "A",
    note: String(body?.note || "").trim(),
    source: String(body?.source || "manual").trim() || "manual",
    updatedAt: new Date().toISOString()
  };
}

function buildNotionProperties(payload) {
  return {
    Restaurant: {
      title: [
        {
          text: {
            content: payload.restaurant
          }
        }
      ]
    },
    Item: {
      rich_text: payload.item ? [{ text: { content: payload.item } }] : []
    },
    Rating: {
      number: payload.rating || null
    },
    Note: {
      rich_text: payload.note ? [{ text: { content: payload.note } }] : []
    },
    Author: {
      select: payload.author ? { name: payload.author } : null
    },
    "Updated At": {
      date: {
        start: payload.updatedAt
      }
    },
    Source: {
      select: payload.source ? { name: payload.source } : null
    }
  };
}

function mapNotionPage(page) {
  const properties = page.properties || {};
  return {
    id: page.id,
    restaurant: getTitle(properties.Restaurant),
    item: getRichText(properties.Item),
    rating: properties?.Rating?.number || 0,
    note: getRichText(properties.Note),
    author: properties?.Author?.select?.name || "",
    updatedAt: properties?.["Updated At"]?.date?.start || page.last_edited_time,
    source: properties?.Source?.select?.name || "manual"
  };
}

function getTitle(property) {
  return (property?.title || []).map((entry) => entry.plain_text || "").join("");
}

function getRichText(property) {
  return (property?.rich_text || []).map((entry) => entry.plain_text || "").join("");
}

async function notionFetch(url, init) {
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_VERSION
    }
  });
}
