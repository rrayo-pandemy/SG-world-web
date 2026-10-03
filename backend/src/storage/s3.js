const path = require('path');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || undefined,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY ? {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  } : undefined,
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
});

const BUCKET = process.env.S3_BUCKET || 'auramarket-dev';

async function upload(buffer, { filename, contentType } = {}) {
  const ext = path.extname(filename || '') || '';
  const key = `avatars/${Date.now()}_${Math.random().toString(36).slice(2,8)}${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
    ACL: process.env.S3_PUBLIC === 'true' ? 'public-read' : undefined,
  }));

  let url;
  if (process.env.S3_ENDPOINT && process.env.S3_FORCE_PATH_STYLE === 'true') {
    url = `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${BUCKET}/${key}`;
  } else {
    url = `https://${BUCKET}.s3.amazonaws.com/${key}`;
  }

  return { key, url };
}

async function _delete(keyOrPath) {
  const key = keyOrPath.startsWith('avatars/') ? keyOrPath : `avatars/${path.basename(keyOrPath)}`;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch (e) {
    // ignore
  }
}

function getUrl(keyOrPath) {
  const key = keyOrPath.startsWith('avatars/') ? keyOrPath : `avatars/${path.basename(keyOrPath)}`;
  if (process.env.S3_ENDPOINT && process.env.S3_FORCE_PATH_STYLE === 'true') {
    return `${process.env.S3_ENDPOINT.replace(/\/$/, '')}/${BUCKET}/${key}`;
  }
  return `https://${BUCKET}.s3.amazonaws.com/${key}`;
}

module.exports = { upload, delete: _delete, getUrl };
