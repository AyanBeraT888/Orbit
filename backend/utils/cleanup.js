const cron = require('node-cron');
const { db } = require('../config/firebase');

const initCleanupJobs = () => {
  // Every 5 minutes: check ghost pins older than 2 hours, convert to district only
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running ghost pin to district cleanup...');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const snapshot = await db.collection('locations')
      .where('isSharing', '==', false)
      .where('stoppedAt', '<=', twoHoursAgo)
      .where('mode', '==', 'exact')
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { mode: 'district' });
    });
    await batch.commit();
  });

  // Every 1 minute: check district pins older than 5 minutes (post ghost period), delete fully
  // Total time since stop: 2h + 5m
  cron.schedule('* * * * *', async () => {
    console.log('Running district pin deletion cleanup...');
    const twoHoursFiveMinsAgo = new Date(Date.now() - (2 * 60 + 5) * 60 * 1000).toISOString();

    const snapshot = await db.collection('locations')
      .where('isSharing', '==', false)
      .where('stoppedAt', '<=', twoHoursFiveMinsAgo)
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

  // Every 15 minutes: delete all location data older than 24 hours
  cron.schedule('*/15 * * * *', async () => {
    console.log('Running 24h location data cleanup...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const snapshot = await db.collection('locations')
      .where('updatedAt', '<=', twentyFourHoursAgo)
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

  // Every hour: cancel friend requests older than 7 days
  cron.schedule('0 * * * *', async () => {
    console.log('Running friend request expiry cleanup...');
    const now = new Date().toISOString();

    const snapshot = await db.collection('friendRequests')
      .where('expiresAt', '<=', now)
      .get();

    const batch = db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  });

  // Every day: clean up (Dummy for Agora tokens if stored)
  cron.schedule('0 0 * * *', async () => {
    console.log('Daily maintenance job running...');
    // Add any daily cleanup logic here
  });
};

module.exports = initCleanupJobs;
