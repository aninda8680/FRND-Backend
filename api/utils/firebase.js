const admin = require('firebase-admin');

try {
  const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (base64Key) {
    const serviceAccountJson = Buffer.from(base64Key, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('[FIREBASE] Admin SDK initialized successfully in API.');
    }
  } else {
    console.warn('[FIREBASE] FIREBASE_SERVICE_ACCOUNT_BASE64 is not set in .env');
  }
} catch (error) {
  console.error('[FIREBASE] Failed to initialize Admin SDK:', error);
}

module.exports = admin;
