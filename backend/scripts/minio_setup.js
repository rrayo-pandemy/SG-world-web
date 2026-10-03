const { S3Client, CreateBucketCommand, HeadBucketCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
const accessKey = process.env.S3_ACCESS_KEY || 'minioadmin';
const secretKey = process.env.S3_SECRET_KEY || 'minioadmin';
const bucket = process.env.S3_BUCKET || 'auramarket-dev';
const forcePathStyle = (process.env.S3_FORCE_PATH_STYLE || 'true') === 'true';

const s3 = new S3Client({
  endpoint,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  forcePathStyle,
});

async function createBucketIfNotExists() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log('Bucket already exists:', bucket);
  } catch (e) {
    console.log('Creating bucket:', bucket);
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log('Bucket created:', bucket);
  }
}

async function uploadTestImage() {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='; // 1x1 PNG
  const buffer = Buffer.from(base64, 'base64');
  const key = `avatars/test_upload_${Date.now()}.png`;
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: 'image/png' }));
  const url = forcePathStyle ? `${endpoint.replace(/\/$/, '')}/${bucket}/${key}` : `https://${bucket}.s3.amazonaws.com/${key}`;
  console.log('Uploaded test image to:', url);
}

(async () => {
  try {
    await createBucketIfNotExists();
    await uploadTestImage();
    process.exit(0);
  } catch (err) {
    console.error('Error during MinIO setup:', err);
    process.exit(2);
  }
})();
