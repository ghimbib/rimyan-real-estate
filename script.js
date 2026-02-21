document.addEventListener('DOMContentLoaded', () => {

  // Mobile nav toggle
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.classList.toggle('active');
    });
    // Close menu on link click
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.classList.remove('active');
      });
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Mobile sticky CTA — show after scrolling past hero
  const mobileCta = document.getElementById('mobileCta');
  const hero = document.getElementById('hero');
  if (mobileCta && hero) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        mobileCta.style.transform = entry.isIntersecting ? 'translateY(100%)' : 'translateY(0)';
      },
      { threshold: 0.1 }
    );
    mobileCta.style.transition = 'transform 0.3s ease';
    mobileCta.style.transform = 'translateY(100%)';
    observer.observe(hero);
  }

  // Contact form — AJAX submission via formsubmit.co
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const btn = document.getElementById('submitBtn');
      const successEl = document.getElementById('formSuccess');
      const errorEl = document.getElementById('formError');

      // Reset states
      successEl.style.display = 'none';
      errorEl.style.display = 'none';
      btn.textContent = 'Sending...';
      btn.disabled = true;

      // Collect form data
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Add timestamp
      data._subject = `Rimyan.com Contact: ${data.name} — ${data.interest || 'General'}`;
      data._template = 'table';
      data.submitted_at = new Date().toLocaleString('en-US', { timeZone: 'America/Denver' }) + ' MST';

      try {
        const res = await fetch('https://formsubmit.co/ajax/info@rimyan.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        });

        if (res.ok) {
          successEl.style.display = 'block';
          form.reset();
          // Scroll success into view
          successEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
          throw new Error('Server error');
        }
      } catch (err) {
        errorEl.style.display = 'block';
        errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } finally {
        btn.textContent = 'Send Message';
        btn.disabled = false;
      }
    });
  }

  // Nav background on scroll
  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.style.background = window.scrollY > 50
        ? 'rgba(10, 37, 64, 0.98)'
        : 'rgba(10, 37, 64, 0.95)';
    }, { passive: true });
  }

});
