const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function run() {
    try {
        console.log("Listing courses directly via Firebase Admin...");
        const app = initializeApp({
            projectId: "jkssbdriversacd"
        });
        const db = getFirestore(app);
        const snapshot = await db.collection('courses').get();
        console.log(`Found ${snapshot.size} courses.`);
        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id}`);
            console.log(`Payment Link: ${data.paymentLink}`);
            console.log('---');
        });
        process.exit(0);
    } catch (err) {
        console.error("CRITICAL ERROR:", err.message);
        process.exit(1);
    }
}

run();
