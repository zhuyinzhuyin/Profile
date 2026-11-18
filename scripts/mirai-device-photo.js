{
	const scene = document.querySelector(".mirai-device-scene");
	const photo = scene.querySelector(".mirai-device-photo");
	const parsePoints = (points) => points.split(" ").map((point) => point.split(",").map(Number));
	const screens = [...scene.querySelectorAll(".mirai-screen-window")].map((window) => ({
		window,
		image: window.querySelector("img"),
		corners: parsePoints(window.dataset.corners),
		frame: parsePoints(window.dataset.frame),
	}));
	const cards = [...scene.querySelectorAll(".mirai-ui-card")].map((element) => ({
		element,
		placement: parsePoints(element.dataset.placement),
		material: element.querySelector(".mirai-glass-material"),
		glassCorners: parsePoints(element.dataset.glassCorners),
	}));

	// Project the source rectangle onto the four corners of the photographed screen.
	function projectScreen([[x0, y0], [x1, y1], [x2, y2], [x3, y3]], width, height) {
		const dx1 = x1 - x2;
		const dx2 = x3 - x2;
		const dx3 = x0 - x1 + x2 - x3;
		const dy1 = y1 - y2;
		const dy2 = y3 - y2;
		const dy3 = y0 - y1 + y2 - y3;
		const determinant = dx1 * dy2 - dx2 * dy1;
		const g = (dx3 * dy2 - dx2 * dy3) / determinant;
		const h = (dx1 * dy3 - dx3 * dy1) / determinant;
		return [
			(x1 - x0 + g * x1) / width, (y1 - y0 + g * y1) / width, 0, g / width,
			(x3 - x0 + h * x3) / height, (y3 - y0 + h * y3) / height, 0, h / height,
			0, 0, 1, 0,
			x0, y0, 0, 1,
		];
	}

	function projectPoint([x, y], matrix) {
		const point = new DOMPoint(x, y).matrixTransform(matrix);
		return [point.x / point.w, point.y / point.w];
	}

	function photoMask(frame) {
		return `polygon(${frame.map(([x, y]) =>
			`${x / photo.naturalWidth * 100}% ${y / photo.naturalHeight * 100}%`
		).join(",")})`;
	}

	function alignCards(scale) {
		// Lay out both cards as rectangles on the same projected plane as the monitor.
		const desktop = screens[0];
		const monitorWidth = desktop.image.width;
		const monitorHeight = desktop.image.height;
		if (!monitorWidth || !monitorHeight) return;
		const monitor = new DOMMatrix(projectScreen(desktop.corners, monitorWidth, monitorHeight));
		const inverseMonitor = monitor.inverse();

		for (const { element, placement, material, glassCorners } of cards) {
			const [[left, top], [right, bottom]] = placement.map(
				(point) => projectPoint(point, inverseMonitor),
			);
			const target = [[left, top], [right, top], [right, bottom], [left, bottom]]
				.map((point) => projectPoint(point, monitor))
				.map(([x, y]) => [x * scale, y * scale]);
			const width = element.offsetWidth;
			const height = width * (bottom - top) / (right - left);
			element.style.height = `${height}px`;
			material.style.transform = new DOMMatrix(projectScreen(glassCorners, width, height)).inverse().toString();
			element.style.transform = `matrix3d(${projectScreen(target, width, height).join(",")})`;
			element.style.visibility = "visible";
		}
	}

	function alignScreens() {
		if (!photo.naturalWidth || !photo.clientWidth) return;
		const scale = photo.clientWidth / photo.naturalWidth;

		for (const { window, image, corners, frame } of screens) {
			if (!image.naturalWidth || !image.offsetHeight) continue;
			const projected = corners.map(([x, y]) => [x * scale, y * scale]);
			const matrix = projectScreen(projected, image.offsetWidth, image.offsetHeight);
			window.style.clipPath = photoMask(frame);
			image.style.transform = `matrix3d(${matrix.join(",")})`;
			window.style.visibility = "visible";
		}
		alignCards(scale);
	}

	photo.addEventListener("load", alignScreens);
	for (const { image } of screens) image.addEventListener("load", alignScreens);
	new ResizeObserver(alignScreens).observe(photo);
}
