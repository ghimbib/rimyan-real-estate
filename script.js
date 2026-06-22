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

  // Contact form — native POST to formsubmit.co with client-side validation
  const form = document.getElementById('contactForm');
  if (form) {
    // Set dynamic subject line before submit
    form.addEventListener('submit', function () {
      const name = form.querySelector('[name="name"]').value;
      const interest = form.querySelector('[name="interest"]').value;
      const subjectField = form.querySelector('[name="_subject"]');
      if (subjectField && name) {
        subjectField.value = 'Rimyan.com Contact: ' + name + ' — ' + (interest || 'General');
      }
      // Show sending state (form will navigate away)
      const btn = document.getElementById('submitBtn');
      btn.textContent = 'Sending...';
      btn.disabled = true;
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

  // Scroll reveal — fade/slide elements in as they enter the viewport
  const revealEls = document.querySelectorAll('.reveal');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (revealEls.length && 'IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // small stagger for groups revealing together
          entry.target.style.transitionDelay = (Math.min(i, 4) * 60) + 'ms';
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: show everything
    revealEls.forEach(el => el.classList.add('in-view'));
  }

});
