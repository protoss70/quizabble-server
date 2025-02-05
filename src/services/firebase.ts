import * as admin from 'firebase-admin';

const base64String = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64!.replace(/\\n/g, '\n');
const jsonString = Buffer.from(base64String, 'base64').toString();
const serviceAccount = JSON.parse(jsonString);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;