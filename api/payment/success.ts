// @ts-nocheck

// Define helper function to reply safely safely with redirects
function redirectSafe(res: any, url: string) {
    try {
        if (typeof res.redirect === 'function') {
            return res.redirect(url);
        } else {
            res.writeHead(302, { Location: url });
            return res.end();
        }
    } catch (e) {
        console.error('Failed to redirect', e);
    }
}

// Helper to verify the actual order securely via Cashfree Orders API (2023-08-01)
async function verifyCashfreeOrder(orderId: string): Promise<any> {
    const appId = process.env.CASHFREE_APP_ID;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const isSandbox = (process.env.CASHFREE_ENV || '').toLowerCase() === 'sandbox';
    const baseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
    const url = `${baseUrl}/orders/${orderId}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'accept': 'application/json',
            'x-api-version': '2023-08-01',
            'x-client-id': appId || '',
            'x-client-secret': secretKey || ''
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to verify Cashfree order ${orderId}: ${response.statusText}`);
    }

    return response.json();
}

module.exports = async function handler(req: any, res: any) {
    // Client browser returns here after payment
    try {
        const queryParams = req.query || {};
        const order_id = queryParams.order_id || '';

        if (!order_id) {
            console.log('No order_id found in URL query.');
            return redirectSafe(res, '/');
        }

        console.log(`Verifying Order for Return Handler: ${order_id}`);
        const verifiedOrder = await verifyCashfreeOrder(order_id);

        if (verifiedOrder.order_status !== 'PAID') {
            console.log(`Order ${order_id} is not PAID. Status: ${verifiedOrder.order_status}`);
            return redirectSafe(res, '/payment-success.html?status=pending');
        }

        console.log('✅ Cashfree API verified order as PAID on Return Handler.');

        const userEmail = (verifiedOrder.customer_details?.customer_email || '').toLowerCase();
        const userPhone = verifiedOrder.customer_details?.customer_phone || '';
        const normPhone = userPhone?.replace(/\D/g, '').replace(/^(91)/, '');
        const formId = verifiedOrder.order_tags?.form_id || verifiedOrder.order_tags?.code || '';

        // Atomic Transaction (Identical to Webhook)
        const { initializeApp, getApp, getApps } = await import('firebase/app');
        const { getFirestore, collection, query, where, getDocs, doc, runTransaction, serverTimestamp } = await import('firebase/firestore');

        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID
        };

        const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        const db = getFirestore(fbApp);

        await runTransaction(db, async (transaction) => {
            // a) Idempotency Check
            const purchasesRef = collection(db, 'purchases');
            const qDup = query(purchasesRef, where('orderId', '==', order_id));
            const dupSnap = await getDocs(qDup);

            if (!dupSnap.empty) {
                console.log(`Idempotency (Return): Order ${order_id} already processed.`);
                return;
            }

            // b) Find Course
            const coursesRef = collection(db, 'courses');
            const coursesSnap = await getDocs(coursesRef);
            let matchedCourse: any = null;

            coursesSnap.forEach((cDoc) => {
                const c = cDoc.data();
                if (c.paymentLink && formId && (c.paymentLink.includes(formId))) {
                    matchedCourse = { id: cDoc.id, ...c };
                }
            });

            if (!matchedCourse) throw new Error(`Course not found for formId: ${formId}`);

            // c) Find User
            const usersRef = collection(db, 'users');
            let userId: string | null = null;

            if (userEmail) {
                const qE = query(usersRef, where('email', '==', userEmail));
                const sE = await getDocs(qE);
                if (!sE.empty) userId = sE.docs[0].id;
            }

            if (!userId && normPhone) {
                const qP = query(usersRef, where('phone', '==', normPhone));
                const sP = await getDocs(qP);
                if (!sP.empty) userId = sP.docs[0].id;
            }

            if (!userId) throw new Error(`User not found for ${userEmail || normPhone}`);

            // d) Commit Enrollment
            const enrolledAt = new Date();
            let expiresAt = null;
            if (matchedCourse.validityDays) {
                expiresAt = new Date(enrolledAt.getTime() + (matchedCourse.validityDays * 24 * 60 * 60 * 1000));
            }

            const pDoc = doc(collection(db, 'purchases'));
            transaction.set(pDoc, {
                userId,
                courseId: matchedCourse.id,
                orderId: order_id,
                amount: verifiedOrder.order_amount,
                status: 'completed',
                purchasedAt: serverTimestamp(),
                expiresAt: expiresAt || null
            });

            console.log(`✅ Success Handler: Course ${matchedCourse.id} unlocked for User ${userId}`);
        });

        return redirectSafe(res, '/payment-success.html');
    } catch (error) {
        console.error('Error in Return URL handler:', error.message);
        return redirectSafe(res, '/payment-success.html?retry=true');
    }
}
