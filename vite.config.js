import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
        'profile': 'profile.html',
        'course-details': 'course-details.html',
        'my-courses': 'my-courses.html',
        'mock-tests': 'mock-tests.html',
        'practice-test': 'practice-test.html',
        'demo-pdfs': 'demo-pdfs.html',
        'gk-pdfs': 'gk-pdfs.html',
        'jkssb-updates': 'jkssb-updates.html',
        'contact': 'contact.html',
        'feedback': 'feedback.html',
        'full-course': 'full-course.html',
        'part-1': 'part-1.html',
        'part-2': 'part-2.html',
        'part-3': 'part-3.html',
        'privacy-policy': 'privacy-policy.html',
        'terms-and-conditions': 'terms-and-conditions.html',
        'refund-policy': 'refund-policy.html',
        'copyright-warning': 'copyright-warning.html',
        'admin-login': 'admin-login.html',
        'login': 'login.html',
        'pdf-viewer': 'pdf-viewer.html',
        'admin-dashboard': 'admin-dashboard.html',
        'admin-courses': 'admin-courses.html',
        'admin-pdfs': 'admin-pdfs.html',
        'admin-tests': 'admin-tests.html',
        'admin-users': 'admin-users.html',
        'admin-videos': 'admin-videos.html',
        'admin-purchases': 'admin-purchases.html',
        'delete-account': 'delete-account.html',
        'cookie-policy': 'cookie-policy.html',
        'more': 'more.html',
        'leaderboard': 'leaderboard.html',
        'ajazhero': 'ajazhero.html',
        'payment-success': 'payment-success.html'
      }
    }
  }
});
