require('dotenv').config();
const { getGeoAddress } = require('./utils/geoAddressing');
const { db } = require('./config/firebase');

async function testIntegration() {
  console.log('--- Starting Geo-Addressing Backend Integration Test ---');
  
  // Coordinates for Mumbai, Maharashtra
  const mumbaiLat = 19.0760;
  const mumbaiLng = 72.8777;
  
  console.log(`1. Testing getGeoAddress helper with coordinates (${mumbaiLat}, ${mumbaiLng})...`);
  const address = await getGeoAddress(mumbaiLat, mumbaiLng);
  console.log('Result address:', address);
  
  if (!address || !address.startsWith('MH/')) {
    console.error('❌ Failed: Expected a valid address starting with MH/');
    process.exit(1);
  }
  console.log('✅ getGeoAddress helper works successfully!');
  
  console.log('2. Simulating stamp write in Firestore...');
  const testStampData = {
    userId: 'test-user-id',
    lat: mumbaiLat,
    lng: mumbaiLng,
    geoAddress: address,
    timestamp: new Date().toISOString(),
    avatar: 'test-avatar',
    reactions: {}
  };
  
  try {
    const docRef = await db.collection('stamps').add(testStampData);
    console.log('✅ Stamp document written successfully with ID:', docRef.id);
    
    // Verify document in Firestore
    const docSnap = await docRef.get();
    const fetchedData = docSnap.data();
    console.log('Fetched Document Data:', fetchedData);
    
    if (fetchedData.geoAddress === address) {
      console.log('✅ geoAddress successfully stored and verified in Firestore!');
    } else {
      console.error('❌ Failed: geoAddress in Firestore does not match expected address');
      process.exit(1);
    }
    
    // Clean up
    await docRef.delete();
    console.log('Cleaned up test document.');
  } catch (error) {
    console.error('❌ Firestore operations failed:', error);
    process.exit(1);
  }
  
  console.log('--- Integration Test Passed Successfully! ---');
  process.exit(0);
}

testIntegration();
