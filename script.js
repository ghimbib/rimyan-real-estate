const MATRIX_IDX_URL = 'https://ppmls.mlsmatrix.com/Matrix/public/IDX.aspx?idx=1d51306';

const RIMYAN_CONFIG = {
  leadEmail: 'bibek@rimyan.com',
  phoneDisplay: '281-910-8744',
  phoneHref: 'tel:+12819108744',
  connectors: {
    // Paste the dedicated Matrix "Search" Activation URL here once that IDX config exists.
    idxAdvancedSearch: MATRIX_IDX_URL,
    // Paste the dedicated Matrix "Map Search" Activation URL here once that IDX config exists.
    idxMapSearch: MATRIX_IDX_URL,
    // Paste the dedicated Matrix "My Listings" Activation URL here once that IDX config exists.
    idxMyListings: '',
    // Backward-compatible alias for older featured-listing connector naming.
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
  hydrateIdxConnectors();

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
      if (el.dataset.context) setLeadContext(el.dataset.context);
      if (el.dataset.interest) prefillContact({ interest: el.dataset.interest });
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (selector === '#contact') focusContactHeading();
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
      const location = data.get('location') || 'Colorado Springs area';
      const beds = data.get('beds');
      const price = data.get('price');
      const type = data.get('type');
      const filters = data.getAll('filters');
      const context = [
        `Buyer search: ${location}`,
        (beds && beds !== 'Any') ? `${beds} beds` : '',
        (price && !/Any/.test(price)) ? price : '',
        (type && !/All/.test(type)) ? type : '',
        filters.length ? `Filters: ${filters.join(', ')}` : ''
      ].filter(Boolean).join(' · ');
      setLeadContext(context);
      prefillContact({ interest: 'Buying', message: 'Search request — ' + context });
      const listings = document.getElementById('listings');
      if (RIMYAN_CONFIG.connectors.idxMapSearch && listings) {
        showToast('Live MLS search is loaded below. If a home jumps out, send it to me and I’ll give you the read.');
        listings.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      showToast('Got it. Add your contact details below and I’ll send matching homes worth your time.');
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      focusContactHeading();
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
      showToast('Got it. Confirm below and I’ll send back a real pricing read — comps, competition, and net.');
      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
      focusContactHeading();
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

  function closeMobileNav() {
    if (!links || !toggle) return;
    links.classList.remove('open');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function focusContactHeading() {
    const h = document.querySelector('#contact h2');
    if (h) window.setTimeout(() => h.focus({ preventScroll: true }), 480);
  }

  function hydrateContactConfig() {
    const emailLink = document.getElementById('emailLink');
    if (emailLink) {
      emailLink.href = `mailto:${RIMYAN_CONFIG.leadEmail}`;
      const value = emailLink.querySelector('.val');
      if (value) value.textContent = RIMYAN_CONFIG.leadEmail;
    }

    const phoneLink = document.getElementById('phoneLink');
    if (phoneLink) {
      phoneLink.href = RIMYAN_CONFIG.phoneHref;
      const value = phoneLink.querySelector('.val');
      if (value) value.textContent = RIMYAN_CONFIG.phoneDisplay;
    }
    const mobilePhoneLink = document.getElementById('mobilePhoneLink');
    if (mobilePhoneLink) mobilePhoneLink.href = RIMYAN_CONFIG.phoneHref;
  }

  function hydrateIdxConnectors() {
    const connectors = RIMYAN_CONFIG.connectors;
    const mapUrl = connectors.idxMapSearch || connectors.idxAdvancedSearch;
    const searchUrl = connectors.idxAdvancedSearch || connectors.idxMapSearch;
    const listingsUrl = connectors.idxMyListings || connectors.featuredListings;
    const idxFrame = document.getElementById('idxMapFrame');
    const idxLink = document.getElementById('idxMapLink');
    const searchLink = document.getElementById('idxSearchLink');
    const listingsLink = document.getElementById('idxListingsLink');
    const idxTitle = document.getElementById('idxToolTitle');
    const idxStatus = document.getElementById('idxToolStatus');

    setExternalLink(idxLink, mapUrl);
    setExternalLink(searchLink, searchUrl);

    if (idxFrame && mapUrl) idxFrame.src = mapUrl;
    if (idxStatus) idxStatus.textContent = getMapStatus(mapUrl, searchUrl);

    if (listingsLink) {
      if (listingsUrl) {
        setExternalLink(listingsLink, listingsUrl);
        listingsLink.textContent = 'My Listings';
        listingsLink.dataset.context = '';
        listingsLink.dataset.interest = '';
        listingsLink.removeAttribute('data-scroll');
      } else {
        listingsLink.href = '#contact';
        listingsLink.removeAttribute('target');
        listingsLink.removeAttribute('rel');
        listingsLink.dataset.scroll = '#contact';
        listingsLink.dataset.context = "IDX: wants Bibek's current listings";
        listingsLink.dataset.interest = 'Buying';
      }
    }

    document.querySelectorAll('[data-idx-tool="map"]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!idxFrame || !mapUrl) return;
        idxFrame.src = mapUrl;
        if (idxTitle) idxTitle.textContent = 'Interactive map search';
        if (idxStatus) idxStatus.textContent = getMapStatus(mapUrl, searchUrl);
        document.querySelectorAll('[data-idx-tool]').forEach((el) => el.setAttribute('aria-pressed', 'false'));
        button.setAttribute('aria-pressed', 'true');
      });
    });
  }

  function setExternalLink(link, url) {
    if (!link || !url) return;
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }

  function getMapStatus(mapUrl, searchUrl) {
    return mapUrl && searchUrl && mapUrl !== searchUrl ? 'Dedicated Matrix map search' : 'Live Matrix IDX';
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
