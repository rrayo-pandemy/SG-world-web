const provider = process.env.STORAGE_PROVIDER || 'local';
let impl;
if (provider === 's3' || provider === 'minio') {
  impl = require('./s3');
} else {
  impl = require('./local');
}

module.exports = {
  upload: impl.upload,
  delete: impl.delete,
  getUrl: impl.getUrl,
};
