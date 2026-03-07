const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = "jkssbdriversacd";

async function run() {
    try {
        // Use default credentials if available, or try without
        initializeApp({ projectId });
        const db = getFirestore();
        const snapshot = await db.collection('courses').limit(5).get();

        if (snapshot.empty) {
            console.log("No courses found.");
            return;
        }

        snapshot.forEach(doc => {
            console.log(`ID: ${doc.id}`);
            console.log(`Title: ${doc.data().title}`);
            console.log(`Payment Link: ${doc.data().paymentLink}`);
            console.log('---');
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}

run();
