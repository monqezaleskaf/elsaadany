PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, price REAL NOT NULL DEFAULT 0, image TEXT, category TEXT, stock INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), brand TEXT, image_url TEXT, is_hidden INTEGER DEFAULT 0);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
INSERT INTO "settings" ("key","value") VALUES('admin_password','Elsaadany#2027');
CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_name TEXT, customer_phone TEXT, customer_address TEXT, total REAL, status TEXT DEFAULT 'pending', location_lat REAL, location_lng REAL, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, offer_id INTEGER, quantity INTEGER, price REAL, item_name TEXT);
CREATE TABLE offers (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, discount_percent REAL, manual_price REAL, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE offer_items (id INTEGER PRIMARY KEY AUTOINCREMENT, offer_id INTEGER, product_id INTEGER, quantity INTEGER);
DELETE FROM sqlite_sequence;
