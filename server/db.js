import { upgradeVariantTypes } from "../src/variant-types.js";
import { upgradeHierarchy } from "../src/hierarchy.js";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// All writes use one transaction. PostgreSQL locks the catalog row; SQLite
// serializes transactions on the local connection. No serverless disk storage.
export async function openDatabase(env = process.env) {
  if (env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 3,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 10000,
    });
    const wrap = (client) => ({
      query: async (sql, args = []) => {
        let i = 0;
        const r = await client.query(
          sql.replace(/\?/g, () => "$" + ++i),
          args,
        );
        return { rows: r.rows, changes: r.rowCount };
      },
      dialect: "postgres",
    });
    return {
      dialect: "postgres",
      query: (...args) => wrap(pool).query(...args),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const result = await fn(wrap(c));
          await c.query("COMMIT");
          return result;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (env.NETLIFY === "true" || env.NODE_ENV === "production")
    throw new Error("DATABASE_URL must be configured in production.");
  const { DatabaseSync } = await import("node:sqlite");
  const file = env.SQLITE_PATH || resolve("data/pm1864.sqlite");
  if (file !== ":memory:") await mkdir(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  const tx = {
    dialect: "sqlite",
    query: async (sql, args = []) => {
      const statement = db.prepare(sql);
      if (/^\s*(SELECT|WITH)/i.test(sql))
        return { rows: statement.all(...args), changes: 0 };
      const result = statement.run(...args);
      return { rows: [], changes: result.changes };
    },
  };
  let tail = Promise.resolve();
  const transaction = (fn) => {
    const result = tail.then(async () => {
      db.exec("BEGIN IMMEDIATE");
      try {
        const value = await fn(tx);
        db.exec("COMMIT");
        return value;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    });
    tail = result.catch(() => {});
    return result;
  };
  return {
    dialect: "sqlite",
    query: (sql, args) => transaction((t) => t.query(sql, args)),
    transaction,
    close: async () => {
      await tail;
      db.close();
    },
  };
}

export async function migrate(db, seed) {…10025 tokens truncated…ector("canvas");
      if (!source?.width)
        throw new Error("QR kod hazırlanamadı. Yeniden deneyin.");
      const canvas = document.createElement("canvas"),
        margin = Math.ceil(source.width * 0.1);
      canvas.width = canvas.height = source.width + margin * 2;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Bu tarayıcı QR indirmeyi desteklemiyor.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(source, margin, margin);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("QR dosyası oluşturulamadı.");
      const href = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = href;
      link.download = product.productCode + "-QR.png";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      notify("QR kod indirildi.");
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }
  return (
    <EditorPage title="Ürün kartı ve QR" onClose={onClose} busy={busy}>
      <div className="product-card-workspace">
        <ProductDetails
          product={productCardData(
            product,
            categories,
            product.customImage,
            variantTypes,
          )}
        />
        <Card className="product-card-sharing">
          <h3>QR kod ve paylaşım</h3>
          <SlTag variant={live ? "success" : "neutral"}>
            {live ? "Yayında" : enabled ? "Yayın durduruldu" : "Yayınlanmadı"}
          </SlTag>
          <p className="muted">
            Yayınlanan kart, QR kod veya bağlantı üzerinden giriş yapmadan
            görüntülenir. Ürün güncellemeleri aynı bağlantıya yansır.
          </p>
          {can(user, "products.write") && (
            <SlSwitch
              checked={enabled}
              disabled={busy || (!enabled && !eligible)}
              onSlChange={publish}
            >
              Ürün kartını yayınla
            </SlSwitch>
          )}
          {!eligible && (
            <SlAlert open variant="neutral">
              Yayınlamak için ürün, ana kategori ve alt kategori aktif olmalı;
              en az bir aktif varyant bulunmalıdır.
            </SlAlert>
          )}
          {error && (
            <SlAlert open variant="danger">
              {error}
            </SlAlert>
          )}
          <div className="product-qr-frame">
            <SlQrCode
              ref={qr}
              value={url}
              label={product.name + " ürün kartı QR kodu"}
              size={200}
              errorCorrection="H"
              fill="#000000"
              background="#ffffff"
              radius={0}
            />
          </div>
          <div>
            <Input
              label="Ürün kartı bağlantısı"
              aria-label="Ürün kartı bağlantısı"
              value={url}
              readOnly
            />
          </div>
          <div className="product-card-share-actions">
            <Button type="button" onClick={copy}>
              <Copy size={18} />
              Bağlantıyı kopyala
            </Button>
            <Button type="button" disabled={downloading} onClick={download}>
              <DownloadSimple size={18} />
              QR kodu indir
            </Button>
            <Button
              type="button"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              disabled={!live}
            >
              <ArrowSquareOut size={18} />
              Public kartı aç
            </Button>
          </div>
          {!live && (
            <p className="muted">
              Bu QR kod ve bağlantı, kart yayınlandıktan sonra herkese açık
              olarak çalışır.
            </p>
          )}
        </Card>
      </div>
    </EditorPage>
  );
}
