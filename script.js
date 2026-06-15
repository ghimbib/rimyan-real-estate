const RIMYAN_CONFIG = {
  leadEmail: 'bibek@rimyan.com',
  // TODO: replace this with the dedicated Google Voice / Google Workspace number before production.
  phoneDisplay: '281-910-8744',
  phoneHref: 'tel:+12819108744',
  connectors: {
    idxAdvancedSearch: '',
    idxMapSearch: '',
    featuredListings: '',
    valuation: '',
    marketReports: '',
    crmLeadWebhook: ''
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  const mobileCta = document.getElementById('mobileCta');
  const toast = document.getElementById('toast');
  const sourceContext = document.getElementById('sourceContext');

  hydrateContactConfig();

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', String(open));
    });

    links.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => closeMobileNav());
    });
  }

  document.querySelectorAll('a[href^="#"], button[data-scroll]').forEach((el) => {
    el.addEventListener('click', (event) => {
      const selector = el.getAttribute('href') || el.dataset.scroll;
      if (!selector || selector === '#') return;
      const target = document.querySelector(selector);
      if (!target) return;
      event.preventDefault();
      closeMobileNav();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  window.addEventListener('scroll', () => {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 24);
    if (mobileCta) mobileCta.classList.toggle('visible', window.scrollY > 520);
  }, { passive: true });

  const propertySearchForm = document.getElementById('propertySearchForm');
  if (propertySearchForm) {
    propertySearchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(propertySearchForm);
      const location = data.get('location') || 'Front Range';
      const filters = data.getAll('filters');
      const context = [
        `Buyer search request: ${location}`,
        data.get('minPrice') ? `Min ${data.get('minPrice')}` : '',
        data.get('maxPrice') ? `Max ${data.get('maxPrice')}` : '',
        filters.length ? `Filters: ${filters.join(', ')}` : ''
      ].filter(Boolean).join(' | ');
      setLeadContext(context);
      showToast('Search shell captured. IDX connector is pending, so this routes into the contact form for now.');
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const valuationForm = document.getElementById('valuationForm');
  if (valuationForm) {
    valuationForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(valuationForm);
      const address = data.get('address') || 'Address not provided';
      const email = data.get('email') || 'Email not provided';
      setLeadContext(`Seller valuation request: ${address} | Email: ${email}`);
      prefillContact({ email, interest: 'Selling', message: `I would like a home valuation for: ${address}` });
      showToast('Valuation connector pending. I moved this into the contact form so it can still convert.');
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', () => {
      const name = contactForm.querySelector('[name="name"]')?.value || 'Rimyan lead';
      const interest = contactForm.querySelector('[name="interest"]')?.value || 'General';
      const subject = contactForm.querySelector('[name="_subject"]');
      if (subject) subject.value = `Rimyan lead: ${name} — ${interest}`;
      const submit = document.getElementById('submitBtn');
      if (submit) {
        submit.textContent = 'Sending...';
        submit.disabled = true;
      }
    });
  }

  document.querySelectorAll('[data-connector]').forEach((el) => {
    el.addEventListener('click', () => {
      const name = el.dataset.connector;
      if (name) showToast(`Connector slot ready: ${name}. Add provider snippet/API target when available.`);
    });
  });

  function closeMobileNav() {
    if (!links || !toggle) return;
    links.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function hydrateContactConfig() {
    const emailLink = document.getElementById('emailLink');
    if (emailLink) {
      emailLink.textContent = RIMYAN_CONFIG.leadEmail;
      emailLink.href = `mailto:${RIMYAN_CONFIG.leadEmail}`;
    }
    const phoneLink = document.getElementById('phoneLink');
    if (phoneLink) {
      phoneLink.textContent = `Call/Text ${RIMYAN_CONFIG.phoneDisplay}`;
      phoneLink.href = RIMYAN_CONFIG.phoneHref;
    }
  }

  function setLeadContext(value) {
    if (sourceContext) sourceContext.value = value;
  }

  function prefillContact({ email, interest, message }) {
    const form = document.getElementById('contactForm');
    if (!form) return;
    if (email && email !== 'Email not provided') form.querySelector('[name="email"]').value = email;
    if (interest) form.querySelector('[name="interest"]').value = interest;
    if (message) form.querySelector('[name="message"]').value = message;
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove('visible'), 4200);
  }
});
