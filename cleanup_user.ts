
import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccount = require('C:/flutter_projects/jkssb_drivers_academy/functions/serviceAccountKey.json');

// Initialize with the service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'jkssbdriversacd'
});

const db = admin.firestore();
const auth = admin.auth();

const targetUID = 'fYpQaluWBocTE73CzvdfJ7DbzVt2';
const targetEmail = 'janmohdlone2@gmail.com';
const targetPhone = '+917006139763';

async function cleanup() {
  console.log(`Starting cleanup for UID: ${targetUID}`);

  // 1. Delete from Firebase Auth
  try {
    await auth.deleteUser(targetUID);
    console.log('Successfully deleted user from Firebase Auth');
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.log('User not found in Firebase Auth (already deleted?)');
    } else {
      console.error('Error deleting from Auth:', error.message);
    }
  }

  // 2. Delete from Firestore 'users' collection
  try {
    await db.collection('users').doc(targetUID).delete();
    console.log('Successfully deleted user document from Firestore users collection');
  } catch (error: any) {
    console.error('Error deleting Firestore user document:', error.message);
  }

  // 3. Delete from 'purchases', 'orders', 'leaderboard', 'quiz_results'
  const collections = ['purchases', 'orders', 'leaderboard', 'quiz_results'];
  for (const coll of collections) {
    try {
      const snap = await db.collection(coll).where('userId', '==', targetUID).get();
      if (snap.empty) {
        // Also check 'uid' field as some collections use 'uid' instead of 'userId'
        const snap2 = await db.collection(coll).where('uid', '==', targetUID).get();
        if (!snap2.empty) {
          console.log(`Found ${snap2.size} records in ${coll} (using 'uid')`);
          const batch = db.batch();
          snap2.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
      } else {
        console.log(`Found ${snap.size} records in ${coll} (using 'userId')`);
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (error: any) {
      console.error(`Error deleting from ${coll}:`, error.message);
    }
  }

  // 4. Special check for 'purchases' subcollection in 'users'
  // Actually we already deleted 'users' doc, so subcollections might be orphaned unless we delete them explicitly.
  // Note: Firestore doesn't delete subcollections automatically when you delete a parent doc.
  try {
    const subcollSnap = await db.collection('users').doc(targetUID).collection('courses').get();
    if (!subcollSnap.empty) {
      console.log(`Found ${subcollSnap.size} course sub-documents in users/${targetUID}/courses`);
      const batch = db.batch();
      subcollSnap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch (error: any) {
    console.error('Error deleting users subcollection:', error.message);
  }

  // 4. Double check for any other documents by email or phone
  try {
    const emailQuery = await db.collection('users').where('email', '==', targetEmail).get();
    if (!emailQuery.empty) {
      console.log(`Warning: Found ${emailQuery.size} other documents with email ${targetEmail}`);
      const batch = db.batch();
      emailQuery.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }

    const phoneQuery = await db.collection('users').where('phoneNumber', '==', targetPhone).get();
    if (!phoneQuery.empty) {
      console.log(`Warning: Found ${phoneQuery.size} other documents with phone ${targetPhone}`);
      const batch = db.batch();
      phoneQuery.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  } catch (error: any) {
    console.error('Error in secondary email/phone cleanup:', error.message);
  }

  console.log('Cleanup complete.');
}

cleanup();
