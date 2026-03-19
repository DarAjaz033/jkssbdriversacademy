import type { VercelRequest, VercelResponse } from '@vercel/node';

// Production Cashfree credentials from environment
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID!;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY!;
const CASHFREE_ENV = process.env.CASHFREE_ENV || 'production';
const CASHFREE_BASE_URL = CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';
const CASHFREE_API_VERSION = '2023-08-01';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://jkssbdriversacademy-darajaz033s-projects.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { courseId, courseName, amount, userId, userEmail, userName, userPhone } = req.body;

  if (!courseId || !amount || !userId) {
    return res.status(400).json({ error: 'Missing required fields: courseId, amount, userId' });
  }

  const orderId = `WEB_${userId.substring(0, 5)}_${Date.now()}`;

  // Log "PENDING" order to Firestore for tracking
  try {
    const { initializeApp, getApp, getApps } = await import('firebase/app');
    const { getFirestore, doc, setDoc, serverTimestamp } = await import('firebase/firestore');

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

    await setDoc(doc(db, 'orders', orderId), {
      orderId,
      userId,
      userEmail: userEmail || '',
      courseId,
      courseName: courseName || '',
      amount,
      status: 'PENDING',
      createdAt: serverTimestamp(),
      platform: 'web'
    });
  } catch (dbError: any) {
    console.warn('Failed to log pending order to Firestore:', dbError.message);
    // Continue anyway to show the payment modal
  }

  try {
    const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': CASHFREE_API_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: userId,
          customer_email: userEmail || 'user@jkssb.in',
          customer_name: userName || 'Student',
          customer_phone: userPhone || '9999999999'
        },
        order_meta: {
          return_url: `${BASE_URL}/payment-success.html?order_id=${orderId}&course_id=${courseId}`,
          notify_url: `${BASE_URL}/api/webhook/cashfree`
        },
        order_tags: {
          course_id: courseId,
          uid: userId
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create Cashfree order');
    }

    return res.status(200).json({
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status
    });
  } catch (error: any) {
    console.error('Cashfree create-order error:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to create Cashfree order'
    });
  }
}
