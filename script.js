// Strengthened reveal + fallback + anchor spacing helper
document.addEventListener('DOMContentLoaded', () => {
  // 1️⃣ แจ้งให้ CSS รู้ว่า JS ทำงาน
  document.documentElement.classList.add('js');

  // 2️⃣ Reveal-on-scroll (พร้อม fallback)
  const targets = document.querySelectorAll('.reveal-on-scroll');

  if (!('IntersectionObserver' in window)) {
    // fallback สำหรับ browser เก่า เช่น IE / early Android
    targets.forEach(el => el.classList.add('is-visible'));
    return;
  }

  // IntersectionObserver config: trigger เร็วกว่าปกติเล็กน้อย
  const io = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.2,              // 20% พอให้รู้ว่าเข้ามาในจอแล้ว
      rootMargin: '0px 0px -10% 0px' // เริ่ม reveal ก่อนพ้นจอล่างนิดหนึ่ง
    }
  );

  // ใช้ CSS variable สำหรับ delay แบบ smooth และ staggered
  targets.forEach((el, i) => {
    el.style.setProperty('--animation-order', i);
    io.observe(el);
  });

  // 3️⃣ Dynamic scroll-margin (กัน header ทับ anchor)
  // This function calculates the correct top offset for anchor links
  // to prevent content from being hidden by fixed navigation elements.
  const header = document.querySelector('header');
  if (header) {
    const updateScrollOffset = () => {
      const isMobileView = window.matchMedia('(max-width: 768px)').matches;
      let topOffset = 0;

      if (!isMobileView) {
        // On desktop, the offset is the height of the sticky header.
        topOffset = header.offsetHeight;
      }
      // On mobile, the top header is hidden, so no top offset is needed.
      // The bottom offset is handled by `scroll-padding-bottom` in CSS.
      document.documentElement.style.setProperty('--scroll-offset', `${topOffset}px`);
    };

    updateScrollOffset();
    window.addEventListener('scroll', updateScrollOffset, { passive: true }); // Update on scroll as well
    window.addEventListener('resize', updateScrollOffset);
  }

  // Shrinking Header on Scroll (Desktop)
  const desktopHeader = document.querySelector('header');
  if (desktopHeader) {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        desktopHeader.classList.add('scrolled');
      } else {
        desktopHeader.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  // SPA-style Mobile Navigation
  const mobileNavLinks = document.querySelectorAll('#mobile-nav a');
  const pages = document.querySelectorAll('.page');
  let isMobileSPAMode = false;

  const setupSPAMode = () => {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    if (isMobile && !isMobileSPAMode) {
      // --- ENTER SPA MODE ---
      isMobileSPAMode = true;
      document.body.classList.add('spa-mode');

      const lastActivePageId = sessionStorage.getItem('activePageId') || 'hero';

      pages.forEach(page => {
        const isActive = page.id === lastActivePageId;
        page.classList.toggle('active', isActive);
        page.setAttribute('aria-hidden', String(!isActive));
        page.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      mobileNavLinks.forEach(link => {
        link.classList.toggle('active', link.hash === `#${lastActivePageId}`);
        link.addEventListener('click', handleNavClick);
      });

    } else if (!isMobile && isMobileSPAMode) {
      // --- EXIT SPA MODE ---
      isMobileSPAMode = false;
      document.body.classList.remove('spa-mode');
      pages.forEach(page => {
        page.classList.remove('active');
        page.removeAttribute('aria-hidden');
        page.removeAttribute('tabindex');
      });
      mobileNavLinks.forEach(link => {
        link.removeEventListener('click', handleNavClick);
      });
    }
  };

  const handleNavClick = (e) => {
    e.preventDefault();
    const targetId = e.currentTarget.hash.substring(1);
    const targetPage = document.getElementById(targetId);

    if (!targetPage || targetPage.classList.contains('active')) {
      return; // Do nothing if target doesn't exist or is already active
    }

    // Hide all pages and update accessibility
    pages.forEach(page => {
      page.classList.remove('active');
      page.setAttribute('aria-hidden', 'true');
      page.setAttribute('tabindex', '-1');
    });

    // Show the target page
    targetPage.classList.add('active');
    targetPage.setAttribute('aria-hidden', 'false');
    targetPage.setAttribute('tabindex', '0');

    // Update nav links
    mobileNavLinks.forEach(link => link.classList.remove('active'));
    e.currentTarget.classList.add('active');

    sessionStorage.setItem('activePageId', targetId);
  };

  setupSPAMode();
  window.addEventListener('resize', setupSPAMode);

  // 5️⃣ Course Carousel (Desktop arrows, Mobile swipe)
  const courseCarousel = document.querySelector('.course-carousel');
  if (courseCarousel) {
    const courseTrack = courseCarousel.querySelector('.course-track');
    const prevBtn = courseCarousel.querySelector('.carousel-btn.prev');
    const nextBtn = courseCarousel.querySelector('.carousel-btn.next');

    const updateCarouselButtons = (forceUpdate = false) => {
      if (!prevBtn || !nextBtn || !courseTrack) return;

      // Performance: Only update if the carousel is visible or if forced (e.g., on resize)
      if (!forceUpdate && courseCarousel.offsetParent === null) {
        return;
      }

      const isMobileView = window.matchMedia('(max-width: 768px)').matches;

      // Toggle button visibility based on viewport
      prevBtn.style.display = isMobileView ? 'none' : 'flex';
      nextBtn.style.display = isMobileView ? 'none' : 'flex';

      if (isMobileView) {
        return; // No need to calculate disabled state on mobile
      }

      // Disable prev button if at the start
      prevBtn.disabled = courseTrack.scrollLeft < 1;

      // Disable next button if at the end
      // Allow a small tolerance for floating point inaccuracies
      const scrollEnd = courseTrack.scrollWidth - courseTrack.clientWidth; // Maximum scroll position
      nextBtn.disabled = courseTrack.scrollLeft >= scrollEnd - 2; // Use a slightly larger tolerance
    };

    const scrollCarousel = (direction) => {
      if (!courseTrack) return;

      // On desktop, scroll by one "page" (the visible width of the track)
      const scrollAmount = courseTrack.clientWidth;

      courseTrack.scrollBy({ left: direction === 'next' ? scrollAmount : -scrollAmount, behavior: 'smooth' });
    };

    const handleKeyDown = (e) => {
      const isMobileView = window.matchMedia('(max-width: 768px)').matches;
      if (isMobileView) return; // Don't interfere with mobile

      if (e.key === 'ArrowRight') {
        e.preventDefault(); // Prevent page scroll
        nextBtn.click();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault(); // Prevent page scroll
        prevBtn.click();
      }
    };

    courseCarousel.setAttribute('tabindex', '0'); // Make the carousel focusable
    courseCarousel.addEventListener('keydown', handleKeyDown);

    prevBtn?.addEventListener('click', () => scrollCarousel('prev'));
    nextBtn?.addEventListener('click', () => scrollCarousel('next'));

    // Update buttons on load, resize, and scroll
    window.addEventListener('load', () => updateCarouselButtons(true));
    window.addEventListener('resize', () => updateCarouselButtons(true));
    courseTrack.addEventListener('scroll', updateCarouselButtons, { passive: true });

    // Initial call
    updateCarouselButtons();
  }

  // 4️⃣ Optional: Smooth scroll polyfill สำหรับ iOS Safari เก่า
  // (ถ้าอยากให้รองรับเบราว์เซอร์รุ่นเก่าให้สมบูรณ์)
  if (!('scrollBehavior' in document.documentElement.style)) {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
});
