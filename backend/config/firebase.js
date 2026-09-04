const admin = require("firebase-admin");

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT env variable:", error.message);
  }
} 

if (!serviceAccount) {
  try {
    serviceAccount = require("./serviceAccountKey.json");
  } catch (error) {
    console.error("Missing or invalid serviceAccountKey.json. Please provide FIREBASE_SERVICE_ACCOUNT env var or the json file locally.");
  }
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
} else {
  console.warn("Firebase Admin initialized without credentials! Expect failures in authenticated routes.");
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };