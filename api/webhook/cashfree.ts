// @ts-nocheck
import crypto from 'crypto';

/**
 * Signature Verification according to Cashfree documentation
 */
function verifySignature(payload: string, signature: string, secretKey: string): boolean {
  if (!signature || !secretKey) return false;
  try {
    const computedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(payload)
      .digest('base64');
    return computedSignature === signature;
  } catch (e) {
    console.error('Signature verification error:', e);
    return false;
  }
}

// Define helper function to reply safely
function replyOk(res: any) {
  try {
    if (typeof res.status === 'function') {
      return res.status(200).json({ status: "ok" });
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ status: "ok" }));
    }
  } catch (e) {
    console.error('Failed to send OK response', e);
  }
}

// Helper to verify the actual order securely via Cashfree Orders API (2023-08-01)
async function verifyCashfreeOrder(orderId: string): Promise<any> {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const isSandbox = (process.env.CASHFREE_ENV || '').toLowerCase() === 'sandbox';
  const baseUrl = isSandbox ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
  const url = `${baseUrl}/orders/${orderId}`;

  console.log(`Verifying on ${isSandbox ? 'SANDBOX' : 'PRODUCTION'}...`);

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
  try {
    // 1. Signature Verification (Security Priority)
    // Cashfree production sends: x-cashfree-signature (timestamp+rawBody HMAC-SHA256 base64)
    const signature = req.headers['x-cashfree-signature'] || req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-cashfree-timestamp'] || req.headers['x-webhook-timestamp'] || '';
    const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;

    // For verification, we need the raw body
    let rawBody = '';
    if (typeof req.body === 'string') {
      rawBody = req.body;
    } else {
      rawBody = JSON.stringify(req.body);
    }

    // Cashfree production: HMAC of (timestamp + rawBody)
    const bodyToSign = timestamp ? timestamp + rawBody : rawBody;
    if (!verifySignature(bodyToSign, signature, webhookSecret)) {
      console.error('❌ Webhook Signature Verification Failed');
      // Return 200 to acknowledge receipt, but drop processing
      return replyOk(res);
    }
    console.log('✅ Webhook Signature Verified.');

    let payload = req.body;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch (e) { }
    }
    payload = payload || {};

    // 2. Filter Event Type
    if (payload?.type !== 'PAYMENT_SUCCESS_WEBHOOK') {
      return replyOk(res);
    }

    const data = payload?.data || {};
    const orderData = data?.order || {};
    const customerDetails = data?.customer_details || {};
    const orderId = orderData?.order_id || '';

    if (!orderId) return replyOk(res);

    console.log(`Processing Verified Success for Order: ${orderId}`);

    // 3. Robust Verification via API
    let verifiedOrder;
    try {
      verifiedOrder = await verifyCashfreeOrder(orderId);
    } catch (err: any) {
      console.error('API Verification Failed:', err.message);
      return replyOk(res);
    }

    if (verifiedOrder.order_status !== 'PAID') {
      console.log(`Order ${orderId} status is ${verifiedOrder.order_status}, skipping.`);
      return replyOk(res);
    }

    // 4. Data Extraction
    const userEmail = (customerDetails?.customer_email || verifiedOrder?.customer_details?.customer_email || '').toLowerCase();
    const userPhone = customerDetails?.customer_phone || verifiedOrder?.customer_details?.customer_phone || '';
    const normPhone = userPhone?.replace(/\D/g, '').replace(/^(91)/, '');
    const formId = data?.form?.form_id || verifiedOrder?.order_tags?.form_id || verifiedOrder?.order_tags?.code || '';

    if (!userEmail && !normPhone) {
      console.error('Cannot identify user (no email/phone)');
      return replyOk(res);
    }

    // 5. Atomic Transaction (Safety Priority)
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
      // a) Idempotency Check (Inside Transaction)
      const purchasesRef = collection(db, 'purchases');
      const qDup = query(purchasesRef, where('orderId', '==', orderId));
      const dupSnap = await getDocs(qDup);

      if (!dupSnap.empty) {
        console.log(`Idempotency: Order ${orderId} already processed.`);
        return;
      }

      // Extract identifiers from order_tags (set during create-order)
      const tagCourseId = verifiedOrder?.order_tags?.course_id || '';
      const tagUserId = verifiedOrder?.order_tags?.uid || '';

      // b) Find Course
      let matchedCourse: any = null;
      if (tagCourseId) {
        // Direct lookup by ID
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const courseRef = doc(db, 'courses', tagCourseId);
          const courseSnap = await getDoc(courseRef);
          if (courseSnap.exists()) {
            matchedCourse = { id: courseSnap.id, ...courseSnap.data() };
          }
        } catch (e: any) {
          console.error("Failed to load course via direct lookup:", e.message);
        }
      } 
      
      if (!matchedCourse && formId) {
        // Fallback to legacy paymentLink matching
        const coursesRef = collection(db, 'courses');
        const coursesSnap = await getDocs(coursesRef);
        coursesSnap.forEach((cDoc) => {
          const c = cDoc.data();
          if (c.paymentLink && (c.paymentLink.includes(formId))) {
            matchedCourse = { id: cDoc.id, ...c };
          }
        });
      }

      if (!matchedCourse) throw new Error(`Course not found for formId/tag: ${formId || tagCourseId}`);

      // c) Find User
      let userId: string | null = tagUserId;

      if (!userId) {
        const usersRef = collection(db, 'users');
        // Try email
        if (userEmail) {
          const qE = query(usersRef, where('email', '==', userEmail));
          const sE = await getDocs(qE);
          if (!sE.empty) userId = sE.docs[0].id;
        }

        // Try phone fallback
        if (!userId && normPhone) {
          const qP = query(usersRef, where('phone', '==', normPhone));
          const sP = await getDocs(qP);
          if (!sP.empty) userId = sP.docs[0].id;
        }
      }

      if (!userId) throw new Error(`User not found for ${userEmail || normPhone || tagUserId}`);

      // d) Commit Enrollment
      const enrolledAt = new Date();
      let expiresAt = null;
      // Handle validityDays correctness (must be a number)
      const vDays = Number(matchedCourse.validityDays);
      if (!isNaN(vDays) && vDays > 0) {
        expiresAt = new Date(enrolledAt.getTime() + (vDays * 24 * 60 * 60 * 1000));
      } else {
        // Default 1 year if not set or invalid
        expiresAt = new Date(enrolledAt.getTime() + (365 * 24 * 60 * 60 * 1000));
      }

      // Write to top-level `purchases`
      const pDoc = doc(collection(db, 'purchases'));
      transaction.set(pDoc, {
        userId,
        courseId: matchedCourse.id,
        orderId,
        amount: verifiedOrder.order_amount,
        status: 'completed',
        purchasedAt: serverTimestamp(),
        expiresAt: expiresAt || null
      });

      // Write to `enrolled/{courseId}/users/{uid}` collection
      const enrolledUserRef = doc(db, 'enrolled', matchedCourse.id, 'users', userId);
      transaction.set(enrolledUserRef, {
        userId,
        courseId: matchedCourse.id,
        orderId,
        enrolledAt: serverTimestamp(),
        expiresAt: expiresAt || null,
        status: 'active'
      }, { merge: true });

      // Write to `purchases/{uid}/courses/{courseId}` (for Flutter compatibility)
      const userPurchaseRef = doc(db, 'purchases', userId, 'courses', matchedCourse.id);
      transaction.set(userPurchaseRef, {
        courseId: matchedCourse.id,
        courseName: matchedCourse.title,
        purchasedAt: serverTimestamp(),
        expiresAt: expiresAt || null,
        orderId,
        status: 'active'
      }, { merge: true });

      console.log(`✅ Transaction committed: Course ${matchedCourse.id} unlocked for User ${userId}`);
    });

    return replyOk(res);
  } catch (err: any) {
    console.error('CRITICAL WEBHOOK ERROR:', err.message);
    return replyOk(res);
  }
};