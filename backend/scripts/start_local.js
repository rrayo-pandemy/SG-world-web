// Start server with STORAGE_PROVIDER=local to avoid shell quoting issues
process.env.STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'local';
require('../server');
