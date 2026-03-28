import { functions, db } from './firebase-config';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Course } from './admin-service';

declare global {
  interface Window {
    Cashfree: any;
  }
}

/**
 * Creates a secure Cashfree order using the backend Cloud Function
 */
export const createSecureOrder = async (
  course: Course,
  phoneNumber?: string
): Promise<{ orderId?: string; paymentSessionId?: string; error?: string }> => {
  try {
    const createOrderFn = httpsCallable(functions, 'createOrder');
    const result = await createOrderFn({
      courseId: course.id,
      courseName: course.title,
      amount: course.price,
      phoneNumber: phoneNumber || ''
    });

    const data = result.data as any;
    return {
      orderId: data.orderId,
      paymentSessionId: data.paymentSessionId
    };
  } catch (error: any) {
    console.error('Failed to create secure order:', error);
    return { error: error.message || 'Failed to initiate payment' };
  }
};

/**
 * Verifies a payment status with the backend
 */
export const verifyPaymentStatus = async (orderId: string): Promise<{ success: boolean; status?: string; error?: string }> => {
  try {
    const verifyFn = httpsCallable(functions, 'verifyPayment');
    const result = await verifyFn({ orderId });
    const data = result.data as any;

    return {
      success: data.success === true,
      status: data.status
    };
  } catch (error: any) {
    console.error('Payment verification failed:', error);
    return { success: false, error: error.message || 'Verification failed' };
  }
};

/**
 * Launches the Cashfree Checkout UI
 */
export const launchCheckout = async (paymentSessionId: string): Promise<any> => {
  if (typeof window.Cashfree === 'undefined') {
    // Dynamically load the Cashfree SDK if not present
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
      document.head.appendChild(script);
    });
  }

  const cashfree = await window.Cashfree({ mode: 'production' });
  return cashfree.checkout({
    paymentSessionId,
    redirectTarget: '_modal' // Open as a popup in the same tab
  });
};

/**
 * Automatically generates a digital receipt in Firestore
 * This adds a "Premium" touch to the website compared to the app's manual enrollment.
 */
export const generatePurchaseReceipt = async (userId: string, course: Course, orderId: string) => {
  try {
    const receiptId = `REC_${orderId.replace('order_', '')}`;
    const receiptRef = doc(db, 'users', userId, 'receipts', receiptId);

    await setDoc(receiptRef, {
      receiptId,
      orderId,
      courseId: course.id,
      courseName: course.title,
      amount: course.price,
      currency: 'INR',
      status: 'PAID',
      purchasedAt: serverTimestamp(),
      platform: 'website',
      version: '1.0'
    });

    return receiptId;
  } catch (error) {
    console.error('Failed to generate receipt:', error);
    return null;
  }
};
