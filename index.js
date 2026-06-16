/* ═══════════════════════════════════════════════════════════════
   PSU-CS-Academic-Projects — Application Logic
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Config ─────────────────────────────────────────────────────
const ORG = 'PSU-CS-Academic-Projects';
const GITHUB_API = 'https://api.github.com';
const HEADERS = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };

const LANG_COLORS = {
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  HTML: '#e34c26',
  CSS: '#563d7c',
  TypeScript: '#3178c6',
  Go: '#00ADD8',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Rust: '#dea584'
};

const SUBJECT_MAP = {
  'wst': 'Web System and Technology',
  'sia': 'System Integration Architecture'
};

// Fallback static data if API fails
const FALLBACK_REPOS = [
  {
    id: 1, name: 'data-structures-library', full_name: `${ORG}/data-structures-library`,
    description: 'A comprehensive implementation of common data structures in Java including linked lists, trees, graphs, and hash maps.',
    html_url: `https://github.com/${ORG}/data-structures-library`,
    homepage: null, topics: ['java', 'data-structures', 'algorithms', 'cmpsc-465'],
    stargazers_count: 12, forks_count: 4, language: 'Java',
    updated_at: '2024-11-01T00:00:00Z', pushed_at: '2024-11-01T00:00:00Z',
  },
  {
    id: 2, name: 'machine-learning-project', full_name: `${ORG}/machine-learning-project`,
    description: 'End-to-end ML pipeline for image classification using CNNs built with PyTorch for CMPSC 448.',
    html_url: `https://github.com/${ORG}/machine-learning-project`,
    homepage: null, topics: ['python', 'machine-learning', 'pytorch', 'cmpsc-448'],
    stargazers_count: 23, forks_count: 7, language: 'Python',
    updated_at: '2024-10-15T00:00:00Z', pushed_at: '2024-10-15T00:00:00Z',
  },
  {
    id: 3, name: 'operating-systems-shell', full_name: `${ORG}/operating-systems-shell`,
    description: 'Custom Unix-like shell implementation in C with job control, piping, and I/O redirection for CMPSC 473.',
    html_url: `https://github.com/${ORG}/operating-systems-shell`,
    homepage: null, topics: ['c', 'operating-systems', 'shell', 'cmpsc-473'],
    stargazers_count: 8, forks_count: 2, language: 'C',
    updated_at: '2024-09-20T00:00:00Z', pushed_at: '2024-09-20T00:00:00Z',
  },
  {
    id: 4, name: 'web-dev-fullstack-app', full_name: `${ORG}/web-dev-fullstack-app`,
    description: 'Full-stack web application with React frontend and Node.js/Express backend with PostgreSQL database.',
    html_url: `https://github.com/${ORG}/web-dev-fullstack-app`,
    homepage: 'https://example.com', topics: ['javascript', 'react', 'nodejs', 'postgresql', 'cmpsc-431w'],
    stargazers_count: 31, forks_count: 9, language: 'JavaScript',
    updated_at: '2024-12-01T00:00:00Z', pushed_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 5, name: 'compiler-design', full_name: `${ORG}/compiler-design`,
    description: 'A complete compiler for a subset of C, including lexer, parser, semantic analysis, and x86 code generation.',
    html_url: `https://github.com/${ORG}/compiler-design`,
    homepage: null, topics: ['c', 'compiler', 'cmpsc-470', 'llvm'],
    stargazers_count: 15, forks_count: 3, language: 'C',
    updated_at: '2024-08-10T00:00:00Z', pushed_at: '2024-08-10T00:00:00Z',
  },
  {
    id: 6, name: 'networks-chat-app', full_name: `${ORG}/networks-chat-app`,
    description: 'Multi-client TCP/UDP chat application with real-time messaging and file transfer capabilities.',
    html_url: `https://github.com/${ORG}/networks-chat-app`,
    homepage: null, topics: ['python', 'networking', 'tcp', 'cmpsc-442'],
    stargazers_count: 6, forks_count: 1, language: 'Python',
    updated_at: '2024-07-05T00:00:00Z', pushed_at: '2024-07-05T00:00:00Z',
  },
];

// No fake member fallback — show empty state if org has no public members
const FALLBACK_MEMBERS = [];


// ── State ───────────────────────────────────────────────────────
const state = {
  repos: [],
  members: [], // Flattened list of member objects if needed
  searchQuery: '',
  memberSearchQuery: '',
  category: '',
  subject: '',
  sortBy: 'updated',
  currentScreenshots: [],
  currentScreenshotIndex: 0
};

// ── LocalStorage Cache ───────────────────────────────────────
const CACHE_KEY   = 'psu-portfolio-v1';
const CACHE_FRESH = 5  * 60 * 1000;   // < 5 min  → skip API entirely, render instantly
const CACHE_MAX   = 60 * 60 * 1000;   // > 60 min → treat as expired

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d?.ts || !Array.isArray(d.repos)) return null;
    const age = Date.now() - d.ts;
    if (age > CACHE_MAX) return null;          // expired
    return { repos: d.repos, members: d.members || [], fresh: age < CACHE_FRESH };
  } catch { return null; }
}

function setCache(repos, members) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      ts: Date.now(), repos, members,
    }));
  } catch { /* quota exceeded or storage disabled */ }
}

// ── DOM Refs ────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const dom = {
  loader:        $('#page-loader'),
  hero:          $('#hero'),
  cardGrid:      $('#card-grid'),
  emptyState:    $('#empty-state'),
  emptyTitle:    $('#empty-title'),
  emptyMessage:  $('#empty-message'),
  emptyAction:   $('#empty-action'),
  memberGrid:    $('#member-grid'),
  searchInput:   $('#search-input'),
  searchClear:   $('#search-clear'),
  memberSearchInput: document.getElementById('member-search-input'),
  memberSearchClear: document.getElementById('member-search-clear'),
  categoryFilter: document.getElementById('category-filter'),
  subjectFilter: document.getElementById('subject-filter'),
  sortFilter:    document.getElementById('sort-filter'),
  resultsCount:  $('#results-count'),
  filterBar:     $('#filter-bar'),
  statRepos:     $('#stat-repos'),
  statMembers:   $('#stat-members'),
  statSubjects:  $('#stat-subjects'),
  modalBackdrop: $('#modal-backdrop'),
  modal:         $('#modal'),
  modalClose:    $('#modal-close'),
  modalTitle:    $('#modal-title'),
  modalDesc:     $('#modal-description'),
  modalBadges:   $('#modal-badges'),
  modalMeta:     $('#modal-meta'),
  modalSubject:  $('#modal-subject'),
  modalTags:     $('#modal-tags'),
  modalMembers:  $('#modal-members'),
  modalActions:  $('#modal-actions'),
  footerYear:    $('#footer-year'),
  toastContainer:$('#toast-container'),
};

// ── Utilities ───────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function relativeTime(iso) {
  const date = new Date(iso);
  const now  = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000)return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 31536000)return`${Math.floor(diff / 2592000)}mo ago`;
  return `${Math.floor(diff / 31536000)}yr ago`;
}

function getInitials(login) {
  return login
    .replace(/[-_]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function langClass(lang) {
  if (!lang) return 'lang--default';
  return 'lang--' + lang.toLowerCase().replace(/[^a-z]/g, '');
}

function getLangColor(lang) {
  return LANG_COLORS[lang] || '#6b7280';
}

function extractSubjectsFromTopics(repos) {
  const subjects = new Set();
  repos.forEach(r => {
    (r.topics || []).forEach(t => {
      if (t === 'wst' || t === 'sia') subjects.add(t);
    });
  });
  return subjects.size;
}

function extractCategories(repos) {
  const cats = new Set();
  repos.forEach(r => {
    (r.topics || []).forEach(t => {
      // Ignore subjects and the old course pattern if any
      if (t !== 'wst' && t !== 'sia' && !/^(cmpsc|cmpen|cse|ece|ist)-?\d+/i.test(t)) {
        cats.add(t);
      }
    });
  });
  return Array.from(cats).sort();
}

// ── Counter Animation ───────────────────────────────────────────
function animateCounter(el, target, duration = 1200) {
  if (!el) return;
  const start = Date.now();
  function tick() {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  }
  requestAnimationFrame(tick);
}

// ── Skeleton Loaders ────────────────────────────────────────────
function renderSkeletons(count = 6) {
  dom.cardGrid.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton" role="presentation" aria-hidden="true">
      <div class="skeleton__badges">
        <div class="skeleton__line skeleton__line--badge"></div>
      </div>
      <div class="skeleton__line skeleton__line--title"></div>
      <div class="skeleton__text">
        <div class="skeleton__line skeleton__line--p1"></div>
        <div class="skeleton__line skeleton__line--p2"></div>
        <div class="skeleton__line skeleton__line--p3"></div>
      </div>
      <div class="skeleton__footer">
        <div class="skeleton__line skeleton__line--btn"></div>
        <div class="skeleton__line skeleton__line--btn"></div>
      </div>
    </div>
  `).join('');
}

// ── Card Rendering ──────────────────────────────────────────────
function buildCard(repo, index) {
  const delay = Math.min(index * 50, 600);
  const topics = repo.topics || [];
  const subjectTopic = topics.find(t => SUBJECT_MAP[t]);
  const otherTopics = topics.filter(t => !SUBJECT_MAP[t]);

  const topicsHtml = otherTopics.slice(0, 4).map(t =>
    `<span class="badge badge--tag">${escHtml(t)}</span>`
  ).join('');
  const langColor = repo.language ? getLangColor(repo.language) : null;

  return `
    <article
      class="card"
      role="listitem"
      style="animation-delay:${delay}ms"
      data-repo-id="${repo.id}"
      tabindex="0"
      aria-label="Project: ${escHtml(repo.name)}"
    >
      <div class="card__header">
        <div class="card__badges">
          ${repo.language ? `
            <span class="badge badge--outline badge--lang">
              <span class="card__lang-dot" style="background:${langColor}"></span>
              ${escHtml(repo.language)}
            </span>
          ` : ''}
        </div>
        <svg class="card__repo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M3 3h18v18H3V3z" rx="3"/>
          <path d="M3 9h18"/>
          <path d="M9 21V9"/>
        </svg>
      </div>

      <h3 class="card__title">${escHtml(repo.name.replace(/-/g, ' ').replace(/_/g, ' '))}</h3>

      <p class="card__description">
        ${repo.description ? escHtml(repo.description) : '<em style="opacity:0.5">No description provided.</em>'}
      </p>

      ${subjectTopic ? `<div class="card__tags" style="margin-bottom: 0.5rem;"><span class="badge badge--tag">${escHtml(SUBJECT_MAP[subjectTopic])}</span></div>` : ''}

      ${topicsHtml ? `<div class="card__tags">${topicsHtml}</div>` : ''}

      ${(function() {
        const members = repo.members || [];
        if (members.length === 0) {
          return `<p class="card__members-empty">Members not listed</p>`;
        }
        let displayMembers = members;
        let extraCount = 0;
        if (members.length > 5) {
          displayMembers = members.slice(0, 3);
          extraCount = members.length - 3;
        }
        return `<ul class="card__members-list">` + 
          displayMembers.map(m => `<li>${escHtml(m)}</li>`).join('') +
          (extraCount > 0 ? `<li class="card__members-more">+${extraCount} more</li>` : '') +
          `</ul>`;
      })()}

      <div class="card__meta">
        <span class="card__stat" title="Stars">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          ${repo.stargazers_count}
        </span>
        <span class="card__stat" title="Forks">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M6 3v9a6 6 0 0012 0V3"/>
            <line x1="6" y1="3" x2="6" y2="3.01"/>
            <line x1="18" y1="3" x2="18" y2="3.01"/>
            <line x1="12" y1="21" x2="12" y2="21.01"/>
          </svg>
          ${repo.forks_count}
        </span>
        <span class="card__stat" style="margin-left:auto" title="Last updated">
          ${relativeTime(repo.updated_at)}
        </span>
      </div>

      <div class="card__actions">
        ${repo.homepage ? `
          <a
            href="${escHtml(repo.homepage)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn--gold btn--sm"
            aria-label="Live demo for ${escHtml(repo.name)}"
            onclick="event.stopPropagation()"
          >
            Live Demo
          </a>
        ` : ''}
        ${repo.video_demo ? `
          <a
            href="${escHtml(repo.video_demo)}"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn--gold btn--sm"
            aria-label="Video Demonstration for ${escHtml(repo.name)}"
            onclick="event.stopPropagation()"
          >
            Video Demo
          </a>
        ` : ''}
        <button
          class="btn btn--outline btn--sm ${!(repo.homepage || repo.video_demo) ? 'flex-full' : ''}"
          data-repo-id="${repo.id}"
          aria-label="View details for ${escHtml(repo.name)}"
        >
          View Details
        </button>
      </div>
    </article>
  `;
}

function renderCards(repos) {
  dom.emptyState.style.display = 'none';

  if (repos.length === 0) {
    dom.cardGrid.innerHTML = '';
    // Restore default filter-empty-state text
    if (dom.emptyTitle)   dom.emptyTitle.textContent   = 'No projects found';
    if (dom.emptyMessage) dom.emptyMessage.textContent = 'Try adjusting your search or filter criteria.';
    if (dom.emptyAction) {
      dom.emptyAction.textContent = 'Clear filters';
      dom.emptyAction.onclick = () => {
        dom.searchInput.value = '';
        dom.categoryFilter.value = '';
        dom.sortFilter.value = 'updated';
        state.searchQuery = '';
        state.category = '';
        state.sortBy = 'updated';
        dom.searchClear.classList.remove('visible');
        applyFilters();
      };
      dom.emptyAction.hidden = false;
    }
    dom.emptyState.style.display = 'flex';
    dom.resultsCount.textContent = '0 results';
    return;
  }

  dom.cardGrid.innerHTML = repos.map((r, i) => buildCard(r, i)).join('');
  dom.resultsCount.textContent = `${repos.length} project${repos.length !== 1 ? 's' : ''}`;

  // Bind card click events
  $$('.card, [data-repo-id]', dom.cardGrid).forEach(el => {
    const id = parseInt(el.dataset.repoId, 10);
    const handler = (e) => {
      // Don't open modal if clicking a link
      if (e.target.closest('a')) return;
      const repo = state.repos.find(r => r.id === id);
      if (repo) openModal(repo);
    };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); }
    });
  });
}

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Filter & Sort ───────────────────────────────────────────────
function applyFilters() {
  let filtered = state.repos.filter(r => {
    const q = state.searchQuery.toLowerCase();
    const mq = state.memberSearchQuery.toLowerCase();
    
    // Match project name or description
    const matchesSearch = !q || 
      (r.name && r.name.toLowerCase().includes(q)) || 
      (r.description && r.description.toLowerCase().includes(q));

    // Match member name
    const matchesMember = !mq || 
      (r.members && r.members.some(m => m.toLowerCase().includes(mq)));

    // Match category
    const matchesCategory = !state.category || 
      (r.topics && r.topics.includes(state.category));

    // Match subject
    const matchesSubject = !state.subject ||
      (r.topics && r.topics.includes(state.subject));

    return matchesSearch && matchesMember && matchesCategory && matchesSubject;
  });

  filtered = filtered.slice().sort((a, b) => {
    switch (state.sortBy) {
      case 'stars':   return b.stargazers_count - a.stargazers_count;
      case 'forks':   return b.forks_count      - a.forks_count;
      case 'name':    return a.name.localeCompare(b.name);
      case 'member-asc': {
        const memA = (a.members && a.members.length > 0) ? a.members[0].toLowerCase() : 'zzz';
        const memB = (b.members && b.members.length > 0) ? b.members[0].toLowerCase() : 'zzz';
        return memA.localeCompare(memB);
      }
      case 'member-desc': {
        const memA = (a.members && a.members.length > 0) ? a.members[0].toLowerCase() : 'zzz';
        const memB = (b.members && b.members.length > 0) ? b.members[0].toLowerCase() : 'zzz';
        return memB.localeCompare(memA);
      }
      case 'updated':
      default:        return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });

  // Fade out → re-render → fade in
  dom.cardGrid.style.opacity = '0';
  dom.cardGrid.style.transform = 'translateY(8px)';
  dom.cardGrid.style.transition = 'opacity 180ms ease, transform 180ms ease';

  setTimeout(() => {
    renderCards(filtered);
    dom.cardGrid.style.opacity = '1';
    dom.cardGrid.style.transform = 'translateY(0)';
  }, 180);
}

function populateCategoryFilter(repos) {
  const cats = extractCategories(repos);
  const select = dom.categoryFilter;
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

// ── Modal ───────────────────────────────────────────────────────
function openModal(repo) {
  const topics = repo.topics || [];
  const langColor = repo.language ? getLangColor(repo.language) : null;

  // Badges
  dom.modalBadges.innerHTML = [
    repo.language ? `<span class="badge badge--outline badge--lang">
      <span class="card__lang-dot" style="background:${langColor}"></span>
      ${escHtml(repo.language)}
    </span>` : '',
    `<span class="badge badge--maroon">Open Source</span>`,
  ].filter(Boolean).join('');

  // Title & description
  dom.modalTitle.textContent = repo.name.replace(/-/g, ' ').replace(/_/g, ' ');
  dom.modalDesc.textContent = repo.description || 'No description provided.';

  // Meta stats
  dom.modalMeta.innerHTML = `
    <div class="modal__meta-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      <strong>${repo.stargazers_count}</strong> stars
    </div>
    <div class="modal__meta-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M6 3v9a6 6 0 0012 0V3"/>
      </svg>
      <strong>${repo.forks_count}</strong> forks
    </div>
    <div class="modal__meta-item">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      Updated <strong>${relativeTime(repo.updated_at)}</strong>
    </div>
  `;

  // Subject
  const subjectTopic = topics.find(t => SUBJECT_MAP[t]);
  const subjectSection = $('#modal-subject-section');
  if (subjectTopic) {
    dom.modalSubject.innerHTML = `<span class="badge badge--tag">${escHtml(SUBJECT_MAP[subjectTopic])}</span>`;
    subjectSection.hidden = false;
  } else {
    subjectSection.hidden = true;
  }

  // Topics / tags
  const otherTopics = topics.filter(t => !SUBJECT_MAP[t]);
  const topicsSection = $('#modal-topics-section');
  if (otherTopics.length) {
    dom.modalTags.innerHTML = otherTopics.map(t =>
      `<span class="badge badge--tag">${escHtml(t)}</span>`
    ).join('');
    topicsSection.hidden = false;
  } else {
    topicsSection.hidden = true;
  }

  // Screenshots
  const screenshotsSection = $('#modal-screenshots-section');
  const domScreenshots = $('#modal-screenshots');
  if (repo.screenshots && repo.screenshots.length > 0) {
    state.currentScreenshots = repo.screenshots;
    
    // Always remove any previously added view-all button
    const oldBtn = $('#view-all-screenshots-btn');
    if (oldBtn) oldBtn.remove();

    const limit = 4;
    const initialScreenshots = repo.screenshots.slice(0, limit);
    
    const renderImages = (urls) => {
      return urls.map((url, index) => `<img src="${escHtml(url)}" class="modal__screenshot" data-index="${index}" alt="Screenshot" loading="lazy" referrerpolicy="no-referrer" style="border-radius: var(--radius-md); border: 1px solid var(--border-color); width: 100%; object-fit: cover; aspect-ratio: 16/9; margin-bottom: 1rem;">`).join('');
    };

    domScreenshots.innerHTML = renderImages(initialScreenshots);
    
    if (repo.screenshots.length > limit) {
      const btn = document.createElement('button');
      btn.id = 'view-all-screenshots-btn';
      btn.className = 'btn btn--outline';
      btn.style.width = '100%';
      btn.style.marginTop = '1rem';
      btn.textContent = `View all ${repo.screenshots.length} screenshots in gallery`;
      
      btn.addEventListener('click', () => {
        // Alternatively, just open the lightbox directly instead of dumping them all in the modal!
        openLightbox(0);
      });
      
      screenshotsSection.appendChild(btn);
    }
    
    screenshotsSection.hidden = false;
  } else {
    state.currentScreenshots = [];
    screenshotsSection.hidden = true;
  }

  // Members
  const membersSection = $('#modal-members-section');
  const members = repo.members || [];
  if (members.length) {
    dom.modalMembers.innerHTML = members.map(m => {
      const initials = getInitials(m);
      return `
        <div class="modal__member-chip" aria-label="Member: ${escHtml(m)}">
          <span class="modal__member-initials">${initials}</span>
          ${escHtml(m)}
        </div>
      `;
    }).join('');
    membersSection.hidden = false;
  } else {
    membersSection.hidden = true;
  }

  // Actions
  dom.modalActions.innerHTML = `
    ${repo.homepage ? `
      <a href="${escHtml(repo.homepage)}" target="_blank" rel="noopener noreferrer" class="btn btn--gold">
        <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        Live Demo
      </a>
    ` : ''}
    ${repo.video_demo ? `
      <a href="${escHtml(repo.video_demo)}" target="_blank" rel="noopener noreferrer" class="btn btn--gold">
        <svg class="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
        Video Demo
      </a>
    ` : ''}
    <a href="${escHtml(repo.html_url)}" target="_blank" rel="noopener noreferrer" class="btn btn--outline">
      <svg class="btn__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
      View on GitHub
    </a>
  `;

  // Show modal
  dom.modalBackdrop.hidden = false;
  dom.modalBackdrop.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => {
    dom.modalBackdrop.classList.add('open');
  });

  // Scroll to top of modal
  dom.modal.scrollTop = 0;

  // Trap focus & lock scroll
  document.body.style.overflow = 'hidden';
  dom.modalClose.focus();
}

function closeModal() {
  dom.modalBackdrop.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => {
    dom.modalBackdrop.hidden = true;
    dom.modalBackdrop.setAttribute('aria-hidden', 'true');
  }, 300);
}

// ── Members Rendering ───────────────────────────────────────────
function renderMembers(members) {
  if (!members.length) {
    dom.memberGrid.innerHTML = '<p style="color:var(--clr-text-faint);font-size:var(--text-sm)">No public members found.</p>';
    return;
  }

  dom.memberGrid.innerHTML = members.map((m, i) => {
    const initials = getInitials(m.login);
    const delay = Math.min(i * 40, 500);
    return `
      <div class="member-card" role="listitem" style="animation-delay:${delay}ms">
        <a href="${escHtml(m.html_url)}" target="_blank" rel="noopener noreferrer" aria-label="GitHub profile of ${escHtml(m.login)}">
          ${m.avatar_url
            ? `<img src="${escHtml(m.avatar_url)}" alt="${escHtml(m.login)}" class="member-avatar" loading="lazy"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''
          }
          <div class="member-initials" ${m.avatar_url ? 'style="display:none"' : ''}>${initials}</div>
          <div>
            <div class="member-name">${escHtml(m.login)}</div>
            <div class="member-handle">@${escHtml(m.login)}</div>
          </div>
        </a>
      </div>
    `;
  }).join('');
}

// ── GitHub API Fetching ─────────────────────────────────────────
async function fetchWithRetry(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries) throw err;
      await sleep(500 * (i + 1));
    }
  }
}

async function fetchAllPages(endpoint) {
  const results = [];
  let page = 1;
  while (true) {
    const data = await fetchWithRetry(`${GITHUB_API}${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(data) || data.length === 0) break;
    results.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return results;
}

async function fetchOrgData() {
  try {
    const org = await fetchWithRetry(`${GITHUB_API}/orgs/${ORG}`);
    return { publicRepos: org.public_repos || 0, publicMembers: org.public_members || 0 };
  } catch {
    return { publicRepos: null, publicMembers: null };
  }
}

async function fetchRepos() {
  // Include forks — the org may consist entirely of forked repos
  return await fetchAllPages(`/orgs/${ORG}/repos?sort=updated&type=public`);
}

async function fetchMembers() {
  try {
    return await fetchAllPages(`/orgs/${ORG}/members?filter=all`);
  } catch {
    return [];
  }
}

/**
 * Fetch real contributors by aggregating across all org repos.
 * This works regardless of whether org membership is public or private.
 * Falls back to the org members endpoint if contributors come up empty.
 */
async function fetchContributors(repos) {
  try {
    // Limit to first 8 repos to stay well under the API rate limit
    const topRepos = repos.slice(0, 8);
    const results = await Promise.all(
      topRepos.map(r =>
        fetchWithRetry(`${GITHUB_API}/repos/${ORG}/${r.name}/contributors?per_page=50&anon=0`)
          .catch(() => [])
      )
    );

    // Deduplicate by login, accumulate contribution counts
    const map = new Map();
    results.flat().forEach(c => {
      if (!c.login || c.type === 'Bot') return;
      if (map.has(c.login)) {
        map.get(c.login).contributions += c.contributions;
      } else {
        map.set(c.login, { ...c });
      }
    });

    const contributors = [...map.values()]
      .sort((a, b) => b.contributions - a.contributions);

    // If no contributors found from repos, fall back to org members
    if (contributors.length === 0) {
      return await fetchMembers();
    }

    return contributors;
  } catch {
    return await fetchMembers();
  }
}

// ── Scroll Reveal ───────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  $$('.reveal').forEach(el => observer.observe(el));
}

// ── Filter Bar Scroll Shadow ────────────────────────────────────
function initFilterBarShadow() {
  const THRESHOLD = 100;
  function update() {
    const scrolled = window.scrollY > THRESHOLD;
    dom.filterBar.classList.toggle('scrolled', scrolled);
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ── Event Bindings ──────────────────────────────────────────────
function bindEvents() {
  // Search
  let searchTimer;
  dom.searchInput.addEventListener('input', e => {
    state.searchQuery = e.target.value.trim();
    dom.searchClear.classList.toggle('visible', state.searchQuery.length > 0);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 250);
  });

  dom.searchClear.addEventListener('click', clearSearch);
  dom.searchClear.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearSearch(); }
  });

  function clearSearch() {
    dom.searchInput.value = '';
    state.searchQuery = '';
    dom.searchClear.classList.remove('visible');
    dom.searchInput.focus();
    applyFilters();
  }

  // Member Search
  let memberSearchTimer;
  dom.memberSearchInput.addEventListener('input', e => {
    state.memberSearchQuery = e.target.value.trim();
    dom.memberSearchClear.classList.toggle('visible', state.memberSearchQuery.length > 0);
    clearTimeout(memberSearchTimer);
    memberSearchTimer = setTimeout(applyFilters, 250);
  });

  dom.memberSearchClear.addEventListener('click', clearMemberSearch);
  dom.memberSearchClear.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearMemberSearch(); }
  });

  function clearMemberSearch() {
    dom.memberSearchInput.value = '';
    state.memberSearchQuery = '';
    dom.memberSearchClear.classList.remove('visible');
    dom.memberSearchInput.focus();
    applyFilters();
  }

  // Category filter
  dom.categoryFilter.addEventListener('change', e => {
    state.category = e.target.value;
    applyFilters();
  });

  // Subject filter
  if (dom.subjectFilter) {
    dom.subjectFilter.addEventListener('change', e => {
      state.subject = e.target.value;
      applyFilters();
    });
  }

  // Sort filter
  dom.sortFilter.addEventListener('change', e => {
    state.sortBy = e.target.value;
    applyFilters();
  });

  // Reset / Clear filters
  dom.emptyAction?.addEventListener('click', () => {
    // Default action is clear-filters; may be overridden to Retry by initData
    if (dom.emptyAction._isRetry) {
      dom.categoryFilter.innerHTML = '<option value="">All Categories</option>';
      if (dom.subjectFilter) dom.subjectFilter.value = '';
      initData();
      return;
    }
    dom.searchInput.value = '';
    dom.memberSearchInput.value = '';
    dom.categoryFilter.value = '';
    if (dom.subjectFilter) dom.subjectFilter.value = '';
    dom.sortFilter.value = 'updated';
    state.searchQuery = '';
    state.memberSearchQuery = '';
    state.category = '';
    state.subject = '';
    state.sortBy = 'updated';
    dom.searchClear.classList.remove('visible');
    dom.memberSearchClear.classList.remove('visible');
    applyFilters();
  });

  // Modal close
  dom.modalClose.addEventListener('click', closeModal);
  dom.modalBackdrop.addEventListener('click', e => {
    if (e.target === dom.modalBackdrop) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dom.modalBackdrop.classList.contains('open')) closeModal();
  });

  // Smooth scroll for anchor links
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ── Main Init ───────────────────────────────────────────────────
// Renders a loaded set of repos into the page
function _applyLoadedData(repos, repoCount) {
  state.repos = repos;
  dom.categoryFilter.innerHTML = '<option value="">All Categories</option>';
  populateCategoryFilter(repos);
  renderCards(repos);
  requestAnimationFrame(() => { dom.cardGrid.style.cssText = ''; });
  animateCounter(dom.statRepos,    repoCount ?? repos.length,             900);
  animateCounter(dom.statSubjects, extractSubjectsFromTopics(repos),       700);
  
  // Aggregate unique members for the stat counter and member grid
  const allMembers = new Set();
  repos.forEach(r => (r.members || []).forEach(m => allMembers.add(m)));
  animateCounter(dom.statMembers,  allMembers.size,                        800);
  
  // Create mock member objects for the member grid using the README members
  const memberObjects = Array.from(allMembers).map((name, i) => ({
    id: i, login: name, avatar_url: '', html_url: '#'
  }));
  renderMembers(memberObjects);
}

function showToast(message, type = 'warning', duration = 5000) {
  if (!dom.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <svg class="toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
    <span>${message}</span>
    <button class="toast__close" aria-label="Close">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;
  
  dom.toastContainer.appendChild(toast);

  let hideTimeout;
  
  const hide = () => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove());
  };

  toast.querySelector('.toast__close').addEventListener('click', () => {
    clearTimeout(hideTimeout);
    hide();
  });

  hideTimeout = setTimeout(hide, duration);
}

async function initData() {
  dom.emptyState.style.display = 'none';
  dom.cardGrid.style.cssText = 'opacity:1;transform:none;transition:none';
  renderSkeletons(6);

  try {
    const res = await fetch('data.json');
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    if (data.repos.length === 0) {
      dom.cardGrid.innerHTML = '';
      if (dom.emptyTitle)   dom.emptyTitle.textContent   = 'No projects yet';
      if (dom.emptyMessage) dom.emptyMessage.textContent = 'We are still working on adding projects.';
      if (dom.emptyAction)  dom.emptyAction.hidden       = true;
      dom.emptyState.style.display = 'flex';
      dom.resultsCount.textContent = '0 projects';
      animateCounter(dom.statRepos,    0, 800);
      animateCounter(dom.statMembers,  0, 700);
      animateCounter(dom.statSubjects, 0, 600);
      return;
    }

    _applyLoadedData(data.repos, data.repos.length);
    
  } catch (err) {
    console.error('[PSU Portfolio]', err);

    // No cache at all — show clean error state
    state.repos   = [];
    state.members = [];
    dom.cardGrid.innerHTML = '';
    animateCounter(dom.statRepos,    0, 600);
    animateCounter(dom.statMembers,  0, 600);
    animateCounter(dom.statSubjects, 0, 600);
    renderMembers([]);
    if (dom.emptyTitle)   dom.emptyTitle.textContent   = 'Could not load projects';
    if (dom.emptyMessage) dom.emptyMessage.textContent = 'Unable to reach GitHub. Please check your connection.';
    if (dom.emptyAction) {
      dom.emptyAction.textContent = 'Retry';
      dom.emptyAction._isRetry   = true;
      dom.emptyAction.hidden     = false;
    }
    dom.emptyState.style.display = 'flex';
  }
}


// ── Bootstrap ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Set footer year
  if (dom.footerYear) dom.footerYear.textContent = new Date().getFullYear();

  // Bind all events
  bindEvents();

  // Init filter bar scroll
  initFilterBarShadow();

  // Init scroll reveal (after a tick so layout is computed)
  setTimeout(initScrollReveal, 100);

  // Hide page loader and begin fetching
  initData().finally(() => {
    setTimeout(() => {
      dom.loader?.classList.add('hidden');
    }, 400);
  });
});

// ── Lightbox Logic ──────────────────────────────────────────
const domLightbox = document.getElementById('lightbox');
const domLightboxImg = document.getElementById('lightbox-img');
const domLightboxClose = document.getElementById('lightbox-close');
const domLightboxPrev = document.getElementById('lightbox-prev');
const domLightboxNext = document.getElementById('lightbox-next');
const domLightboxCounter = document.getElementById('lightbox-counter');

function updateLightbox() {
  if (state.currentScreenshots.length === 0) return;
  // Ensure the image loads properly using the exact original URL string.
  domLightboxImg.src = state.currentScreenshots[state.currentScreenshotIndex];
  domLightboxCounter.textContent = `${state.currentScreenshotIndex + 1} / ${state.currentScreenshots.length}`;
}

function openLightbox(index) {
  state.currentScreenshotIndex = index;
  updateLightbox();
  domLightbox.hidden = false;
}

function closeLightbox() {
  domLightbox.hidden = true;
}

function nextLightboxImage() {
  if (state.currentScreenshots.length === 0) return;
  state.currentScreenshotIndex = (state.currentScreenshotIndex + 1) % state.currentScreenshots.length;
  updateLightbox();
}

function prevLightboxImage() {
  if (state.currentScreenshots.length === 0) return;
  state.currentScreenshotIndex = (state.currentScreenshotIndex - 1 + state.currentScreenshots.length) % state.currentScreenshots.length;
  updateLightbox();
}

domLightboxClose.addEventListener('click', closeLightbox);
domLightboxNext.addEventListener('click', (e) => { e.stopPropagation(); nextLightboxImage(); });
domLightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); prevLightboxImage(); });

// Close on backdrop click
domLightbox.addEventListener('click', (e) => {
  if (e.target === domLightbox || e.target.classList.contains('lightbox__content')) {
    closeLightbox();
  }
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (!domLightbox.hidden) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextLightboxImage();
    if (e.key === 'ArrowLeft') prevLightboxImage();
  }
});

// Event delegation for opening lightbox from modal screenshots
document.getElementById('modal-screenshots').addEventListener('click', (e) => {
  if (e.target.classList.contains('modal__screenshot')) {
    const idx = parseInt(e.target.getAttribute('data-index'), 10);
    openLightbox(idx);
  }
});
