const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const DEFAULT_UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'uploads', 'avatars');
const UPLOADS_DIR = process.env.LOCAL_UPLOADS_DIR || DEFAULT_UPLOADS_DIR;

async function ensureDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

async function upload(buffer, { filename, contentType } = {}) {
  await ensureDir();
  const ext = path.extname(filename || '') || '';
  const key = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
  const filePath = path.join(UPLOADS_DIR, key);
  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  const urlBase = process.env.LOCAL_UPLOAD_URL_BASE || '/uploads/avatars';
  return { key, url: `${urlBase}/${key}` };
}

async function _delete(key) {
  try {
    const filePath = path.join(UPLOADS_DIR, key);
    await fs.unlink(filePath).catch(() => {});
  } catch (e) {
    // ignore
  }
}

function getUrl(key) {
  const urlBase = process.env.LOCAL_UPLOAD_URL_BASE || '/uploads/avatars';
  return `${urlBase}/${key}`;
}

module.exports = { upload, delete: _delete, getUrl };
