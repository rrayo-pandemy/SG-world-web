// Upload a small test avatar using the test account
(async () => {
  try {
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
    const credentials = { email: 'test+dev@local.test', password: 'Password1!' };

    const loginResp = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const loginJson = await loginResp.json();
    if (!loginResp.ok) {
      console.error('Login failed', loginJson);
      process.exit(2);
    }
    const token = loginJson.token;
    console.log('Got token (truncated):', token ? token.slice(0, 24) + '...' : token);

    const avatarBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';
    const avatarDataUrl = `data:image/png;base64,${avatarBase64}`;

    const uploadResp = await fetch(`${baseUrl}/api/v1/me/avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar: avatarDataUrl }),
    });

    const uploadJson = await uploadResp.json();
    console.log('Upload response:', JSON.stringify(uploadJson, null, 2));
    process.exit(uploadResp.ok ? 0 : 3);
  } catch (err) {
    console.error('Error performing test upload:', err);
    process.exit(4);
  }
})();
