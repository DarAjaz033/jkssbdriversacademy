import { onAuthChange } from './auth-service';
import {
  isAdmin,
  getCourses,
  Course,
  adminGrantAccess,
  adminEnrollUserByUid,
  adminExtendExpiry,
  adminRevokeAccess,
  adminDeleteUserAccount,
  sendNotificationToUser,
  getUserAccessDetails,
  searchUsers,
  getUsersEnrolledInCourse,
  getPendingGrants,
  cancelPendingGrant,
  getUserProfile,
  getActiveAdminGrants,
} from './admin-service';

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────

function showToast(msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', ms = 3200) {
  const root = document.getElementById('toast-root')!;
  const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  const t = document.createElement('div');
  Object.assign(t.style, {
    padding: '12px 20px', borderRadius: '8px', background: colors[type], color: '#fff',
    fontWeight: '500', fontSize: '14px', boxShadow: '0 4px 12px rgba(0,0,0,.15)',
    opacity: '0', transform: 'translateY(12px)', transition: 'all .25s', pointerEvents: 'none',
  });
  t.textContent = msg;
  root.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateY(0)'; });
  setTimeout(() => {
    t.style.opacity = '0'; t.style.transform = 'translateY(-8px)';
    setTimeout(() => t.remove(), 300);
  }, ms);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(ts: any): string {
  if (!ts) return 'N/A';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpired(ts: any): boolean {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d < new Date();
}

function isExpiringSoon(ts: any): boolean {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  const diff = d.getTime() - Date.now();
  return diff > 0 && diff < 7 * 86400000;
}

function badgeHtml(ts: any, adminGranted = false): string {
  if (adminGranted) return `<span class="badge badge-admin">👑 Admin</span>`;
  if (!ts) return '';
  if (isExpired(ts)) return `<span class="badge badge-expired">Expired</span>`;
  if (isExpiringSoon(ts)) return `<span class="badge badge-soon">Expiring Soon</span>`;
  return `<span class="badge badge-active">Active</span>`;
}

function defaultExpiryValue(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

let allCourses: Course[] = [];
let currentFilter = 'All Users';
let detailUid = '';
let detailName = '';
let detailEmail = '';
let extendTargetUid = '';
let extendTargetCourseId = '';

// ─────────────────────────────────────────────────────────────────────────────
// Tab switching
// ─────────────────────────────────────────────────────────────────────────────

document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab')!;
    document.getElementById('tab-' + tabId)!.classList.add('active');
    if (tabId === 'admin-given') loadAdminGiven();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

onAuthChange(async (user) => {
  if (!user) { window.location.href = './admin-login.html'; return; }
  const adminCheck = await isAdmin(user);
  if (!adminCheck) { window.location.href = './admin-login.html'; return; }

  const coursesResult = await getCourses();
  if (coursesResult.success && coursesResult.courses) {
    allCourses = coursesResult.courses;
    populateCourseDropdown();
    await loadByCourse();
  }
  setupGrantModal();
  setupSearchTab();
  setupExtendModal();
  setupNotifyModal();
  (window as any).lucide?.createIcons();
}, true);

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: By Course
// ─────────────────────────────────────────────────────────────────────────────

async function loadByCourse() {
  const container = document.getElementById('courses-accordion-container')!;
  container.innerHTML = '<div class="spinner"></div>';

  const html = await Promise.all(allCourses.map(async (course) => {
    const enrollResult = await getUsersEnrolledInCourse(course.id!);
    const users = enrollResult.results ?? [];
    const thumbHtml = course.thumbnailUrl
      ? `<img class="accordion-header-thumb" src="${course.thumbnailUrl}" alt="">`
      : `<div class="accordion-header-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.4rem;background:#F1F5F9;">${course.emoji || '📚'}</div>`;

    const userRows = users.length === 0
      ? `<div class="empty-state" style="padding:1.5rem;"><p>No active enrollments</p></div>`
      : users.map((u: any) => {
          const name = u.name || u.displayName || u.uid;
          return `<div class="user-row" data-uid="${u.uid}" data-name="${name}">
            <div class="user-avatar" style="width:34px;height:34px;font-size:.85rem;">${(name[0] || 'U').toUpperCase()}</div>
            <div class="user-info">
              <div class="user-name" style="font-size:.88rem;">${name}</div>
              <div class="user-meta">Expires: ${formatDate(u.expiresAt)}</div>
            </div>
            ${badgeHtml(u.expiresAt, u.adminGranted)}
            <button class="btn-danger accordion-revoke-btn" data-uid="${u.uid}" data-course="${course.id}" data-name="${name}" style="flex-shrink:0;">Revoke</button>
          </div>`;
        }).join('');

    return `<div class="course-accordion">
      <div class="accordion-header" data-acc="${course.id}">
        ${thumbHtml}
        <div style="flex:1;">
          <div style="font-weight:700;color:#1E293B;">${course.title}</div>
          <div style="font-size:.8rem;color:#64748B;">${users.length} active enrollment${users.length !== 1 ? 's' : ''}</div>
        </div>
        <i data-lucide="chevron-down" width="18" height="18" style="color:#94A3B8;" class="acc-chevron"></i>
      </div>
      <div class="accordion-body" id="acc-body-${course.id}">${userRows}</div>
    </div>`;
  }));

  container.innerHTML = html.join('');

  // Accordion toggle
  container.querySelectorAll<HTMLElement>('.accordion-header').forEach(hdr => {
    hdr.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      const id = hdr.getAttribute('data-acc')!;
      const body = document.getElementById('acc-body-' + id)!;
      body.classList.toggle('open');
      const chevron = hdr.querySelector('.acc-chevron') as HTMLElement;
      if (chevron) chevron.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
    });
  });

  // User row → open detail
  container.querySelectorAll<HTMLElement>('.user-row').forEach(row => {
    row.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      const uid = row.getAttribute('data-uid')!;
      const name = row.getAttribute('data-name') || uid;
      await openUserDetail(uid, name, '');
    });
  });

  // Revoke buttons
  container.querySelectorAll<HTMLButtonElement>('.accordion-revoke-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Revoke access for ${btn.dataset.name}?`)) return;
      btn.disabled = true; btn.textContent = '…';
      const r = await adminRevokeAccess(btn.dataset.uid!, btn.dataset.course!);
      if (r.success) { showToast('Access revoked.', 'success'); await loadByCourse(); }
      else { showToast('Error: ' + r.error, 'error'); btn.disabled = false; btn.textContent = 'Revoke'; }
    });
  });

  (window as any).lucide?.createIcons();
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: Admin Given
// ─────────────────────────────────────────────────────────────────────────────

async function loadAdminGiven() {
  await Promise.all([loadPendingGrants(), loadActiveAdminGrants()]);
}

async function loadPendingGrants() {
  const container = document.getElementById('pending-grants-container')!;
  container.innerHTML = '<div class="spinner"></div>';
  const r = await getPendingGrants();
  const grants = (r.grants ?? []) as any[];
  document.getElementById('pending-count')!.textContent = `(${grants.length})`;

  if (grants.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No pending grants</p></div>';
    return;
  }
  container.innerHTML = grants.map(g => {
    const id = g.phone || g.email || '';
    const courseName = g.courseName || g.courseId || '';
    const expiry = formatDate(g.expiryDate);
    return `<div class="user-row">
      <div class="user-avatar" style="background:#3B82F6;">${id[0]?.toUpperCase() || 'P'}</div>
      <div class="user-info">
        <div class="user-name">${id}</div>
        <div class="user-meta">📚 ${courseName} &nbsp;|&nbsp; Expires: ${expiry}</div>
      </div>
      <span class="badge badge-pending">Pending Signup</span>
      <button class="btn-danger pending-cancel-btn" data-id="${g.id}" style="flex-shrink:0;margin-left:.5rem;">Cancel</button>
    </div>`;
  }).join('');

  container.querySelectorAll<HTMLButtonElement>('.pending-cancel-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Cancel this pending grant?')) return;
      btn.disabled = true;
      const r = await cancelPendingGrant(btn.dataset.id!);
      if (r.success) { showToast('Grant cancelled.', 'success'); await loadPendingGrants(); }
      else showToast('Error: ' + r.error, 'error');
    });
  });
  (window as any).lucide?.createIcons();
}

async function loadActiveAdminGrants() {
  const container = document.getElementById('active-grants-container')!;
  container.innerHTML = '<div class="spinner"></div>';
  const r = await getActiveAdminGrants();
  const results = (r.results ?? []) as any[];
  document.getElementById('active-grants-count')!.textContent = `(${results.length})`;

  if (results.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No active admin grants found</p></div>';
    return;
  }

  const withNames = await Promise.all(results.map(async (item) => {
    const profile = await getUserProfile(item.uid);
    const user = (profile as any).user || {};
    return { ...item, userName: user.name || user.displayName || item.uid, userPhone: user.phoneNumber || '' };
  }));

  container.innerHTML = withNames.map(item => {
    const courseName = allCourses.find(c => c.id === item.courseId)?.title || item.courseId;
    return `<div class="user-row" data-uid="${item.uid}" style="cursor:pointer;">
      <div class="user-avatar" style="background:#7C3AED;">${(item.userName[0] || 'A').toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">${item.userName} <span class="badge badge-admin" style="margin-left:.35rem;">👑</span></div>
        <div class="user-meta">📚 ${courseName} &nbsp;|&nbsp; Expires: ${formatDate(item.expiresAt)}</div>
      </div>
      <button class="btn-danger admin-revoke-btn" data-uid="${item.uid}" data-course="${item.courseId}" style="flex-shrink:0;">Revoke</button>
    </div>`;
  }).join('');

  container.querySelectorAll<HTMLElement>('.user-row').forEach(row => {
    row.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      const uid = row.dataset.uid!;
      const name = row.querySelector('.user-name')?.textContent?.split('👑')[0].trim() || uid;
      await openUserDetail(uid, name, '');
    });
  });

  container.querySelectorAll<HTMLButtonElement>('.admin-revoke-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Revoke admin granted access?')) return;
      btn.disabled = true;
      const r = await adminRevokeAccess(btn.dataset.uid!, btn.dataset.course!);
      if (r.success) { showToast('Revoked.', 'success'); await loadActiveAdminGrants(); }
      else showToast('Error: ' + r.error, 'error');
    });
  });

  document.getElementById('refresh-pending-btn')?.addEventListener('click', loadAdminGiven);
  (window as any).lucide?.createIcons();
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: Search Users
// ─────────────────────────────────────────────────────────────────────────────

function setupSearchTab() {
  const input = document.getElementById('user-search-input') as HTMLInputElement;
  const btn = document.getElementById('user-search-btn')!;
  btn.addEventListener('click', () => doSearch(input.value.trim()));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(input.value.trim()); });

  document.querySelectorAll<HTMLElement>('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.filter!;
      if (input.value.trim()) doSearch(input.value.trim());
    });
  });
}

async function doSearch(q: string) {
  if (!q && currentFilter === 'All Users') return;
  const container = document.getElementById('search-results-container')!;
  container.innerHTML = '<div class="spinner"></div>';

  const r = await searchUsers(q || '');
  let users = (r.users ?? []) as any[];

  if (users.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No users found</p></div>';
    return;
  }

  container.innerHTML = users.map(u => {
    const name = u.name || u.displayName || 'Unknown';
    const phone = u.phoneNumber || '—';
    const email = u.email || '—';
    return `<div class="user-row" data-uid="${u.uid}" data-name="${name}" data-email="${email}" style="cursor:pointer;">
      <div class="user-avatar">${(name[0] || 'U').toUpperCase()}</div>
      <div class="user-info">
        <div class="user-name">${name}</div>
        <div class="user-meta">📱 ${phone} &nbsp; ✉️ ${email}</div>
      </div>
      <i data-lucide="chevron-right" width="18" height="18" style="color:#CBD5E1;"></i>
    </div>`;
  }).join('');

  container.querySelectorAll<HTMLElement>('.user-row').forEach(row => {
    row.addEventListener('click', async () => {
      const uid = row.dataset.uid!;
      const name = row.dataset.name || uid;
      const email = row.dataset.email || '';
      await openUserDetail(uid, name, email);
    });
  });
  (window as any).lucide?.createIcons();
}

// ─────────────────────────────────────────────────────────────────────────────
// User Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

async function openUserDetail(uid: string, name: string, email: string) {
  detailUid = uid;
  detailName = name;
  detailEmail = email;

  document.getElementById('detail-name')!.textContent = name;
  document.getElementById('detail-uid')!.textContent = uid;
  document.getElementById('detail-meta')!.textContent = email;
  document.getElementById('detail-avatar')!.textContent = (name[0] || 'U').toUpperCase();
  document.getElementById('detail-courses-container')!.innerHTML = '<div class="spinner"></div>';

  const modal = document.getElementById('user-detail-modal')!;
  modal.style.display = 'flex';

  // If email not passed, fetch from Firestore
  if (!email) {
    const p = await getUserProfile(uid);
    const user = (p as any).user || {};
    detailEmail = user.email || '';
    document.getElementById('detail-meta')!.textContent = [user.phoneNumber, user.email].filter(Boolean).join('  |  ');
  }

  await loadDetailCourses();
  (window as any).lucide?.createIcons();
}

async function loadDetailCourses() {
  const container = document.getElementById('detail-courses-container')!;
  container.innerHTML = '<div class="spinner"></div>';

  const r = await getUserAccessDetails(detailUid);
  const courses = ((r.courses ?? []) as any[]).filter(c => c.isPurchased);

  if (courses.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:1.5rem;"><p>No active course access</p></div>';
    return;
  }

  container.innerHTML = courses.map(c => {
    const courseName = allCourses.find(x => x.id === (c.courseId ?? c.id))?.title ?? c.courseName ?? c.id;
    const exp = isExpired(c.expiresAt);
    const expBorderColor = exp ? '#FECACA' : '#BBF7D0';
    return `<div class="course-item" style="border-color:${expBorderColor};">
      <div class="course-item-info">
        <div class="course-item-name">${courseName}</div>
        <div class="course-item-expiry">${exp ? '⚠️ Expired' : '✅ Expires'} ${formatDate(c.expiresAt)}
          ${c.adminGranted || c.addedBy === 'admin' ? ' &nbsp; <span class="badge badge-admin" style="font-size:.7rem;">👑 Admin granted</span>' : ''}
        </div>
      </div>
      <div class="course-item-actions">
        <button class="btn-icon-sm detail-extend-btn" data-uid="${detailUid}" data-course="${c.courseId ?? c.id}" data-name="${courseName}">+Days</button>
        <button class="btn-danger detail-revoke-btn" data-uid="${detailUid}" data-course="${c.courseId ?? c.id}" data-name="${courseName}" style="font-size:.75rem;padding:.3rem .6rem;">Revoke</button>
      </div>
    </div>`;
  }).join('');

  container.querySelectorAll<HTMLButtonElement>('.detail-extend-btn').forEach(btn => {
    btn.addEventListener('click', () => openExtendModal(btn.dataset.uid!, btn.dataset.course!, btn.dataset.name!));
  });

  container.querySelectorAll<HTMLButtonElement>('.detail-revoke-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm(`Revoke access to "${btn.dataset.name}"?`)) return;
      btn.disabled = true;
      const r = await adminRevokeAccess(btn.dataset.uid!, btn.dataset.course!);
      if (r.success) { showToast('Access revoked.', 'success'); await loadDetailCourses(); }
      else { showToast('Error: ' + r.error, 'error'); btn.disabled = false; }
    });
  });
}

document.getElementById('detail-modal-close')!.addEventListener('click', () => {
  document.getElementById('user-detail-modal')!.style.display = 'none';
});
document.getElementById('user-detail-modal')!.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) document.getElementById('user-detail-modal')!.style.display = 'none';
});

document.getElementById('detail-add-course-btn')!.addEventListener('click', () => {
  openGrantModal(detailUid, detailName);
});

document.getElementById('detail-notify-btn')!.addEventListener('click', () => {
  document.getElementById('notify-modal')!.style.display = 'flex';
});

document.getElementById('detail-delete-btn')!.addEventListener('click', async () => {
  if (!confirm(`PERMANENTLY DELETE ${detailName}? This cannot be undone.`)) return;
  const r = await adminDeleteUserAccount(detailUid);
  if (r.success) {
    showToast('User deleted.', 'success');
    document.getElementById('user-detail-modal')!.style.display = 'none';
    await doSearch((document.getElementById('user-search-input') as HTMLInputElement).value.trim());
  } else {
    showToast('Error: ' + r.error, 'error');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Grant Access Modal
// ─────────────────────────────────────────────────────────────────────────────

function populateCourseDropdown() {
  const selects = document.querySelectorAll<HTMLSelectElement>('#grant-course-id');
  selects.forEach(sel => {
    sel.innerHTML = '<option value="">— Select Course —</option>' +
      allCourses.map(c => `<option value="${c.id}">${c.title}</option>`).join('');
  });
}

function openGrantModal(prefilledUid?: string, prefilledName?: string) {
  const modal = document.getElementById('grant-modal')!;
  const prefilledInfo = document.getElementById('grant-prefilled-info')!;
  const identifierGroup = document.getElementById('grant-identifier-group')!;
  const uidInput = document.getElementById('grant-prefilled-uid') as HTMLInputElement;
  const nameEl = document.getElementById('grant-prefilled-name')!;
  const result = document.getElementById('grant-result')!;

  result.style.display = 'none';
  (document.getElementById('grant-identifier') as HTMLInputElement).value = '';
  (document.getElementById('grant-course-id') as HTMLSelectElement).value = '';
  (document.getElementById('grant-expiry') as HTMLInputElement).value = defaultExpiryValue();
  document.getElementById('grant-submit-label')!.textContent = 'Grant Access';

  if (prefilledUid) {
    uidInput.value = prefilledUid;
    nameEl.textContent = `Granting to: ${prefilledName || prefilledUid}`;
    prefilledInfo.style.display = 'block';
    identifierGroup.style.display = 'none';
    document.getElementById('grant-modal-title')!.textContent = `Grant Access — ${prefilledName}`;
  } else {
    uidInput.value = '';
    prefilledInfo.style.display = 'none';
    identifierGroup.style.display = 'block';
    document.getElementById('grant-modal-title')!.textContent = 'Grant Course Access';
  }

  modal.style.display = 'flex';
  (window as any).lucide?.createIcons();
}

function setupGrantModal() {
  document.getElementById('grant-access-fab')!.addEventListener('click', () => openGrantModal());
  document.getElementById('grant-modal-close')!.addEventListener('click', closeGrantModal);
  document.getElementById('grant-modal-cancel')!.addEventListener('click', closeGrantModal);
  document.getElementById('grant-modal')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeGrantModal();
  });

  document.getElementById('grant-submit-btn')!.addEventListener('click', async () => {
    const uidInput = document.getElementById('grant-prefilled-uid') as HTMLInputElement;
    const prefilledUid = uidInput.value.trim();
    const identifier = (document.getElementById('grant-identifier') as HTMLInputElement).value.trim();
    const courseId = (document.getElementById('grant-course-id') as HTMLSelectElement).value;
    const expiryStr = (document.getElementById('grant-expiry') as HTMLInputElement).value;
    const resultEl = document.getElementById('grant-result')!;
    const submitLabel = document.getElementById('grant-submit-label')!;

    if (!courseId || !expiryStr) { showToast('Please select a course and expiry date.', 'warning'); return; }
    if (!prefilledUid && !identifier) { showToast('Enter a phone number or email.', 'warning'); return; }

    const expiryDate = new Date(expiryStr);
    const courseName = allCourses.find(c => c.id === courseId)?.title || courseId;

    submitLabel.textContent = 'Granting…';
    (document.getElementById('grant-submit-btn') as HTMLButtonElement).disabled = true;
    resultEl.style.display = 'none';

    let result: any;
    if (prefilledUid) {
      const validityDays = Math.max(1, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));
      result = await adminEnrollUserByUid(prefilledUid, courseId, validityDays);
      result.pending = false;
      result.displayName = detailName || prefilledUid;
    } else {
      result = await adminGrantAccess(identifier, courseId, courseName, expiryDate);
    }

    (document.getElementById('grant-submit-btn') as HTMLButtonElement).disabled = false;
    submitLabel.textContent = 'Grant Access';

    if (result.success) {
      const msg = result.pending
        ? `⏳ Pending: ${result.displayName} will get access when they sign up.`
        : `✅ Access granted to ${result.displayName} for ${courseName}`;
      resultEl.style.display = 'block';
      resultEl.style.background = result.pending ? '#EFF6FF' : '#F0FDF4';
      resultEl.style.color = result.pending ? '#2563EB' : '#16A34A';
      resultEl.style.border = `1px solid ${result.pending ? '#BFDBFE' : '#BBF7D0'}`;
      resultEl.textContent = msg;
      showToast(msg, result.pending ? 'info' : 'success');
      if (prefilledUid) { await loadDetailCourses(); await loadByCourse(); }
      else setTimeout(closeGrantModal, 2000);
    } else {
      resultEl.style.display = 'block';
      resultEl.style.background = '#FEF2F2'; resultEl.style.color = '#DC2626'; resultEl.style.border = '1px solid #FECACA';
      resultEl.textContent = 'Error: ' + result.error;
    }
  });
}

function closeGrantModal() {
  document.getElementById('grant-modal')!.style.display = 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// Extend Expiry Modal
// ─────────────────────────────────────────────────────────────────────────────

function openExtendModal(uid: string, courseId: string, courseName: string) {
  extendTargetUid = uid;
  extendTargetCourseId = courseId;
  document.getElementById('extend-course-name')!.textContent = `Course: ${courseName}`;
  (document.getElementById('extend-days') as HTMLInputElement).value = '365';
  document.getElementById('extend-modal')!.style.display = 'flex';
}

function setupExtendModal() {
  document.getElementById('extend-modal-close')!.addEventListener('click', () => {
    document.getElementById('extend-modal')!.style.display = 'none';
  });
  document.getElementById('extend-cancel-btn')!.addEventListener('click', () => {
    document.getElementById('extend-modal')!.style.display = 'none';
  });
  document.getElementById('extend-confirm-btn')!.addEventListener('click', async () => {
    const days = parseInt((document.getElementById('extend-days') as HTMLInputElement).value);
    if (!days || days < 1) { showToast('Enter a valid number of days.', 'warning'); return; }
    const btn = document.getElementById('extend-confirm-btn') as HTMLButtonElement;
    btn.disabled = true; btn.textContent = 'Extending…';
    const r = await adminExtendExpiry(extendTargetUid, extendTargetCourseId, days);
    btn.disabled = false; btn.innerHTML = '<i data-lucide="calendar-plus" width="14" height="14"></i> Extend';
    if (r.success) {
      showToast(`✅ Expiry extended by ${days} days!`, 'success');
      document.getElementById('extend-modal')!.style.display = 'none';
      await loadDetailCourses();
    } else {
      showToast('Error: ' + r.error, 'error');
    }
    (window as any).lucide?.createIcons();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Notify Modal
// ─────────────────────────────────────────────────────────────────────────────

function setupNotifyModal() {
  document.getElementById('notify-modal-close')!.addEventListener('click', () => {
    document.getElementById('notify-modal')!.style.display = 'none';
  });
  document.getElementById('notify-cancel-btn')!.addEventListener('click', () => {
    document.getElementById('notify-modal')!.style.display = 'none';
  });
  document.getElementById('notify-send-btn')!.addEventListener('click', async () => {
    const title = (document.getElementById('notify-title') as HTMLInputElement).value.trim();
    const body = (document.getElementById('notify-body') as HTMLTextAreaElement).value.trim();
    if (!title || !body) { showToast('Enter title and message.', 'warning'); return; }
    if (!detailEmail) { showToast('No email for this user.', 'error'); return; }
    const btn = document.getElementById('notify-send-btn') as HTMLButtonElement;
    btn.disabled = true; btn.textContent = 'Sending…';
    const r = await sendNotificationToUser(detailEmail, title, body);
    btn.disabled = false; btn.innerHTML = '<i data-lucide="send" width="14" height="14"></i> Send';
    if (r.success) {
      showToast('Notification sent!', 'success');
      document.getElementById('notify-modal')!.style.display = 'none';
    } else {
      showToast('Error: ' + r.error, 'error');
    }
    (window as any).lucide?.createIcons();
  });

  document.getElementById('notify-modal')!.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('notify-modal')!.style.display = 'none';
  });
}
