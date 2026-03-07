import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAxRsJwYHIV3rVqJgjGf_ZwqmMF3TGwooM",
    authDomain: "jkssbdriversacd.firebaseapp.com",
    projectId: "jkssbdriversacd",
    storageBucket: "jkssbdriversacd.firebasestorage.app",
    messagingSenderId: "723957920242",
    appId: "1:723957920242:web:825bc69a22161871107b6b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipe() {
    console.log("Fetching purchases...");
    try {
        const snap = await getDocs(collection(db, 'purchases'));
        let count = 0;
        for (const d of snap.docs) {
            await deleteDoc(doc(db, 'purchases', d.id));
            count++;
        }
        console.log(`✅ Deleted ${count} purchase records.`);
    } catch (e) {
        console.error("Error wiping purchases (permissions block?):", e.message);
    }

    console.log("Fetching enrollments...");
    try {
        const snap = await getDocs(collection(db, 'enrollments'));
        let count = 0;
        for (const d of snap.docs) {
            await deleteDoc(doc(db, 'enrollments', d.id));
            count++;
        }
        console.log(`✅ Deleted ${count} enrollment records.`);
    } catch (e) {
        console.error("Error wiping enrollments:", e.message);
    }

    process.exit(0);
}

wipe();
