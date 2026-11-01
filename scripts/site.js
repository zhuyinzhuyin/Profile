(() => {
	const mobile = window.matchMedia('(max-width: 767px)');
	const navigation = document.querySelector('.nav');
	const toggle = navigation?.querySelector('.nav_toggle');
	const links = navigation?.querySelector('#primary-navigation');

	const setMenuOpen = (open, restoreFocus = false) => {
		if (!toggle) return;
		navigation.classList.toggle('menu_open', open);
		toggle.setAttribute('aria-expanded', String(open));
		toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
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

	// These revisions apply only to mobile; retain the existing desktop footer.
	const updateMobileLayout = () => {
		setMenuOpen(false);
		document.querySelectorAll('[data-copyright-year]').forEach((element) => {
			const start = Number(element.dataset.startYear);
			const current = Math.max(start, new Date().getFullYear());
			element.textContent = mobile.matches && current > start ? `${start} - ${current}` : String(start);
		});
	};
	mobile.addEventListener('change', updateMobileLayout);
	updateMobileLayout();
})();
