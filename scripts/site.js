(() => {
	const mobile = window.matchMedia('(max-width: 767px)');
	const navigation = document.querySelector('.nav');
	const toggle = navigation?.querySelector('.nav_toggle');
	const links = navigation?.querySelector('#primary-navigation');

	const setMenuOpen = (open, restoreFocus = false) => {
		if (!toggle) return;
		const isOpen = mobile.matches && open;
		navigation.classList.toggle('menu_open', isOpen);
		document.body.classList.toggle('mobile_menu_open', isOpen);
		toggle.setAttribute('aria-expanded', String(isOpen));
		toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
		if (links) links.inert = mobile.matches && !isOpen;
		if (restoreFocus) toggle.focus();
	};

	toggle?.addEventListener('click', () => {
		setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
	});
	links?.addEventListener('click', (event) => {
		if (mobile.matches && event.target.closest('a')) setMenuOpen(false, true);
	});
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') {
			setMenuOpen(false, true);
		}
	});
	document.addEventListener('click', (event) => {
		if (navigation && !navigation.contains(event.target)) setMenuOpen(false);
	});
	document.addEventListener('focusin', (event) => {
		if (mobile.matches && navigation && !navigation.contains(event.target)) setMenuOpen(false);
	});

	const sectionLinks = [...(links?.querySelectorAll('ul a') ?? [])];
	const sections = sectionLinks.map((link) => {
		const hash = new URL(link.href).hash;
		return { link, section: hash ? document.getElementById(hash.slice(1)) : null };
	}).filter(({ section }) => section);
	const updateCurrentSection = () => {
		let current = sections.length ? null : sectionLinks[0];
		for (const { link, section } of sections) {
			if (section.getBoundingClientRect().top <= window.innerHeight * 0.4) current = link;
		}
		sectionLinks.forEach((link) => {
			if (link === current) link.setAttribute('aria-current', 'location');
			else link.removeAttribute('aria-current');
		});
	};
	let sectionUpdatePending = false;
	window.addEventListener('scroll', () => {
		if (sectionUpdatePending || !mobile.matches) return;
		sectionUpdatePending = true;
		requestAnimationFrame(() => {
			updateCurrentSection();
			sectionUpdatePending = false;
		});
	}, { passive: true });

	const gallery = document.querySelector('.logo_gallery');
	const rail = gallery?.querySelector('.logo_list');
	const cards = [...(rail?.querySelectorAll('.logo_item') ?? [])];
	const previous = gallery?.querySelector('[data-logo-prev]');
	const next = gallery?.querySelector('[data-logo-next]');
	let logoIndex = 0;
	const updateGallery = () => {
		if (!rail || !mobile.matches || !cards.length) return;
		const firstOffset = cards[0].offsetLeft;
		let nearest = 0;
		cards.forEach((card, index) => {
			if (Math.abs(card.offsetLeft - firstOffset - rail.scrollLeft) < Math.abs(cards[nearest].offsetLeft - firstOffset - rail.scrollLeft)) nearest = index;
		});
		const changed = nearest !== logoIndex;
		logoIndex = nearest;
		gallery.querySelector('[data-logo-position]').textContent = String(logoIndex + 1).padStart(2, '0');
		gallery.style.setProperty('--gallery-progress', `${(logoIndex + 1) / cards.length * 100}%`);
		previous.disabled = logoIndex === 0;
		next.disabled = logoIndex === cards.length - 1;
		if (changed) gallery.querySelector('[data-logo-announcement]').textContent = `Logo ${logoIndex + 1} of ${cards.length}: ${cards[logoIndex].querySelector('img').alt}`;
	};
	const showLogo = (index) => {
		if (!rail) return;
		const target = Math.max(0, Math.min(cards.length - 1, index));
		rail.scrollTo({ left: cards[target].offsetLeft - cards[0].offsetLeft, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
	};
	previous?.addEventListener('click', () => showLogo(logoIndex - 1));
	next?.addEventListener('click', () => showLogo(logoIndex + 1));
	rail?.addEventListener('scroll', updateGallery, { passive: true });
	rail?.addEventListener('keydown', (event) => {
		if (!mobile.matches || event.target !== rail) return;
		const target = { ArrowLeft: logoIndex - 1, ArrowRight: logoIndex + 1, Home: 0, End: cards.length - 1 }[event.key];
		if (target === undefined) return;
		event.preventDefault();
		showLogo(target);
	});
	window.addEventListener('resize', () => {
		updateGallery();
		updateCurrentSection();
	});

	// These revisions apply only to mobile; retain the existing desktop footer.
	const updateMobileLayout = () => {
		setMenuOpen(false);
		if (rail) rail.tabIndex = mobile.matches ? 0 : -1;
		updateGallery();
		updateCurrentSection();
		document.querySelectorAll('[data-copyright-year]').forEach((element) => {
			const start = Number(element.dataset.startYear);
			const current = Math.max(start, new Date().getFullYear());
			element.textContent = mobile.matches && current > start ? `${start} - ${current}` : String(start);
		});
	};
	mobile.addEventListener('change', updateMobileLayout);
	updateMobileLayout();
})();
