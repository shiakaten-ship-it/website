/**
 * Bella Voyage Travel Blog - Core SPA Controller
 */

// Blog Application State
const state = {
  posts: [],
  activeCategory: 'All',
  searchQuery: '',
  activeSlide: 0,
  currentUser: null,
  accounts: [],
  deletedPostIds: [],
  quotes: [
    { text: "You may have the universe if I may have Italy.", author: "Giuseppe Verdi" },
    { text: "Paris is always a good idea.", author: "Audrey Hepburn" },
    { text: "To travel is to live.", author: "Hans Christian Andersen" },
    { text: "A man of ordinary talent will always be ordinary, whether he travels or not; but a man of superior talent will go to pieces if he remains forever in the same place.", author: "Wolfgang Amadeus Mozart" },
    { text: "Italy is a dream that keeps returning for the rest of your life.", author: "Anna Akhmatova" },
    { text: "In Paris, our lives are a romantic movie where we are both the director and the star.", author: "Unknown" }
  ]
};

// Elements Cache
const DOM = {
  mainContent: document.getElementById('main-content'),
  navHome: document.getElementById('nav-home'),
  navAbout: document.getElementById('nav-about'),
  navContact: document.getElementById('nav-contact'),
  navAddPost: document.getElementById('nav-add-post'),
  drawerHome: document.getElementById('drawer-home'),
  drawerAbout: document.getElementById('drawer-about'),
  drawerContact: document.getElementById('drawer-contact'),
  drawerAddPost: document.getElementById('drawer-add-post'),
  mobileToggle: document.getElementById('mobile-menu-toggle'),
  mobileClose: document.getElementById('mobile-menu-close'),
  mobileDrawer: document.getElementById('mobile-drawer'),
  drawerOverlay: document.getElementById('mobile-drawer-overlay'),
  newsletterForm: document.getElementById('newsletter-form'),
  newsletterEmail: document.getElementById('newsletter-email'),
  newsletterMsg: document.getElementById('newsletter-message'),
  quoteText: document.getElementById('travel-quote'),
  quoteAuthor: document.getElementById('quote-author'),
  authStatusDesktop: document.getElementById('auth-status'),
  authStatusMobile: document.getElementById('auth-status-mobile')
};

// ----------------------------------------------------
// Init Application
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // Mobile drawer events
  DOM.mobileToggle.addEventListener('click', toggleDrawer);
  DOM.mobileClose.addEventListener('click', toggleDrawer);
  DOM.drawerOverlay.addEventListener('click', toggleDrawer);

  // Newsletter setup
  if (DOM.newsletterForm) {
    DOM.newsletterForm.addEventListener('submit', handleNewsletterSubmit);
  }

  // Set random quote
  rotateQuote();

  // Load Slider logic
  initSlider();

  // Set up auth state
  state.currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
  
  // Set up accounts list
  const savedAccounts = localStorage.getItem('accounts');
  if (savedAccounts) {
    state.accounts = JSON.parse(savedAccounts);
  } else {
    state.accounts = [
      { email: 'shiakaten@gmail.com', name: 'Shiakaten', blocked: false },
      { email: 'traveler1@gmail.com', name: 'Alice Smith', blocked: false },
      { email: 'visitor2@gmail.com', name: 'Bob Johnson', blocked: true }
    ];
    localStorage.setItem('accounts', JSON.stringify(state.accounts));
  }

  // Load deleted post IDs list
  state.deletedPostIds = JSON.parse(localStorage.getItem('deleted_post_ids')) || [];

  // Update authentication widget layout
  renderAuthWidgets();

  // Fetch Blog Posts from JSON database
  try {
    const response = await fetch('posts.json');
    if (!response.ok) {
      throw new Error('Failed to fetch posts.json');
    }
    const basePosts = await response.json();
    const customPosts = JSON.parse(localStorage.getItem('custom_posts')) || [];
    const allMerged = [...customPosts, ...basePosts];
    
    // Filter out deleted posts
    state.posts = allMerged.filter(p => !state.deletedPostIds.includes(p.id) && !state.deletedPostIds.includes(String(p.id)) && !state.deletedPostIds.includes(Number(p.id)));
  } catch (error) {
    console.error('Error fetching blog database:', error);
    const customPosts = JSON.parse(localStorage.getItem('custom_posts')) || [];
    state.posts = customPosts.filter(p => !state.deletedPostIds.includes(p.id) && !state.deletedPostIds.includes(String(p.id)) && !state.deletedPostIds.includes(Number(p.id)));
  }

  // Listen for hash routing change
  window.addEventListener('hashchange', router);
  
  // Initial routing check
  router();
}

// ----------------------------------------------------
// Router & Page Views Rendering
// ----------------------------------------------------
function router() {
  const hash = window.location.hash || '#/';
  
  // Close drawer if it was open on navigation
  closeDrawer();

  // Handle active navigation tab styles
  updateActiveNavigation(hash);

  // Match routes
  if (hash === '#/' || hash === '') {
    renderHomeView();
  } else if (hash.startsWith('#/post/')) {
    const postSlug = hash.replace('#/post/', '');
    renderPostDetailView(postSlug);
  } else if (hash === '#/about') {
    renderAboutView();
  } else if (hash === '#/contact') {
    renderContactView();
  } else if (hash === '#/add-post') {
    renderAddPostView();
  } else if (hash === '#/login') {
    renderLoginView();
  } else if (hash === '#/admin') {
    if (!state.currentUser || !state.currentUser.isAdmin) {
      window.location.hash = '#/';
      return;
    }
    renderAdminView();
  } else if (hash === '#/disclaimer') {
    renderDisclaimerView();
  } else {
    renderNotFoundView();
  }
  
  // Scroll to top on page change
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function updateActiveNavigation(hash) {
  const allNavItems = [DOM.navHome, DOM.navAbout, DOM.navContact, DOM.navAddPost, DOM.drawerHome, DOM.drawerAbout, DOM.drawerContact, DOM.drawerAddPost];
  allNavItems.forEach(el => el?.classList.remove('active'));

  if (hash === '#/' || hash === '') {
    DOM.navHome?.classList.add('active');
    DOM.drawerHome?.classList.add('active');
  } else if (hash === '#/about') {
    DOM.navAbout?.classList.add('active');
    DOM.drawerAbout?.classList.add('active');
  } else if (hash === '#/contact') {
    DOM.navContact?.classList.add('active');
    DOM.drawerContact?.classList.add('active');
  } else if (hash === '#/add-post') {
    DOM.navAddPost?.classList.add('active');
    DOM.drawerAddPost?.classList.add('active');
  }
}

// ----------------------------------------------------
// Home Page Rendering
// ----------------------------------------------------
function renderHomeView() {
  // Filter posts
  let filtered = state.posts;

  // Category filter
  if (state.activeCategory !== 'All') {
    filtered = filtered.filter(post => post.category.toLowerCase() === state.activeCategory.toLowerCase());
  }

  // Search filter
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(post => 
      post.title.toLowerCase().includes(q) || 
      post.excerpt.toLowerCase().includes(q) ||
      post.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  // Find Featured Post (Usually the first featured post in the unfiltered list or fallback)
  const featuredPost = state.posts.find(p => p.featured) || state.posts[0];
  
  // Render main structure
  let html = `
    <!-- Top Filter & Search controls -->
    <div class="filter-search-container">
      <ul class="filter-tabs">
        <li><button class="filter-btn ${state.activeCategory === 'All' ? 'active' : ''}" data-cat="All">All</button></li>
        <li><button class="filter-btn ${state.activeCategory === 'Italy' ? 'active' : ''}" data-cat="Italy">Italy</button></li>
        <li><button class="filter-btn ${state.activeCategory === 'France' ? 'active' : ''}" data-cat="France">France</button></li>
      </ul>
      
      <div class="search-box-wrap">
        <svg class="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" class="search-input" id="search-input" placeholder="Search stories..." value="${state.searchQuery}">
      </div>
    </div>
  `;

  // Render Hero Featured Post ONLY if not searching or filtering by different categories
  if (featuredPost && state.activeCategory === 'All' && state.searchQuery === '') {
    const deleteBtn = state.currentUser?.isAdmin ? `<button class="post-delete-btn-overlay" data-id="${featuredPost.id}">Delete</button>` : '';
    const videoPlayBadge = featuredPost.type === 'video' ? `
      <div class="video-play-badge" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(212, 175, 55, 0.95); width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; pointer-events:none; box-shadow:0 6px 20px rgba(0,0,0,0.3); transition:var(--transition-smooth); z-index:2;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="margin-left:4px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      </div>
    ` : '';
    html += `
      <section class="featured-post-hero" style="position:relative;">
        <div class="hero-image-wrap">
          <span class="hero-category-tag">${featuredPost.category}</span>
          ${deleteBtn}
          ${videoPlayBadge}
          <img src="${featuredPost.coverImage}" alt="${featuredPost.title}">
        </div>
        <div class="hero-content">
          <div class="post-meta">
            <span class="post-meta-span">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              ${featuredPost.date}
            </span>
            <span class="post-meta-span">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              ${featuredPost.readTime}
            </span>
          </div>
          <h2 class="hero-title"><a href="#/post/${featuredPost.slug}">${featuredPost.title}</a></h2>
          <p class="hero-excerpt">${featuredPost.excerpt}</p>
          <a href="#/post/${featuredPost.slug}" class="btn-primary">Read More</a>
        </div>
      </section>
      <h3 style="margin-bottom:24px; font-size:1.6rem; border-bottom: 1px solid var(--color-border); padding-bottom:12px;">Latest Travel Stories</h3>
    `;
  }
  
  // Render Post Grid List
  if (filtered.length > 0) {
    html += `<div class="posts-grid">`;
    filtered.forEach(post => {
      // If we render featured post above, skip it in the list to avoid duplicate
      if (post.id === featuredPost?.id && state.activeCategory === 'All' && state.searchQuery === '') {
        return;
      }
      const deleteBtn = state.currentUser?.isAdmin ? `<button class="post-delete-btn-overlay" data-id="${post.id}">Delete</button>` : '';
      const videoPlayBadge = post.type === 'video' ? `
        <div class="video-play-badge" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(212, 175, 55, 0.95); width:50px; height:50px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; pointer-events:none; box-shadow:0 6px 20px rgba(0,0,0,0.3); transition:var(--transition-smooth); z-index:2;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" style="margin-left:3px;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
      ` : '';
      html += `
        <article class="post-card" style="position:relative;">
          <div class="card-image-wrap">
            <span class="card-category-tag">${post.category}</span>
            ${deleteBtn}
            ${videoPlayBadge}
            <a href="#/post/${post.slug}">
              <img src="${post.coverImage}" alt="${post.title}" loading="lazy">
            </a>
          </div>
          <div class="card-content">
            <div class="post-meta">
              <span class="post-meta-span">${post.date}</span>
              <span class="post-meta-span">${post.readTime}</span>
            </div>
            <h3 class="card-title"><a href="#/post/${post.slug}">${post.title}</a></h3>
            <p class="card-excerpt">${post.excerpt}</p>
            <div class="card-footer">
              <a href="#/post/${post.slug}" class="read-more-link">
                Read Story
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
              </a>
            </div>
          </div>
        </article>
      `;
    });
    html += `</div>`;
  } else {
    // Empty Search Result State
    html += `
      <div class="empty-state">
        <h3>No journeys found</h3>
        <p>We couldn't find any travel stories matching your search query. Try looking for keywords like "Rome", "Paris", or "Coast".</p>
      </div>
    `;
  }

  DOM.mainContent.innerHTML = html;

  // Bind Admin Delete buttons
  const deleteBtns = DOM.mainContent.querySelectorAll('.post-delete-btn-overlay');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const id = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this blog post?')) {
        deletePost(id);
      }
    });
  });

  // Bind Events for filters and search
  const filterBtns = DOM.mainContent.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      state.activeCategory = e.target.getAttribute('data-cat');
      renderHomeView();
    });
  });

  const searchInput = DOM.mainContent.querySelector('#search-input');
  if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
      state.searchQuery = e.target.value;
      // Re-render only grid/search view dynamically to avoid losing focus
      renderHomeView();
      // Refocus input
      const newInput = document.getElementById('search-input');
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    });
  }
}

// Helper to extract YouTube video embed URL
function getYoutubeEmbedUrl(url) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 12) {
    // Some channels or short URLs have 12 chars
    return `https://www.youtube.com/embed/${match[2]}`;
  } else if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return url;
}

// ----------------------------------------------------
// Post Detail Rendering
// ----------------------------------------------------
function renderPostDetailView(slug) {
  const post = state.posts.find(p => p.slug === slug);
  if (!post) {
    renderNotFoundView();
    return;
  }

  // Load Comments from localStorage
  const storageKey = `comments_post_${post.id}`;
  let comments = JSON.parse(localStorage.getItem(storageKey)) || [];

  // Generate paragraphs html
  const paragraphsHtml = post.content.map(p => `<p>${p}</p>`).join('');

  // Generate gallery html
  let galleryHtml = '';
  if (post.gallery && post.gallery.length > 0) {
    galleryHtml = `
      <div class="detail-gallery">
        <h4 class="gallery-title">Moments from the Trip</h4>
        <div class="gallery-grid">
          ${post.gallery.map(imgUrl => `<img src="${imgUrl}" alt="Gallery photo of ${post.title}" loading="lazy" class="gallery-img-preview">`).join('')}
        </div>
      </div>
    `;
  }

  // Generate comments items html
  let commentsListHtml = '';
  if (comments.length > 0) {
    commentsListHtml = comments.map(c => `
      <div class="comment-item">
        <div class="comment-meta">
          <span class="comment-author">${escapeHTML(c.name)}</span>
          <span class="comment-date">${c.date}</span>
        </div>
        <p class="comment-text">${escapeHTML(c.text)}</p>
      </div>
    `).join('');
  } else {
    commentsListHtml = `<p class="comment-empty" id="comments-empty-message">No comments yet. Be the first to share your thoughts!</p>`;
  }

  // Related Posts recommendations (Same category, excluding current post)
  const related = state.posts
    .filter(p => p.category === post.category && p.id !== post.id)
    .slice(0, 2);

  let relatedHtml = '';
  if (related.length > 0) {
    relatedHtml = `
      <div style="border-top:1px solid var(--color-border); padding-top:40px; margin-top:40px;">
        <h4 style="font-size:1.3rem; margin-bottom:20px;">More from ${post.category}</h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:24px;">
          ${related.map(r => `
            <div style="background:var(--color-bg-site); border-radius:8px; overflow:hidden; border:1px solid var(--color-border); display:flex; flex-direction:column;">
              <img src="${r.coverImage}" alt="${r.title}" style="width:100%; height:140px; object-fit:cover;">
              <div style="padding:16px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                <h5 style="font-size:1rem; margin-bottom:8px; line-height:1.3;"><a href="#/post/${r.slug}" style="color:var(--color-text-main);">${r.title}</a></h5>
                <a href="#/post/${r.slug}" style="font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Read Post →</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const adminRow = state.currentUser?.isAdmin ? `
    <div class="detail-header-delete-row" style="margin-bottom: 24px;">
      <button class="btn-action-small btn-action-delete" id="btn-delete-detail" data-id="${post.id}" style="padding: 10px 16px; font-size: 0.85rem;">Delete This Post</button>
    </div>
  ` : '';

  let mediaHtml = `<img src="${post.coverImage}" alt="${post.title}" class="detail-cover">`;
  if (post.type === 'video' && post.videoUrl) {
    const embedUrl = getYoutubeEmbedUrl(post.videoUrl);
    mediaHtml = `
      <div class="video-container" style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:12px; margin-bottom:32px; box-shadow:0 10px 30px rgba(0,0,0,0.15); background:#000;">
        <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;"></iframe>
      </div>
    `;
  }

  const html = `
    <article class="post-detail-container">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
        <button class="btn-back" onclick="window.location.hash='#/'" style="margin-bottom:0;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          Back to travel list
        </button>
        ${adminRow}
      </div>

      <div class="detail-header" style="margin-top:24px;">
        <span class="detail-category">${post.category}</span>
        <h1 class="detail-title">${post.title}</h1>
        <div class="post-meta" style="margin-top:12px;">
          <span>By ${post.author}</span>
          <span>&middot;</span>
          <span>${post.date}</span>
          <span>&middot;</span>
          <span>${post.readTime}</span>
        </div>
      </div>

      ${mediaHtml}

      <div class="detail-body">
        ${paragraphsHtml}
      </div>

      ${galleryHtml}
      ${relatedHtml}

      <!-- Comments Area -->
      <section class="comments-section">
        <h3 class="comments-title">Thoughts & Comments (${comments.length})</h3>
        
        <div class="comment-list" id="comment-list">
          ${commentsListHtml}
        </div>

        <form id="comment-form" class="comment-form">
          <h4 class="comment-form-title">Leave a Comment</h4>
          <div class="form-grid">
            <div class="form-group">
              <label for="comment-name">Name</label>
              <input type="text" id="comment-name" class="form-control" placeholder="Your Name" required>
            </div>
            <div class="form-group">
              <label for="comment-email">Email (will not be published)</label>
              <input type="email" id="comment-email" class="form-control" placeholder="Your Email" required>
            </div>
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label for="comment-text">Comment</label>
            <textarea id="comment-text" class="form-control" placeholder="Write your comment here..." required></textarea>
          </div>
          <button type="submit" class="btn-primary">Submit Comment</button>
        </form>
      </section>
    </article>
  `;

  DOM.mainContent.innerHTML = html;

  // Bind Admin Delete button
  const deleteBtn = DOM.mainContent.querySelector('#btn-delete-detail');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this blog post?')) {
        deletePost(id);
      }
    });
  }

  // Bind comment form submit
  const commentForm = DOM.mainContent.querySelector('#comment-form');
  if (commentForm) {
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameVal = DOM.mainContent.querySelector('#comment-name').value;
      const textVal = DOM.mainContent.querySelector('#comment-text').value;
      
      const newComment = {
        name: nameVal,
        text: textVal,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      };

      comments.push(newComment);
      localStorage.setItem(storageKey, JSON.stringify(comments));

      // Append comment instantly and clear form
      const commentListEl = DOM.mainContent.querySelector('#comment-list');
      const emptyMsgEl = DOM.mainContent.querySelector('#comments-empty-message');
      
      if (emptyMsgEl) {
        emptyMsgEl.remove();
      }

      const commentEl = document.createElement('div');
      commentEl.className = 'comment-item';
      commentEl.innerHTML = `
        <div class="comment-meta">
          <span class="comment-author">${escapeHTML(newComment.name)}</span>
          <span class="comment-date">${newComment.date}</span>
        </div>
        <p class="comment-text">${escapeHTML(newComment.text)}</p>
      `;
      commentListEl.appendChild(commentEl);
      
      // Update comment count in title
      DOM.mainContent.querySelector('.comments-title').textContent = `Thoughts & Comments (${comments.length})`;

      // Reset form
      commentForm.reset();
    });
  }
}

// ----------------------------------------------------
// About View Rendering
// ----------------------------------------------------
function renderAboutView() {
  const html = `
    <div class="about-view-container">
      <img src="https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&h=450&q=80" alt="Breathtaking landscape" class="about-hero-img">
      
      <h1 class="detail-title">Welcome to Bella Voyage</h1>
      <p style="font-size:1.15rem; color:var(--color-primary); font-family:var(--font-headings); font-style:italic; margin-bottom:24px;">
        "Traveling is a brutality. It forces you to trust strangers and to lose sight of all that familiar comfort of home and friends." — Cesare Pavese
      </p>
      
      <div class="detail-body">
        <p>
          Welcome! I am incredibly excited to share my upcoming itinerary and experiences through Italy and France. These two countries represent the height of cultural heritage, culinary excellence, and natural beauty.
        </p>
        <p>
          This website serves as my digital journal. Here, you will find comprehensive guides to the historic sites of Rome, the romantic canals of Venice, the vibrant cafes of Paris, and the spectacular cliff-clinging coastal roads of the French Riviera.
        </p>
        
        <h3 class="about-section-title">My Planning Philosophy</h3>
        <p>
          Following the travel style of seasoned wandering blogs, I believe that travel is the ultimate form of education. We focus on slow travel, authentic food discoveries, and finding local hidden gems that the typical tour buses overlook.
        </p>

        <div class="about-guide-grid">
          <div class="guide-card">
            <h4>🇮🇹 Italy Itinerary</h4>
            <p>Spending time exploring the history of Rome, the art galleries of Florence, romantic Venice canals, and the stunning Amalfi Coast.</p>
          </div>
          <div class="guide-card">
            <h4>🇫🇷 France Itinerary</h4>
            <p>From the cafes and world-famous museums of Paris to the sunny beach paths and colorful historic quarters of Nice and Eze.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  DOM.mainContent.innerHTML = html;
}

// ----------------------------------------------------
// Contact Page View Rendering
// ----------------------------------------------------
function renderContactView() {
  const html = `
    <div class="contact-view-container">
      <h1 class="detail-title">Get In Touch</h1>
      <p style="color:var(--color-text-muted); margin-bottom:32px;">Have questions about our itineraries, recommendations, or want to collaborate? Fill out the form below and I'll get back to you as soon as possible.</p>
      
      <div class="contact-grid">
        <form id="contact-form" class="comment-form" style="background:var(--color-bg-site);">
          <div class="form-group" style="margin-bottom:16px;">
            <label for="contact-name">Full Name</label>
            <input type="text" id="contact-name" class="form-control" placeholder="Your Name" required>
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label for="contact-email">Email Address</label>
            <input type="email" id="contact-email" class="form-control" placeholder="Your Email" required>
          </div>
          <div class="form-group" style="margin-bottom:20px;">
            <label for="contact-message">Your Message</label>
            <textarea id="contact-message" class="form-control" placeholder="How can I help you?" style="min-height:140px;" required></textarea>
          </div>
          <button type="submit" class="btn-primary" style="width:100%;">Send Message</button>
          <div id="contact-feedback" class="form-feedback" style="text-align:center;"></div>
        </form>

        <div class="contact-details">
          <h3 style="margin-bottom:16px;">Contact Information</h3>
          <p style="color:var(--color-text-muted); margin-bottom:24px;">If you prefer email communication, feel free to drop a message directly. I am often out traveling, but I check my messages frequently!</p>
          
          <div class="contact-item-box">
            <div class="contact-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </div>
            <div class="contact-info">
              <h4>Email</h4>
              <p>hello@bellavoyage.com</p>
            </div>
          </div>

          <div class="contact-item-box">
            <div class="contact-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            </div>
            <div class="contact-info">
              <h4>Base Location</h4>
              <p>Rome, Italy / Paris, France</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  DOM.mainContent.innerHTML = html;

  const contactForm = DOM.mainContent.querySelector('#contact-form');
  const feedback = DOM.mainContent.querySelector('#contact-feedback');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      feedback.className = 'form-feedback success';
      feedback.textContent = 'Thank you! Your message has been sent successfully. I will get back to you soon.';
      contactForm.reset();
    });
  }
}

// ----------------------------------------------------
// Authentication Widget & Flow
// ----------------------------------------------------
function renderAuthWidgets() {
  const user = state.currentUser;
  
  const getHtml = (isMobile) => {
    if (user) {
      const emailEscaped = escapeHTML(user.email);
      const adminSpan = user.isAdmin ? `<span class="admin-badge">Admin</span>` : '';
      const adminLink = user.isAdmin ? `<a href="#/admin" style="font-weight:700; margin-right:16px; font-size:0.85rem; text-transform:uppercase; color:var(--color-secondary);">Dashboard</a>` : '';
      
      if (isMobile) {
        return `
          <div style="display:flex; flex-direction:column; gap:12px;">
            <span class="auth-user-email" style="justify-content:center;">${emailEscaped} ${adminSpan}</span>
            ${user.isAdmin ? `<a href="#/admin" class="btn-readmore-link" style="text-align:center; margin-bottom:4px;">Admin Dashboard</a>` : ''}
            <button class="btn-auth btn-auth-logout" id="btn-logout-mobile" style="width:100%;">Logout</button>
          </div>
        `;
      } else {
        return `
          <span class="auth-user-email">${emailEscaped} ${adminSpan}</span>
          ${adminLink}
          <button class="btn-auth btn-auth-logout" id="btn-logout-desktop">Logout</button>
        `;
      }
    } else {
      if (isMobile) {
        return `<a href="#/login" class="btn-primary" style="display:block; text-align:center; padding:10px 16px;">Login / Sign Up</a>`;
      } else {
        return `<a href="#/login" class="btn-auth btn-auth-login">Login / Sign Up</a>`;
      }
    }
  };

  if (DOM.authStatusDesktop) {
    DOM.authStatusDesktop.innerHTML = getHtml(false);
    const logoutBtn = DOM.authStatusDesktop.querySelector('#btn-logout-desktop');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
  }

  if (DOM.authStatusMobile) {
    DOM.authStatusMobile.innerHTML = getHtml(true);
    const logoutBtn = DOM.authStatusMobile.querySelector('#btn-logout-mobile');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
  }
}

function handleLogout() {
  sessionStorage.removeItem('currentUser');
  state.currentUser = null;
  renderAuthWidgets();
  if (window.location.hash === '#/admin') {
    window.location.hash = '#/';
  } else {
    router();
  }
}

// ----------------------------------------------------
// Login & Signup View Rendering
// ----------------------------------------------------
function renderLoginView() {
  const html = `
    <div class="contact-view-container" style="max-width: 500px; margin: 0 auto;">
      <div class="auth-tabs">
        <button class="auth-tab-btn active" id="tab-login-btn">Login</button>
        <button class="auth-tab-btn" id="tab-signup-btn">Sign Up</button>
      </div>

      <!-- Login Form -->
      <form id="login-form" class="comment-form" style="background:var(--color-bg-site);">
        <h2 class="comment-form-title" style="font-size:1.5rem; text-align:center; margin-bottom:20px;">Welcome Back</h2>
        <div id="login-alert-area"></div>
        
        <div class="form-group" style="margin-bottom:16px;">
          <label for="login-email">Email Address</label>
          <input type="email" id="login-email" class="form-control" placeholder="email@example.com" required>
        </div>
        <button type="submit" class="btn-primary" style="width:100%;">Login</button>
      </form>

      <!-- Signup Form -->
      <form id="signup-form" class="comment-form" style="background:var(--color-bg-site); display:none;">
        <h2 class="comment-form-title" style="font-size:1.5rem; text-align:center; margin-bottom:20px;">Create Account</h2>
        <div id="signup-alert-area"></div>
        
        <div class="form-group" style="margin-bottom:16px;">
          <label for="signup-name">Display Name</label>
          <input type="text" id="signup-name" class="form-control" placeholder="Your Name" required>
        </div>
        <div class="form-group" style="margin-bottom:16px;">
          <label for="signup-email">Email Address</label>
          <input type="email" id="signup-email" class="form-control" placeholder="email@example.com" required>
        </div>
        <button type="submit" class="btn-primary" style="width:100%;">Sign Up</button>
      </form>
    </div>
  `;
  DOM.mainContent.innerHTML = html;
  const loginForm = DOM.mainContent.querySelector('#login-form');
  const signupForm = DOM.mainContent.querySelector('#signup-form');
  const tabLoginBtn = DOM.mainContent.querySelector('#tab-login-btn');
  const tabSignupBtn = DOM.mainContent.querySelector('#tab-signup-btn');
  const loginAlert = DOM.mainContent.querySelector('#login-alert-area');
  const signupAlert = DOM.mainContent.querySelector('#signup-alert-area');

  // Tab switcher
  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active');
    tabSignupBtn.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
  });

  tabSignupBtn.addEventListener('click', () => {
    tabSignupBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    signupForm.style.display = 'block';
    loginForm.style.display = 'none';
  });

  // Handle Login Submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailVal = DOM.mainContent.querySelector('#login-email').value.trim();
    
    // Check if account is blocked
    const matchedAccount = state.accounts.find(acc => acc.email.toLowerCase() === emailVal.toLowerCase());
    if (matchedAccount && matchedAccount.blocked) {
      loginAlert.innerHTML = `<div class="blocked-banner">This account has been blocked by the Administrator.</div>`;
      return;
    }

    // Set Session
    const userSession = {
      email: emailVal,
      name: matchedAccount ? matchedAccount.name : emailVal.split('@')[0],
      isAdmin: emailVal.toLowerCase() === 'shiakaten@gmail.com'
    };

    // Save mock session
    sessionStorage.setItem('currentUser', JSON.stringify(userSession));
    state.currentUser = userSession;
    
    // Add to accounts list if not already there
    if (!matchedAccount) {
      state.accounts.push({
        email: emailVal,
        name: userSession.name,
        blocked: false
      });
      localStorage.setItem('accounts', JSON.stringify(state.accounts));
    }

    renderAuthWidgets();
    window.location.hash = '#/';
  });

  // Handle Signup Submit
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameVal = DOM.mainContent.querySelector('#signup-name').value.trim();
    const emailVal = DOM.mainContent.querySelector('#signup-email').value.trim();
    
    // Check if exists
    const exists = state.accounts.some(acc => acc.email.toLowerCase() === emailVal.toLowerCase());
    if (exists) {
      signupAlert.innerHTML = `<div class="blocked-banner" style="background:#FFF3CD; color:#856404; border-color:#FFEEBA;">Account already exists. Try Logging in!</div>`;
      return;
    }

    // Create Account
    const newAcc = { email: emailVal, name: nameVal, blocked: false };
    state.accounts.push(newAcc);
    localStorage.setItem('accounts', JSON.stringify(state.accounts));

    // Sign in automatically
    const userSession = {
      email: emailVal,
      name: nameVal,
      isAdmin: emailVal.toLowerCase() === 'shiakaten@gmail.com'
    };
    sessionStorage.setItem('currentUser', JSON.stringify(userSession));
    state.currentUser = userSession;

    renderAuthWidgets();
    window.location.hash = '#/';
  });
}

// ----------------------------------------------------
// Admin Control Panel View Rendering
// ----------------------------------------------------
function renderAdminView() {
  // Generate Accounts Rows
  const accountRows = state.accounts.map(acc => {
    // Cannot block or delete self (the main admin)
    const isSelf = acc.email.toLowerCase() === 'shiakaten@gmail.com';
    const blockText = acc.blocked ? 'Unblock' : 'Block';
    const blockClass = acc.blocked ? 'btn-action-unblock' : 'btn-action-block';
    
    const actionsHtml = isSelf ? `<span class="admin-badge" style="background:var(--color-secondary-light); color:var(--color-secondary);">Owner (System)</span>` : `
      <button class="btn-action-small ${blockClass}" data-action="toggle-block" data-email="${acc.email}">${blockText}</button>
      <button class="btn-action-small btn-action-delete" data-action="delete-user" data-email="${acc.email}">Delete</button>
    `;

    return `
      <tr>
        <td style="font-weight:600;">${escapeHTML(acc.name)}</td>
        <td>${escapeHTML(acc.email)}</td>
        <td>${acc.blocked ? `<span class="admin-badge" style="background:#F8D7DA; color:#721C24;">Blocked</span>` : `<span class="admin-badge" style="background:#D4EDDA; color:#155724;">Active</span>`}</td>
        <td style="text-align:right;">${actionsHtml}</td>
      </tr>
    `;
  }).join('');

  // Generate Blogs list
  const blogRows = state.posts.map(post => {
    return `
      <tr>
        <td style="font-weight:600; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <a href="#/post/${post.slug}" target="_blank">${escapeHTML(post.title)}</a>
        </td>
        <td>${post.category}</td>
        <td>${post.date}</td>
        <td style="text-align:right;">
          <button class="btn-action-small btn-action-delete" data-action="delete-post" data-id="${post.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <div class="about-view-container admin-dashboard">
      <h1 class="detail-title" style="margin-bottom:8px;">Admin Dashboard</h1>
      <p style="color:var(--color-text-muted); margin-bottom:20px;">Welcome back, Administrator. Control user authentication states, accounts list access parameters, and manage published blog postings.</p>

      <div class="admin-summary-cards">
        <div class="admin-card">
          <h5>Total Blog Posts</h5>
          <div class="admin-card-number">${state.posts.length}</div>
        </div>
        <div class="admin-card alt">
          <h5>Total Accounts</h5>
          <div class="admin-card-number">${state.accounts.length}</div>
        </div>
        <div class="admin-card" style="border-left-color: var(--color-accent);">
          <h5>Blocked Accounts</h5>
          <div class="admin-card-number">${state.accounts.filter(a => a.blocked).length}</div>
        </div>
      </div>

      <!-- Account Management Section -->
      <section class="admin-section">
        <div class="admin-section-header">
          <h3 style="margin-bottom:0;">Account Management</h3>
          <button class="btn-primary" id="btn-add-mock-user" style="padding: 6px 14px; font-size: 0.8rem;">Add Mock User</button>
        </div>
        
        <!-- Add user mini form overlay (hidden by default) -->
        <div id="add-user-form-container" style="display:none; background:var(--color-bg-site); padding:20px; border-radius:6px; border:1px solid var(--color-border); margin-bottom:20px;">
          <h4 style="margin-bottom:12px;">Create New User Account</h4>
          <div class="form-grid" style="margin-bottom:12px;">
            <div class="form-group">
              <label for="admin-add-name">Name</label>
              <input type="text" id="admin-add-name" class="form-control" placeholder="Full Name">
            </div>
            <div class="form-group">
              <label for="admin-add-email">Email</label>
              <input type="email" id="admin-add-email" class="form-control" placeholder="user@gmail.com">
            </div>
          </div>
          <button class="btn-primary" id="btn-admin-submit-user" style="padding:8px 16px; font-size:0.8rem;">Create User</button>
          <button class="btn-auth btn-auth-login" id="btn-admin-cancel-user" style="padding:8px 16px; font-size:0.8rem; margin-left:8px;">Cancel</button>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${accountRows}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Blog Management Section -->
      <section class="admin-section">
        <h3 class="admin-section-header">Blog Posts Management</h3>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Date</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${blogRows}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
  DOM.mainContent.innerHTML = html;

  // Bind Actions
  // Toggle block/unblock user
  DOM.mainContent.querySelectorAll('[data-action="toggle-block"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const email = e.target.getAttribute('data-email');
      const matched = state.accounts.find(a => a.email === email);
      if (matched) {
        matched.blocked = !matched.blocked;
        localStorage.setItem('accounts', JSON.stringify(state.accounts));
        renderAdminView();
      }
    });
  });

  // Delete user account
  DOM.mainContent.querySelectorAll('[data-action="delete-user"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const email = e.target.getAttribute('data-email');
      if (confirm(`Are you sure you want to delete user ${email}?`)) {
        state.accounts = state.accounts.filter(a => a.email !== email);
        localStorage.setItem('accounts', JSON.stringify(state.accounts));
        renderAdminView();
      }
    });
  });

  // Delete blog post
  DOM.mainContent.querySelectorAll('[data-action="delete-post"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      if (confirm('Are you sure you want to delete this blog post?')) {
        deletePost(id);
        renderAdminView(); // Stay on Admin view
      }
    });
  });

  // Add mock user view binders
  const btnShowAdd = DOM.mainContent.querySelector('#btn-add-mock-user');
  const addFormWrap = DOM.mainContent.querySelector('#add-user-form-container');
  const btnCancelUser = DOM.mainContent.querySelector('#btn-admin-cancel-user');
  const btnCreateUser = DOM.mainContent.querySelector('#btn-admin-submit-user');

  btnShowAdd.addEventListener('click', () => {
    addFormWrap.style.display = 'block';
  });
  
  btnCancelUser.addEventListener('click', () => {
    addFormWrap.style.display = 'none';
  });

  btnCreateUser.addEventListener('click', () => {
    const nameVal = DOM.mainContent.querySelector('#admin-add-name').value.trim();
    const emailVal = DOM.mainContent.querySelector('#admin-add-email').value.trim();
    if (nameVal === '' || emailVal === '') return;

    state.accounts.push({
      email: emailVal,
      name: nameVal,
      blocked: false
    });
    localStorage.setItem('accounts', JSON.stringify(state.accounts));
    renderAdminView();
  });
}

// ----------------------------------------------------
// Deletion Helpers
// ----------------------------------------------------
function deletePost(id) {
  // Add to deleted posts index list
  const deletedIds = JSON.parse(localStorage.getItem('deleted_post_ids')) || [];
  deletedIds.push(id);
  // Also push string representation just in case
  deletedIds.push(String(id));
  localStorage.setItem('deleted_post_ids', JSON.stringify(deletedIds));

  // Sync state deletedPostIds list
  state.deletedPostIds = deletedIds;

  // Remove from state list
  state.posts = state.posts.filter(p => p.id !== id && String(p.id) !== String(id) && Number(p.id) !== Number(id));

  // If deleted from custom posts, clean it up there too
  const customPosts = JSON.parse(localStorage.getItem('custom_posts')) || [];
  const filteredCustom = customPosts.filter(p => p.id !== id && String(p.id) !== String(id) && Number(p.id) !== Number(id));
  localStorage.setItem('custom_posts', JSON.stringify(filteredCustom));

  // Redirect back home
  window.location.hash = '#/';
}

// ----------------------------------------------------
// Disclaimer Rendering
// ----------------------------------------------------
function renderDisclaimerView() {
  const html = `
    <div class="disclaimer-container">
      <h1 class="detail-title">Disclaimer & Privacy Policy</h1>
      <p>This travel blog is created for sharing personal itineraries and highlights. The views and opinions expressed on this website are purely those of the author.</p>
      <p>All photos on this website belong to their respective creators via Unsplash open-source licenses, or the blog owner. Please do not reuse photos without explicit permission.</p>
      <p><strong>Privacy:</strong> We respect your privacy. If you sign up for our newsletter, your email address is solely used to send updates and is never shared with third parties.</p>
    </div>
  `;
  DOM.mainContent.innerHTML = html;
}

// ----------------------------------------------------
// Add Blog Post View Rendering
// ----------------------------------------------------
function renderAddPostView() {
  let selectedType = 'picture'; // track active post type: 'picture' | 'video'

  const html = `
    <div class="contact-view-container">
      <h1 class="detail-title">Create a New Travel Post</h1>
      <p style="color:var(--color-text-muted); margin-bottom:32px;">Add your own experience. Once submitted, your post will be immediately visible on the home page list!</p>
      
      <!-- Type Switcher -->
      <div class="auth-tabs" style="margin-bottom: 24px; max-width: 400px;">
        <button class="auth-tab-btn active" id="btn-type-picture" type="button" style="flex:1;">Picture Post</button>
        <button class="auth-tab-btn" id="btn-type-video" type="button" style="flex:1;">Video Post</button>
      </div>

      <form id="add-post-form" class="comment-form" style="background:var(--color-bg-site);">
        <div class="form-grid">
          <div class="form-group">
            <label for="post-title">Post Title</label>
            <input type="text" id="post-title" class="form-control" placeholder="e.g., A Magical Sunset in Provence" required>
          </div>
          <div class="form-group">
            <label for="post-author">Author Name</label>
            <input type="text" id="post-author" class="form-control" placeholder="Your Name" value="${state.currentUser?.name || ''}" required>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label for="post-category">Country/Category</label>
            <select id="post-category" class="form-control" required style="height: 43px; padding-top: 8px; padding-bottom: 8px;">
              <option value="Italy">Italy 🇮🇹</option>
              <option value="France">France 🇫🇷</option>
            </select>
          </div>
          <div class="form-group">
            <label for="post-readtime">Read Time Estimate</label>
            <input type="text" id="post-readtime" class="form-control" placeholder="e.g., 4 min read" required>
          </div>
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label for="post-excerpt">Short Summary / Excerpt</label>
          <input type="text" id="post-excerpt" class="form-control" placeholder="Brief 1-2 sentence description of the post..." required>
        </div>

        <!-- Picture Fields -->
        <div id="picture-fields-group" style="margin-bottom:16px;">
          <div class="form-group" style="margin-bottom:16px;">
            <label for="post-cover-file">Choose a photo from your files</label>
            <input type="file" id="post-cover-file" class="form-control" accept="image/*" style="padding-top:8px;">
          </div>
          <div style="text-align:center; margin:12px 0; color:var(--color-text-muted); font-size:0.85rem; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">— OR PASTE URL / USE PRESETS —</div>
          <div class="form-group">
            <label for="post-cover">Cover Image URL</label>
            <input type="url" id="post-cover" class="form-control" placeholder="Paste an Unsplash image URL or select a preset below">
            <div class="cover-presets" style="margin-top: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              <div class="preset-option" style="cursor: pointer; border-radius: 6px; overflow: hidden; border: 2px solid transparent; transition: var(--transition-smooth);" data-url="https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80">
                <img src="https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=80&h=60&q=80" alt="Paris Seine" style="width:100%; display:block; object-fit:cover; height:60px;">
              </div>
              <div class="preset-option" style="cursor: pointer; border-radius: 6px; overflow: hidden; border: 2px solid transparent; transition: var(--transition-smooth);" data-url="https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80">
                <img src="https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=80&h=60&q=80" alt="Cinque Terre" style="width:100%; display:block; object-fit:cover; height:60px;">
              </div>
              <div class="preset-option" style="cursor: pointer; border-radius: 6px; overflow: hidden; border: 2px solid transparent; transition: var(--transition-smooth);" data-url="https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80">
                <img src="https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=80&h=60&q=80" alt="Rome Colosseum" style="width:100%; display:block; object-fit:cover; height:60px;">
              </div>
              <div class="preset-option" style="cursor: pointer; border-radius: 6px; overflow: hidden; border: 2px solid transparent; transition: var(--transition-smooth);" data-url="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80">
                <img src="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=80&h=60&q=80" alt="Nice Riviera" style="width:100%; display:block; object-fit:cover; height:60px;">
              </div>
            </div>
          </div>
        </div>

        <!-- Video Fields -->
        <div id="video-fields-group" style="margin-bottom:16px; display:none;">
          <div class="form-group">
            <label for="post-video">Video URL (YouTube or similar)</label>
            <input type="url" id="post-video" class="form-control" placeholder="e.g., https://www.youtube.com/watch?v=Travelxt-h7p">
          </div>
          <div class="form-group" style="margin-top:12px;">
            <label for="post-video-cover">Video Thumbnail / Cover Image URL (Optional)</label>
            <input type="url" id="post-video-cover" class="form-control" placeholder="Leave blank to auto-detect YouTube thumbnail">
          </div>
        </div>

        <div class="form-group" style="margin-bottom:16px;">
          <label for="post-content">Full Story Content (Use blank lines to separate paragraphs)</label>
          <textarea id="post-content" class="form-control" placeholder="Write your travel story here. Press Enter twice to create new paragraphs..." style="min-height:180px;" required></textarea>
        </div>

        <div class="form-group" style="margin-bottom:24px;">
          <label for="post-tags">Tags (comma separated)</label>
          <input type="text" id="post-tags" class="form-control" placeholder="e.g., Road Trip, Cafes, Summer">
        </div>

        <button type="submit" class="btn-primary" style="width:100%;">Publish Post</button>
      </form>
    </div>
  `;
  DOM.mainContent.innerHTML = html;

  // Toggle Type Logic
  const btnPicture = DOM.mainContent.querySelector('#btn-type-picture');
  const btnVideo = DOM.mainContent.querySelector('#btn-type-video');
  const picFields = DOM.mainContent.querySelector('#picture-fields-group');
  const vidFields = DOM.mainContent.querySelector('#video-fields-group');
  const coverInput = DOM.mainContent.querySelector('#post-cover');
  const fileInput = DOM.mainContent.querySelector('#post-cover-file');
  const videoInput = DOM.mainContent.querySelector('#post-video');

  btnPicture.addEventListener('click', () => {
    selectedType = 'picture';
    btnPicture.classList.add('active');
    btnVideo.classList.remove('active');
    picFields.style.display = 'block';
    vidFields.style.display = 'none';
    videoInput.removeAttribute('required');
  });

  btnVideo.addEventListener('click', () => {
    selectedType = 'video';
    btnVideo.classList.add('active');
    btnPicture.classList.remove('active');
    vidFields.style.display = 'block';
    picFields.style.display = 'none';
    videoInput.setAttribute('required', 'true');
  });

  // Preset Selection Logic
  const presets = DOM.mainContent.querySelectorAll('.preset-option');
  presets.forEach(p => {
    p.addEventListener('click', () => {
      presets.forEach(pr => pr.style.borderColor = 'transparent');
      p.style.borderColor = 'var(--color-primary)';
      coverInput.value = p.getAttribute('data-url');
    });
  });

  // Handle Post Submit
  const postForm = DOM.mainContent.querySelector('#add-post-form');
  if (postForm) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const titleVal = DOM.mainContent.querySelector('#post-title').value;
      const authorVal = DOM.mainContent.querySelector('#post-author').value;
      const categoryVal = DOM.mainContent.querySelector('#post-category').value;
      const readtimeVal = DOM.mainContent.querySelector('#post-readtime').value;
      const excerptVal = DOM.mainContent.querySelector('#post-excerpt').value;
      
      let coverVal = coverInput.value;
      let videoVal = videoInput.value;

      // Validate picture selection: must have either URL or local file
      if (selectedType === 'picture') {
        const hasFile = fileInput && fileInput.files && fileInput.files[0];
        if (!hasFile && !coverVal) {
          alert('Please select a photo from your files or enter a cover image URL!');
          return;
        }
      }

      // Auto-detect YouTube thumbnail if video post has no custom thumbnail
      if (selectedType === 'video') {
        const customThumb = DOM.mainContent.querySelector('#post-video-cover').value;
        if (customThumb) {
          coverVal = customThumb;
        } else {
          // Parse YouTube ID
          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
          const match = videoVal.match(regExp);
          if (match && match[2].length === 11) {
            coverVal = `https://img.youtube.com/vi/${match[2]}/maxresdefault.jpg`;
          } else {
            coverVal = 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80';
          }
        }
      }

      // Save helper function
      const saveAndRedirect = () => {
        // Parse content paragraphs by splitting on empty lines
        const contentRaw = DOM.mainContent.querySelector('#post-content').value;
        const contentParagraphs = contentRaw
          .split(/\n\s*\n/)
          .map(p => p.trim())
          .filter(p => p.length > 0);

        // Parse tags
        const tagsVal = DOM.mainContent.querySelector('#post-tags').value;
        const tagsArray = tagsVal
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);

        const slug = titleVal
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

        const newPost = {
          id: Date.now(),
          type: selectedType,
          title: titleVal,
          slug: slug,
          category: categoryVal,
          tags: tagsArray.length > 0 ? tagsArray : [categoryVal],
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          readTime: readtimeVal,
          author: authorVal,
          featured: false,
          coverImage: coverVal || 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
          videoUrl: selectedType === 'video' ? videoVal : '',
          excerpt: excerptVal,
          content: contentParagraphs,
          gallery: []
        };

        // Retrieve existing custom posts, prepend new post, and save
        const customPosts = JSON.parse(localStorage.getItem('custom_posts')) || [];
        customPosts.unshift(newPost);
        localStorage.setItem('custom_posts', JSON.stringify(customPosts));

        // Prepend to application state active post list
        state.posts.unshift(newPost);

        // Reset and redirect back home
        window.location.hash = '#/';
      };

      // Read local file if chosen
      if (selectedType === 'picture' && fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(evt) {
          coverVal = evt.target.result;
          saveAndRedirect();
        };
        reader.readAsDataURL(file);
      } else {
        saveAndRedirect();
      }
    });
  }
}

// ----------------------------------------------------
// Not Found View
// ----------------------------------------------------
function renderNotFoundView() {
  DOM.mainContent.innerHTML = `
    <div class="empty-state">
      <h1 style="font-size:3rem; color:var(--color-primary);">404</h1>
      <h3>Page Not Found</h3>
      <p>The travel log or page you are looking for has been relocated or doesn't exist.</p>
      <a href="#/" class="btn-primary" style="margin-top:20px; display:inline-block;">Return to Home</a>
    </div>
  `;
}

// ----------------------------------------------------
// Highlights Slider Logic
// ----------------------------------------------------
function initSlider() {
  const container = document.getElementById('spots-slider');
  if (!container) return;

  const slides = container.querySelectorAll('.slide');
  const dots = container.querySelectorAll('.dot');
  const btnPrev = container.querySelector('.prev');
  const btnNext = container.querySelector('.next');
  let slideInterval;

  const showSlide = (index) => {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    state.activeSlide = (index + slides.length) % slides.length;
    slides[state.activeSlide].classList.add('active');
    dots[state.activeSlide].classList.add('active');
  };

  const nextSlide = () => {
    showSlide(state.activeSlide + 1);
  };

  const prevSlide = () => {
    showSlide(state.activeSlide - 1);
  };

  // Button triggers
  btnNext.addEventListener('click', () => {
    nextSlide();
    resetAutoPlay();
  });

  btnPrev.addEventListener('click', () => {
    prevSlide();
    resetAutoPlay();
  });

  // Dots triggers
  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      showSlide(idx);
      resetAutoPlay();
    });
  });

  // Auto play
  const startAutoPlay = () => {
    slideInterval = setInterval(nextSlide, 5000);
  };

  const resetAutoPlay = () => {
    clearInterval(slideInterval);
    startAutoPlay();
  };

  startAutoPlay();
}

// ----------------------------------------------------
// Auxiliary Actions (Newsletter, Quotes, Drawer)
// ----------------------------------------------------
function handleNewsletterSubmit(e) {
  e.preventDefault();
  const email = DOM.newsletterEmail.value.trim();
  if (email === '') return;

  DOM.newsletterMsg.className = 'form-feedback success';
  DOM.newsletterMsg.textContent = 'Grazie! You have successfully subscribed to our newsletter.';
  DOM.newsletterEmail.value = '';
}

function rotateQuote() {
  if (!DOM.quoteText || !DOM.quoteAuthor) return;
  const randomIndex = Math.floor(Math.random() * state.quotes.length);
  const q = state.quotes[randomIndex];
  DOM.quoteText.textContent = `"${q.text}"`;
  DOM.quoteAuthor.textContent = `— ${q.author}`;
}

function toggleDrawer() {
  DOM.mobileDrawer.classList.toggle('active');
  DOM.drawerOverlay.classList.toggle('active');
}

function closeDrawer() {
  DOM.mobileDrawer.classList.remove('active');
  DOM.drawerOverlay.classList.remove('active');
}

// Helpers
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
