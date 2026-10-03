const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

// Simple in-memory per-file write lock to avoid concurrent write races
const writeLocks = new Map();

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFile(filePath, defaultData) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

async function ensureFileAsync(filePath, defaultData) {
  try {
    await fsp.access(filePath);
  } catch (e) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
  }
}

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

async function readJsonAsync(filePath) {
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return [];
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function writeJsonAsync(filePath, payload) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });

  // Serialize writes per filePath
  const doWrite = async () => {
    await fsp.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  };

  const prev = writeLocks.get(filePath) || Promise.resolve();
  const next = prev.then(doWrite, doWrite);
  writeLocks.set(filePath, next);
  try {
    await next;
  } finally {
    // remove lock if it's the same promise
    if (writeLocks.get(filePath) === next) writeLocks.delete(filePath);
  }
}

module.exports = {
  ensureDir,
  ensureFile,
  ensureFileAsync,
  readJson,
  readJsonAsync,
  writeJson,
  writeJsonAsync,
  path,
};
