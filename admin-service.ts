import { db, storage } from './firebase-config';
import {
  collection,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { PDFDocument, rgb, degrees } from 'pdf-lib';

const COURSES_CACHE_KEY = 'jkssb_courses_cache';
const PDFS_CACHE_KEY = 'jkssb_pdfs_cache';
const CACHE_TIME = 10 * 60 * 1000;

export const clearAdminCache = () => {
  localStorage.removeItem(COURSES_CACHE_KEY);
  localStorage.removeItem(PDFS_CACHE_KEY);
};

export interface Course {
  id?: string;
  title: string;
  description: string;
  syllabus?: string;
  price: number;
  oldPrice?: number;
  duration: string;
  category?: string;
  descriptionHeading?: string;
  paymentLink?: string;
  validityDays?: number;
  rank?: number;
  thumbnailUrl?: string; // Legacy/unused
  thumbCssClass?: string;
  thumbBadge?: string;
  thumbBadgeStyle?: string;
  thumbTopLabel?: string;
  thumbMainHeading?: string;
  thumbSubHeading?: string;
  thumbPartTags?: string;
  thumbBottomCaption?: string;
  pdfIds: string[];
  practiceTestIds: string[];
  createdAt: any;
  updatedAt: any;
}

export interface PDF {
  id?: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: any;
  courseId?: string;
  partId?: string; // e.g. 'part1', 'part2', 'part3'
}

export interface PracticeTest {
  id?: string;
  title: string;
  description: string;
  questions: Question[];
  duration: number;
  courseId: string;
  partId?: string; // e.g. 'part1', 'part2', 'part3'
  category?: string; // e.g. 'Practice', 'Chapter', 'Mock'
  createdAt: any;
}

export interface Video {
  id?: string;
  title: string;
  url: string;
  courseId: string;
  partId?: string; // e.g. 'part1', 'part2', 'part3'
  createdAt?: any;
}

export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface Purchase {
  id?: string;
  userId: string;
  courseId: string;
  amount: number;
  paymentId: string;
  status: string;
  purchasedAt: any;
}

// User roles from Firebase users collection
const USERS_COLLECTION = 'users';

export interface AppUser {
  id?: string;
  email: string;
  role: 'admin' | 'user';
  uid?: string;
}

export const isAdmin = async (user: { uid: string; email: string | null } | null): Promise<boolean> => {
  if (!user) return false;

  // Permanent Official Admin Override
  if (user.email === 'jkssbdriversacademy@gmail.com' || user.email === 'darajaz033@gmail.com') {
    return true;
  }

  try {
    // First try lookup by uid (doc id = uid) - required for Firestore rules
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
    if (userDoc.exists()) {
      return (userDoc.data() as AppUser).role === 'admin';
    }
    // Fallback: query by email (for users added before uid-based structure)
    if (user.email) {
      const q = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', user.email)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return (snapshot.docs[0].data() as AppUser).role === 'admin';
      }
    }
    return false;
  } catch {
    return false;
  }
};

export const isAdminByEmail = async (email: string | null): Promise<boolean> => {
  if (!email) return false;
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', email)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty && (snapshot.docs[0].data() as AppUser).role === 'admin';
  } catch {
    return false;
  }
};

/** Set user role by uid (doc id = uid). Creates or updates users/{uid}. */
export const setUserRole = async (userId: string, email: string, role: 'admin' | 'user') => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await setDoc(userRef, { email, role, uid: userId, updatedAt: serverTimestamp() }, { merge: true });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/** Add user by email (for pre-login check). Use when uid is not yet known. */
export const addUserByEmail = async (email: string, role: 'admin' | 'user') => {
  try {
    const q = query(collection(db, USERS_COLLECTION), where('email', '==', email));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      await updateDoc(snapshot.docs[0].ref, { role, updatedAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, USERS_COLLECTION), { email, role, createdAt: serverTimestamp() });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Course Management
export const createCourse = async (course: Omit<Course, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const existing = await getDocs(collection(db, 'courses'));
    const maxRank = existing.docs.reduce((max, d) => {
      const r = (d.data() as Course).rank;
      return typeof r === 'number' && r > max ? r : max;
    }, 0);
    const docRef = await addDoc(collection(db, 'courses'), {
      ...course,
      rank: course.rank ?? maxRank + 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    clearAdminCache();
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateCourseRank = async (courseId: string, rank: number) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, { rank, updatedAt: serverTimestamp() });
    clearAdminCache();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updateCourse = async (courseId: string, updates: Partial<Course>) => {
  try {
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    clearAdminCache();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deleteCourse = async (courseId: string) => {
  try {
    await deleteDoc(doc(db, 'courses', courseId));
    clearAdminCache();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

const refreshCoursesCache = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'courses'));
    const courses: Course[] = [];
    querySnapshot.forEach((doc) => {
      courses.push({ id: doc.id, ...doc.data() } as Course);
    });
    courses.sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
    localStorage.setItem(COURSES_CACHE_KEY, JSON.stringify({ data: courses, timestamp: Date.now() }));
    return { success: true, courses };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getCourses = async () => {
  try {
    const cached = localStorage.getItem(COURSES_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TIME) {
        setTimeout(refreshCoursesCache, 0); // Background refresh
        return { success: true, courses: data as Course[] };
      }
    }
    return await refreshCoursesCache();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getCourse = async (courseId: string) => {
  try {
    const docSnap = await getDoc(doc(db, 'courses', courseId));
    if (docSnap.exists()) {
      return { success: true, course: { id: docSnap.id, ...docSnap.data() } as Course };
    } else {
      return { success: false, error: 'Course not found' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// PDF Management
const addWatermarkToPDF = async (file: File): Promise<File> => {
  if (file.type !== 'application/pdf') return file;
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      // Calculate text width approximately and center it
      page.drawText('JKSSB Drivers Academy', {
        x: width / 2 - 200,
        y: height / 2 - 50,
        size: 40,
        color: rgb(0.5, 0.5, 0.5),
        opacity: 0.3,
        rotate: degrees(45),
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new File([pdfBytes as any], file.name, { type: 'application/pdf' });
  } catch (error) {
    console.error('Failed to add watermark', error);
    return file;
  }
};

export const uploadPDF = async (originalFile: File) => {
  try {
    const file = await addWatermarkToPDF(originalFile);
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `pdfs/${fileName}`);

    // Use resumable upload for consistency
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file);
      task.on('state_changed', null, reject, () => resolve());
    });
    const url = await getDownloadURL(storageRef);

    const pdfDoc = await addDoc(collection(db, 'pdfs'), {
      name: file.name,
      url,
      size: file.size,
      uploadedAt: serverTimestamp()
    });

    clearAdminCache();
    return { success: true, id: pdfDoc.id, url };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

const refreshPDFsCache = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'pdfs'));
    const pdfs: PDF[] = [];
    querySnapshot.forEach((doc) => {
      pdfs.push({ id: doc.id, ...doc.data() } as PDF);
    });
    localStorage.setItem(PDFS_CACHE_KEY, JSON.stringify({ data: pdfs, timestamp: Date.now() }));
    return { success: true, pdfs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getPDFs = async () => {
  try {
    const cached = localStorage.getItem(PDFS_CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TIME) {
        setTimeout(refreshPDFsCache, 0); // Background refresh
        return { success: true, pdfs: data as PDF[] };
      }
    }
    return await refreshPDFsCache();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deletePDF = async (pdfId: string, url: string) => {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
    await deleteDoc(doc(db, 'pdfs', pdfId));
    clearAdminCache();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/** Upload a PDF file and immediately link it to a course.
 *  onProgress is called with 0-100 as bytes transfer. */
export const uploadPDFToCourse = (
  originalFile: File,
  courseId: string,
  partId?: string,
  onProgress?: (percent: number) => void
): Promise<{ success: true; id: string; url: string } | { success: false; error: string }> => {
  return new Promise(async (resolve) => {
    const file = await addWatermarkToPDF(originalFile);
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = ref(storage, `pdfs/${fileName}`);
    const task = uploadBytesResumable(storageRef, file);

    task.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        onProgress?.(pct);
      },
      (error) => resolve({ success: false, error: error.message }),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          const pdfDoc = await addDoc(collection(db, 'pdfs'), {
            name: file.name,
            url,
            size: file.size,
            courseId,
            partId,
            uploadedAt: serverTimestamp()
          });

          // Link to course
          const courseRef = doc(db, 'courses', courseId);
          const courseSnap = await getDoc(courseRef);
          if (courseSnap.exists()) {
            const existing: string[] = (courseSnap.data() as Course).pdfIds ?? [];
            if (!existing.includes(pdfDoc.id)) {
              await updateDoc(courseRef, { pdfIds: [...existing, pdfDoc.id], updatedAt: serverTimestamp() });
            }
          }

          resolve({ success: true, id: pdfDoc.id, url });
        } catch (err: any) {
          resolve({ success: false, error: err.message });
        }
      }
    );
  });
};

/** Delete a PDF and remove it from its course's pdfIds list. */
export const deletePDFFromCourse = async (pdfId: string, url: string, courseId: string) => {
  try {
    try {
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (_) { /* Ignore storage errors — file may already be deleted */ }
    await deleteDoc(doc(db, 'pdfs', pdfId));

    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);
    if (courseSnap.exists()) {
      const existing: string[] = (courseSnap.data() as Course).pdfIds ?? [];
      await updateDoc(courseRef, {
        pdfIds: existing.filter(id => id !== pdfId),
        updatedAt: serverTimestamp()
      });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/** Get all practice tests linked to a specific course. */
export const getCourseQuizzes = async (courseId: string) => {
  try {
    const q = query(collection(db, 'practiceTests'), where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);
    const tests: PracticeTest[] = [];
    querySnapshot.forEach((doc) => {
      tests.push({ id: doc.id, ...doc.data() } as PracticeTest);
    });
    return { success: true, tests };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/** Get all videos linked to a specific course. */
export const getCourseVideos = async (courseId: string) => {
  try {
    const q = query(collection(db, 'courseVideos'), where('courseId', '==', courseId));
    const querySnapshot = await getDocs(q);
    const videos: Video[] = [];
    querySnapshot.forEach((doc) => {
      videos.push({ id: doc.id, ...doc.data() } as Video);
    });
    return { success: true, videos };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/** Create a new video and link it to a course. */
export const createVideo = async (video: Omit<Video, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'courseVideos'), {
      ...video,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/** Delete a video. */
export const deleteVideo = async (videoId: string) => {
  try {
    await deleteDoc(doc(db, 'courseVideos', videoId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Practice Test Management
export async function createPracticeTest(data: {
  title: string;
  description: string;
  questions: any[];
  duration: number;
  courseId: string;
  partId?: string;
  category?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = await addDoc(collection(db, 'practiceTests'), {
      ...data,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('Error creating practice test:', err);
    return { success: false, error: err.message };
  }
};

export const getPracticeTests = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'practiceTests'));
    const tests: PracticeTest[] = [];
    querySnapshot.forEach((doc) => {
      tests.push({ id: doc.id, ...doc.data() } as PracticeTest);
    });
    return { success: true, tests };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const deletePracticeTest = async (testId: string) => {
  try {
    await deleteDoc(doc(db, 'practiceTests', testId));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Purchase Management
export const createPurchase = async (purchase: Omit<Purchase, 'id' | 'purchasedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'purchases'), {
      ...purchase,
      purchasedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const fetchUserEnrollments = async (userId: string) => {
  try {
    const enrolledIds: string[] = [];
    const now = new Date();

    // 1. Direct subcollection check (App's preferred method)
    // purchases/{userId}/courses/{courseId}
    const subColRef = collection(db, 'purchases', userId, 'courses');
    const subColSnap = await getDocs(subColRef);
    subColSnap.forEach((doc) => {
      const data = doc.data();
      if (data.isPurchased === true) {
        // Expiration check
        let isValid = true;
        if (data.expiresAt) {
          const expiryDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
          if (now > expiryDate) isValid = false;
        }
        if (isValid) enrolledIds.push(doc.id);
      }
    });

    // 2. Legacy/Top-level check (Website's legacy method)
    const q = query(
      collection(db, 'purchases'),
      where('userId', '==', userId),
      where('status', '==', 'completed')
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.courseId && !enrolledIds.includes(data.courseId)) {
        let isValid = true;
        if (data.expiresAt) {
          const expiryDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
          if (now > expiryDate) isValid = false;
        }
        if (isValid) enrolledIds.push(data.courseId);
      }
    });

    // Use Set to ensure uniqueness
    return { success: true, enrolledIds: [...new Set(enrolledIds)] };
  } catch (error: any) {
    return { success: false, error: error.message, enrolledIds: [] };
  }
};

export const getUserPurchases = async (userId: string) => {
  try {
    const q = query(collection(db, 'purchases'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const purchases: Purchase[] = [];
    querySnapshot.forEach((doc) => {
      purchases.push({ id: doc.id, ...doc.data() } as Purchase);
    });
    return { success: true, purchases };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const getAllPurchases = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'purchases'));
    const purchases: Purchase[] = [];
    querySnapshot.forEach((doc) => {
      purchases.push({ id: doc.id, ...doc.data() } as Purchase);
    });
    return { success: true, purchases };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Check if user has purchased a course and it is currently active
export const hasUserPurchasedCourse = async (userId: string, courseId: string) => {
  try {
    const now = new Date();

    // 1. Check if user is Admin or Premium (Global access)
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.role === 'admin' || userData.isPremium === true || userData.isAdmin === true) {
        return { success: true, hasPurchased: true };
      }
    }

    // 2. Check subcollection (App's preferred method)
    const subDocRef = doc(db, 'purchases', userId, 'courses', courseId);
    const subDocSnap = await getDoc(subDocRef);
    if (subDocSnap.exists()) {
      const data = subDocSnap.data();
      if (data.isPurchased === true) {
        if (!data.expiresAt) return { success: true, hasPurchased: true };
        const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (now <= expiry) return { success: true, hasPurchased: true };
      }
    }

    // 3. Check Top-level Purchases (Legacy/Website method)
    const q = query(
      collection(db, 'purchases'),
      where('userId', '==', userId),
      where('courseId', '==', courseId),
      where('status', '==', 'completed')
    );
    const querySnapshot = await getDocs(q);

    let hasActive = false;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.expiresAt) {
        hasActive = true;
      } else {
        const expiryDate = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (now <= expiryDate) {
          hasActive = true;
        }
      }
    });

    return { success: true, hasPurchased: hasActive };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Get user's active enrolled courses with details
export const getUserCoursesWithDetails = async (userId: string) => {
  try {
    const enrollmentsResult = await fetchUserEnrollments(userId);
    if (!enrollmentsResult.success) {
      return enrollmentsResult;
    }

    const courseIds = enrollmentsResult.enrolledIds || [];

    const courses: Course[] = [];
    for (const courseId of courseIds) {
      const courseResult = await getCourse(courseId);
      if (courseResult.success && courseResult.course) {
        courses.push(courseResult.course);
      }
    }

    return { success: true, courses };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
