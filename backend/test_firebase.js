const { db } = require('./config/firebase');

console.log('Starting Firestore connection diagnostic test...');

db.collection('users').limit(1).get()
  .then(snapshot => {
    console.log('✅ Firestore connection successful!');
    console.log(`Successfully fetched ${snapshot.size} user documents.`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Firestore connection failed!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Stack Trace:', error.stack);
    process.exit(1);
  });
