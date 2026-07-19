/**
 * One-time migration: copy every file under UPLOAD_DIR (/var/uploads) into the
 * R2 bucket, preserving the relative path as the object key. Run INSIDE the
 * hn-backend container (it has @aws-sdk/client-s3 + the R2_* env vars + the
 * hn_uploads volume mounted at /var/uploads).
 *
 *   docker cp migrate-uploads-to-r2.js hn-backend:/tmp/
 *   docker exec hn-backend node /tmp/migrate-uploads-to-r2.js
 *
 * Idempotent: re-running just re-uploads (overwrites) the same keys.
 */
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { promises: fs } = require('fs');
const path = require('path');

const ROOT = process.env.UPLOAD_DIR || '/var/uploads';
const accountId = process.env.R2_ACCOUNT_ID;
const endpoint =
  process.env.R2_ACCOUNT_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
const Bucket = process.env.R2_BUCKET;

if (!endpoint || !Bucket || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
  console.error('R2 env not fully set — aborting.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

const CT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml', ico: 'image/x-icon',
};

async function walk(dir) {
  let out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(await walk(full));
    else out.push(full);
  }
  return out;
}

(async () => {
  const files = await walk(ROOT);
  console.log(`Found ${files.length} files under ${ROOT}`);
  let ok = 0;
  let fail = 0;
  for (const f of files) {
    const key = path.relative(ROOT, f).split(path.sep).join('/');
    const ext = path.extname(f).slice(1).toLowerCase();
    const body = await fs.readFile(f);
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket,
          Key: key,
          Body: body,
          ContentType: CT[ext] || 'application/octet-stream',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      ok++;
      if (ok % 50 === 0) console.log(`  uploaded ${ok}/${files.length}`);
    } catch (e) {
      fail++;
      console.error(`FAIL ${key}: ${e.message}`);
    }
  }
  console.log(`Done. uploaded=${ok} failed=${fail} total=${files.length}`);
})();
