CREATE TABLE publication_queue (
 id INTEGER PRIMARY KEY CHECK(id=1),
 saved_revision INTEGER NOT NULL DEFAULT 1,
 published_revision INTEGER NOT NULL DEFAULT 0,
 paused INTEGER NOT NULL DEFAULT 0,
 error TEXT
);
INSERT INTO publication_queue(id) VALUES(1);
ALTER TABLE publications ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
CREATE TRIGGER catalog_product_insert AFTER INSERT ON products BEGIN UPDATE publication_queue SET saved_revision=saved_revision+1 WHERE id=1; END;
CREATE TRIGGER catalog_product_update AFTER UPDATE ON products BEGIN UPDATE publication_queue SET saved_revision=saved_revision+1 WHERE id=1; END;
CREATE TRIGGER catalog_product_delete AFTER DELETE ON products BEGIN UPDATE publication_queue SET saved_revision=saved_revision+1 WHERE id=1; END;
CREATE TRIGGER catalog_settings_insert AFTER INSERT ON settings BEGIN UPDATE publication_queue SET saved_revision=saved_revision+1 WHERE id=1; END;
CREATE TRIGGER catalog_settings_update AFTER UPDATE ON settings BEGIN UPDATE publication_queue SET saved_revision=saved_revision+1 WHERE id=1; END;
