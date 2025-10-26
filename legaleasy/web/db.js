// @ts-check
import sqlite3 from "sqlite3";
import { promisify } from "util";

const DB_PATH = `${process.cwd()}/database.sqlite`;

// Open database connection
const db = new sqlite3.Database(DB_PATH);

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Initialize merchant_settings table
async function initDB() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS merchant_settings (
      shop TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 1,
      brand_color TEXT DEFAULT '#00B3A6',
      brand_icon TEXT DEFAULT '◆',
      vercel_api_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("Database initialized: merchant_settings table ready");
}

// Get settings for a shop
async function getSettings(shop) {
  const settings = await dbGet(
    "SELECT * FROM merchant_settings WHERE shop = ?",
    [shop]
  );

  if (!settings) {
    // Return defaults if no settings exist
    return {
      shop,
      enabled: true,
      brand_color: "#00B3A6",
      brand_icon: "◆",
      vercel_api_url: null,
    };
  }

  return {
    shop: settings.shop,
    enabled: Boolean(settings.enabled),
    brand_color: settings.brand_color,
    brand_icon: settings.brand_icon,
    vercel_api_url: settings.vercel_api_url,
  };
}

// Save settings for a shop
async function saveSettings(shop, settings) {
  const { enabled, brand_color, brand_icon, vercel_api_url } = settings;

  await dbRun(
    `INSERT INTO merchant_settings (shop, enabled, brand_color, brand_icon, vercel_api_url, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(shop) DO UPDATE SET
       enabled = excluded.enabled,
       brand_color = excluded.brand_color,
       brand_icon = excluded.brand_icon,
       vercel_api_url = excluded.vercel_api_url,
       updated_at = CURRENT_TIMESTAMP`,
    [shop, enabled ? 1 : 0, brand_color, brand_icon, vercel_api_url]
  );

  return getSettings(shop);
}

// Delete settings for a shop (useful for uninstall webhook)
async function deleteSettings(shop) {
  await dbRun("DELETE FROM merchant_settings WHERE shop = ?", [shop]);
}

// Initialize database on module load
initDB().catch((err) => {
  console.error("Failed to initialize database:", err);
});

export { getSettings, saveSettings, deleteSettings };
