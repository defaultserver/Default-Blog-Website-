/**
 * Sage Stores — Interactive Application Engine
 * Handles Theme Toggle, Search, Filtering, Reader Drawer, Bookmarks & Toasts
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let currentCategory = 'all';
  let searchQuery = '';
  let bookmarkedIds = JSON.parse(localStorage.getItem('sage_bookmarks') || '[]');

  // UI Element References
  const postsGrid = document.getElementById('postsGrid');
  const featuredPostContainer = document.getElementById('featuredPostContainer');
  const categoriesList = document.getElementById('categoriesList');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const searchOpenBtn = document.getElementById('searchOpenBtn');
  const searchModalOverlay = document.getElementById('searchModalOverlay');
  const searchModalClose = document.getElementById('searchModalClose');
  const searchModalInput = document.getElementById('searchModalInput');
  const searchResultsList = document.getElementById('searchResultsList');
  
  const postReaderOverlay = document.getElementById('postReaderOverlay');
  const readerCloseBtn = document.getElementById('readerCloseBtn');
  const readerContent = document.getElementById('readerContent');
  const progressBar = document.getElementById('progressBar');
  const toastContainer = document.getElementById('toastContainer');
  const newsletterForm = document.getElementById('newsletterForm');

  // --- Theme Management ---
  const initTheme = () => {
    const savedTheme = localStorage.getItem('sage_theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  };

  const updateThemeIcon = (theme) => {
    if (!themeToggleBtn) return;
    if (theme === 'dark') {
      themeToggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
      themeToggleBtn.setAttribute('title', 'Switch to Light Mode');
    } else {
      themeToggleBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
      themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
    }
  };

  themeToggleBtn?.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('sage_theme', newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} mode`);
  });

  // --- Toast Notification System ---
  window.showToast = (message, icon = '✓') => {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // --- Render Categories ---
  const renderCategoryChips = () => {
    if (!categoriesList) return;
    const categories = [
      { name: 'All Articles', slug: 'all' },
      { name: 'Tech & Gadgets', slug: 'tech' },
      { name: 'Shopping Guides', slug: 'shopping' },
      { name: 'Store Reviews', slug: 'stores' },
      { name: 'Lifestyle & Home', slug: 'lifestyle' },
      { name: 'Saved Articles', slug: 'saved' }
    ];

    categoriesList.innerHTML = categories.map(cat => `
      <button class="cat-chip ${cat.slug === currentCategory ? 'active' : ''}" data-slug="${cat.slug}">
        ${cat.name}
      </button>
    `).join('');

    categoriesList.querySelectorAll('.cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategory = btn.dataset.slug;
        renderCategoryChips();
        renderPosts();
      });
    });
  };

  // --- Render Featured Post ---
  const renderFeaturedPost = () => {
    if (!featuredPostContainer || POSTS_DATA.length === 0) return;
    const featured = POSTS_DATA[0]; // First item as hero
    const isBookmarked = bookmarkedIds.includes(featured.id);

    featuredPostContainer.innerHTML = `
      <article class="featured-card">
        <div class="featured-media" style="background-image: url('${featured.image}')">
          <span class="featured-badge">${featured.badge || 'Featured'}</span>
        </div>
        <div class="featured-content">
          <div class="post-meta-row">
            <span class="cat-label-tag">${featured.category}</span>
            <span>•</span>
            <span>${featured.date}</span>
            <span>•</span>
            <span>${featured.readTime}</span>
          </div>
          <h2 class="featured-title">
            <a href="javascript:void(0)" onclick="openPostReader('${featured.id}')">${featured.title}</a>
          </h2>
          <p class="featured-excerpt">${featured.excerpt}</p>
          <div class="author-row">
            <div class="author-info">
              <div class="author-avatar">${featured.author.avatar}</div>
              <div>
                <div class="author-name">${featured.author.name}</div>
                <div class="author-role">${featured.author.role}</div>
              </div>
            </div>
            <button class="read-btn" onclick="openPostReader('${featured.id}')">
              Read Article <span>→</span>
            </button>
          </div>
        </div>
      </article>
    `;
  };

  // --- Render Posts Grid ---
  const renderPosts = () => {
    if (!postsGrid) return;
    
    let filtered = POSTS_DATA;

    if (currentCategory === 'saved') {
      filtered = POSTS_DATA.filter(p => bookmarkedIds.includes(p.id));
    } else if (currentCategory !== 'all') {
      filtered = POSTS_DATA.filter(p => p.catSlug === currentCategory);
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.excerpt.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      postsGrid.innerHTML = `
        <div class="no-results fade-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <h3>No articles found</h3>
          <p>Try clearing your search or picking a different category tab.</p>
        </div>
      `;
      return;
    }

    postsGrid.innerHTML = filtered.map(post => {
      const isBookmarked = bookmarkedIds.includes(post.id);
      return `
        <article class="article-card fade-in" onclick="openPostReader('${post.id}')">
          <div class="card-thumb" style="background-image: url('${post.image}')">
            <span class="card-cat">${post.category}</span>
            <button class="card-bookmark-btn ${isBookmarked ? 'active' : ''}" 
                    onclick="toggleBookmark(event, '${post.id}')" 
                    title="${isBookmarked ? 'Remove Bookmark' : 'Bookmark Article'}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
          <div class="card-body">
            <h3 class="card-title">${post.title}</h3>
            <p class="card-excerpt">${post.excerpt}</p>
            <div class="card-footer">
              <span>${post.date}</span>
              <span>${post.readTime}</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  };

  // --- Bookmark Toggle ---
  window.toggleBookmark = (e, postId) => {
    e.stopPropagation();
    if (bookmarkedIds.includes(postId)) {
      bookmarkedIds = bookmarkedIds.filter(id => id !== postId);
      showToast('Article removed from bookmarks', '🔖');
    } else {
      bookmarkedIds.push(postId);
      showToast('Article saved to bookmarks!', '🔖');
    }
    localStorage.setItem('sage_bookmarks', JSON.stringify(bookmarkedIds));
    renderPosts();
    renderFeaturedPost();
  };

  // --- Search Modal Engine ---
  searchOpenBtn?.addEventListener('click', () => {
    searchModalOverlay?.classList.add('active');
    setTimeout(() => searchModalInput?.focus(), 100);
  });

  searchModalClose?.addEventListener('click', () => {
    searchModalOverlay?.classList.remove('active');
  });

  searchModalOverlay?.addEventListener('click', (e) => {
    if (e.target === searchModalOverlay) {
      searchModalOverlay.classList.remove('active');
    }
  });

  searchModalInput?.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) {
      searchResultsList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1.5rem;">Start typing to search articles...</p>';
      return;
    }

    const matches = POSTS_DATA.filter(p => 
      p.title.toLowerCase().includes(val) || 
      p.excerpt.toLowerCase().includes(val)
    );

    if (matches.length === 0) {
      searchResultsList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:1.5rem;">No matching articles found.</p>';
      return;
    }

    searchResultsList.innerHTML = matches.map(p => `
      <div class="search-result-item" onclick="openPostReader('${p.id}'); closeSearchModal();">
        <h4>${p.title}</h4>
        <p>${p.excerpt.substring(0, 90)}...</p>
      </div>
    `).join('');
  });

  window.closeSearchModal = () => {
    searchModalOverlay?.classList.remove('active');
  };

  // --- Reader Overlay & Navigation ---
  window.openPostReader = (postId) => {
    const post = POSTS_DATA.find(p => p.id === postId);
    if (!post || !postReaderOverlay || !readerContent) return;

    window.location.hash = `#/post/${post.slug}`;
    const isBookmarked = bookmarkedIds.includes(post.id);

    readerContent.innerHTML = `
      <div class="article-hero">
        <span class="article-cat-badge">${post.category}</span>
        <h1 class="article-main-title">${post.title}</h1>
        <p style="font-size: 1.15rem; color: var(--text-secondary); margin-bottom: 1.5rem;">${post.subtitle || ''}</p>
        
        <div class="article-author-bar">
          <div class="author-info">
            <div class="author-avatar">${post.author.avatar}</div>
            <div>
              <div class="author-name">${post.author.name}</div>
              <div class="author-role">${post.author.role} • ${post.date}</div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <button class="nav-btn" onclick="toggleBookmark(event, '${post.id}')" title="Bookmark Article">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            <button class="nav-btn" onclick="shareArticle('${post.title}', '${window.location.href}')" title="Share Article">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
          </div>
        </div>

        <img src="${post.image}" alt="${post.title}" class="article-banner-img" />
      </div>

      <div class="article-content">
        ${post.content}
      </div>

      <div class="newsletter-card" style="margin-top: 4rem;">
        <h3>Enjoyed this article?</h3>
        <p>Subscribe to Sage Stores to receive our weekly intelligent store reviews and exclusive deal teardowns directly in your inbox.</p>
        <form class="newsletter-form" onsubmit="handleNewsletterSubmit(event)">
          <input type="email" class="newsletter-input" placeholder="Enter your email..." required />
          <button type="submit" class="btn-primary">Join Free</button>
        </form>
      </div>
    `;

    postReaderOverlay.classList.add('active');
    postReaderOverlay.scrollTop = 0;
  };

  readerCloseBtn?.addEventListener('click', () => {
    postReaderOverlay?.classList.remove('active');
    window.location.hash = '';
  });

  // --- Article Share ---
  window.shareArticle = (title, url) => {
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      showToast('Article link copied to clipboard!', '📋');
    }
  };

  // --- Scroll Progress Bar ---
  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    if (progressBar) progressBar.style.width = scrolled + '%';
  });

  postReaderOverlay?.addEventListener('scroll', () => {
    const winScroll = postReaderOverlay.scrollTop;
    const height = postReaderOverlay.scrollHeight - postReaderOverlay.clientHeight;
    const scrolled = (winScroll / height) * 100;
    if (progressBar) progressBar.style.width = scrolled + '%';
  });

  // --- Newsletter Handler ---
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Thank you for subscribing to Sage Stores!', '🎉');
    newsletterForm.reset();
  });

  window.handleNewsletterSubmit = (e) => {
    e.preventDefault();
    showToast('Thank you for subscribing to Sage Stores!', '🎉');
    e.target.reset();
  };

  // --- Hash Route Navigation Support ---
  const handleHashChange = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/post/')) {
      const slug = hash.replace('#/post/', '');
      const post = POSTS_DATA.find(p => p.slug === slug || p.id === slug);
      if (post) openPostReader(post.id);
    } else {
      postReaderOverlay?.classList.remove('active');
    }
  };

  window.addEventListener('hashchange', handleHashChange);

  // Initialize App
  initTheme();
  renderCategoryChips();
  renderFeaturedPost();
  renderPosts();
  handleHashChange();
});
