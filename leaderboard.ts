import { auth, db } from './firebase-config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const podiumContainer = document.getElementById('podium-container') as HTMLElement;
const rankingsList = document.getElementById('rankings-list') as HTMLElement;
const tabs = document.querySelectorAll('.tab-btn');

let currentTab = 'overall';

function init() {
  loadRankings('totalScore');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const tabType = tab.getAttribute('data-tab');
      if (tabType === 'overall') {
        loadRankings('totalScore');
      } else if (tabType === 'weekly') {
        loadRankings('weeklyScore');
      } else if (tabType === 'course') {
        // Simple message for course tab if not implemented
        rankingsList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-secondary);">Course-wise rankings coming soon!</div>';
        podiumContainer.innerHTML = '';
      }
    });
  });
}

function loadRankings(sortField: string) {
  const q = query(
    collection(db, 'leaderboard'),
    orderBy(sortField, 'desc'),
    limit(50)
  );

  onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    renderPodium(docs.slice(0, 3), sortField);
    renderList(docs.slice(3), sortField, 4);
  });
}

function renderPodium(top3: any[], field: string) {
  if (top3.length === 0) {
    podiumContainer.innerHTML = '';
    return;
  }

  // Reorder for visual: 2, 1, 3
  const visualOrder = [];
  if (top3[1]) visualOrder.push({ ...top3[1], rank: 2 });
  if (top3[0]) visualOrder.push({ ...top3[0], rank: 1 });
  if (top3[2]) visualOrder.push({ ...top3[2], rank: 3 });

  podiumContainer.innerHTML = visualOrder.map(user => {
    const initials = user.userName ? user.userName.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2) : '?';
    const score = user[field] || 0;
    return `
      <div class="podium-spot spot-${user.rank}">
        ${user.rank === 1 ? '<span class="crown">👑</span>' : ''}
        <div class="podium-avatar">${initials}</div>
        <div class="podium-name">${user.userName || 'Student'}</div>
        <div class="podium-pts">${score} pts</div>
      </div>
    `;
  }).join('');
}

function renderList(remaining: any[], field: string, startRank: number) {
  if (remaining.length === 0 && startRank === 4) {
    rankingsList.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">No other rankings yet.</div>';
    return;
  }

  rankingsList.innerHTML = remaining.map((user, index) => {
    const initials = user.userName ? user.userName.split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2) : '?';
    const score = user[field] || 0;
    const rank = startRank + index;
    return `
      <div class="rank-item">
        <div class="rank-number">${rank}</div>
        <div class="rank-avatar">${initials}</div>
        <div class="rank-info">
          <div class="rank-name">${user.userName || 'Student'}</div>
          <div class="rank-stats">${user.totalQuizzes || 0} quizzes completed</div>
        </div>
        <div class="rank-pts">
          <span class="rank-pts-val">${score}</span>
          <span class="rank-pts-label">PTS</span>
        </div>
      </div>
    `;
  }).join('');
}

init();
