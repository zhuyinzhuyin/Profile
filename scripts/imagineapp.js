{
	const scene = document.querySelector('.imagine-workspace-scene');
	if (scene) {
		const frame = scene.querySelector('.imagine-workspace-frame');
		const screen = scene.querySelector('.imagine-workspace-screen');
		const corners = scene.dataset.screenCorners.split(' ').map(point => point.split(',').map(Number));
		const workspace = scene.closest('.imagine-workspace');
		const guide = workspace.querySelector('.imagine-workspace-guide');
		const source = scene.querySelector('.imagine-workspace-music-anchor');
		const flowEntry = workspace.querySelector('.imagine-task-flow > li:first-child .imagine-task-icon');
		const flowExit = workspace.querySelector('.imagine-task-flow > li:last-child');
		const flowCopy = workspace.querySelectorAll('.imagine-task-flow-section > h2, .imagine-task-flow-intro');
		const destination = workspace.querySelector('.imagine-campaign-display');
		const campaignTitle = workspace.querySelector('.imagine-campaign-title');
		const performer = workspace.querySelector('.imagine-campaign-performer');
		const newStorySource = workspace.querySelector('.imagine-new-story-anchor');
		const newStoryStep = workspace.querySelector('.imagine-story-step');
		const newStoryDisplay = workspace.querySelector('.imagine-story-display');
		const keyframeStates = workspace.querySelector('.imagine-keyframe-states');
		const directionDisplay = workspace.querySelector('.imagine-direction-display');
		const scriptsDisplay = workspace.querySelector('.imagine-scripts-display');
		const keyframesDisplay = workspace.querySelector('.imagine-keyframes-display');
		const clipsDisplay = workspace.querySelector('.imagine-clips-display');
		const finalDisplay = workspace.querySelector('.imagine-final-display');
		const frostedSurfaces = [];
		for (const [selector, backdrop] of [
			['.imagine-keyframe-states > li', destination],
			['.imagine-style-examples > li', directionDisplay],
			['.imagine-keyframe-dialog', keyframesDisplay],
			['.imagine-upscale-dialog', finalDisplay],
		]) {
			if (!backdrop) continue;
			for (const host of workspace.querySelectorAll(selector)) {
				const layer = document.createElement('div');
				layer.className = 'imagine-frosted-backdrop';
				layer.setAttribute('aria-hidden', 'true');
				const copy = backdrop.cloneNode(true);
				copy.classList.add('imagine-frosted-source');
				copy.removeAttribute('id');
				copy.querySelectorAll('.imagine-frosted-backdrop, [aria-hidden="true"]').forEach(node => node.remove());
				copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
				copy.querySelectorAll('img').forEach(img => { img.alt = ''; img.loading = 'eager'; });
				layer.append(copy);
				host.prepend(layer);
				host.classList.add('imagine-frosted-host');
				frostedSurfaces.push({ host, backdrop, copy });
			}
		}

		function alignFrostedSurfaces() {
			for (const { host, backdrop, copy } of frostedSurfaces) {
				const hostRect = host.getBoundingClientRect();
				const sourceRect = backdrop.getBoundingClientRect();
				Object.assign(copy.style, {
					left: `${sourceRect.left - hostRect.left - host.clientLeft}px`,
					top: `${sourceRect.top - hostRect.top - host.clientTop}px`,
					width: `${sourceRect.width}px`,
					height: `${sourceRect.height}px`,
				});
			}
		}

		// Same four-corner screen projection used by the Mirai Nexus device showcase.
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

		function roundedRoute(points, radius, startInset) {
			points = points.filter((point, index) => index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1]);
			const [first, second] = points;
			const firstLength = Math.hypot(second[0] - first[0], second[1] - first[1]);
			let route = `M ${first[0] + (second[0] - first[0]) * startInset / firstLength} ${first[1] + (second[1] - first[1]) * startInset / firstLength}`;
			for (let index = 1; index < points.length - 1; index++) {
				const [previous, corner, next] = points.slice(index - 1, index + 2);
				const before = Math.hypot(corner[0] - previous[0], corner[1] - previous[1]);
				const after = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
				const curve = Math.min(radius, before / 2, after / 2);
				route += ` L ${corner[0] - (corner[0] - previous[0]) * curve / before} ${corner[1] - (corner[1] - previous[1]) * curve / before}`;
				route += ` Q ${corner[0]} ${corner[1]} ${corner[0] + (next[0] - corner[0]) * curve / after} ${corner[1] + (next[1] - corner[1]) * curve / after}`;
			}
			return `${route} L ${points.at(-1).join(' ')}`;
		}

		function drawGuide(prefix, points, scale) {
			const stroke = Math.max(1.25, 2 * scale);
			const startRadius = Math.max(2.5, 5 * scale);
			const endRadius = Math.max(2, 4 * scale);
			const line = guide.querySelector(`.${prefix}-line`);
			const startCircle = guide.querySelector(`.${prefix}-start`);
			const endCircle = guide.querySelector(`.${prefix}-end`);
			line.setAttribute('d', roundedRoute(points, Math.max(4, 12 * scale), startRadius));
			line.setAttribute('stroke-width', stroke);
			line.setAttribute('stroke-dasharray', `${Math.max(3, 6 * scale)} ${Math.max(3, 5 * scale)}`);
			startCircle.setAttribute('cx', points[0][0]);
			startCircle.setAttribute('cy', points[0][1]);
			startCircle.setAttribute('r', startRadius);
			startCircle.setAttribute('stroke-width', stroke);
			endCircle.setAttribute('cx', points.at(-1)[0]);
			endCircle.setAttribute('cy', points.at(-1)[1]);
			endCircle.setAttribute('r', endRadius);
		}

		function alignGuide() {
			if (!guide || !source || !flowEntry || !flowExit || !destination || !campaignTitle || !performer || !scene.hasAttribute('data-projected')) return;
			const bounds = workspace.getBoundingClientRect();
			const start = source.getBoundingClientRect();
			const entry = flowEntry.getBoundingClientRect();
			const exit = flowExit.getBoundingClientRect();
			const end = destination.getBoundingClientRect();
			const title = campaignTitle.getBoundingClientRect();
			const scale = window.innerWidth / 1440;
			const narrow = window.matchMedia('(width < 48rem)').matches;
			const x0 = start.left - bounds.left;
			const y0 = start.top - bounds.top;
			const entryX = entry.left + entry.width / 2 - bounds.left;
			const entryY = entry.top - bounds.top;
			const clearance = Math.max(6, 12 * scale);
			const copyLeft = Math.min(...Array.from(flowCopy, element => {
				const range = document.createRange();
				range.selectNodeContents(element);
				return range.getBoundingClientRect().left - bounds.left;
			}));
			const inputLane = narrow ? Math.min(entryX, x0 - clearance, copyLeft - clearance) : entryX;
			const inputPoints = [[x0, y0], [inputLane, y0]];
			if (inputLane < entryX) {
				const inputBend = entryY - Math.max(12, 24 * scale);
				inputPoints.push([inputLane, inputBend], [entryX, inputBend]);
			}
			inputPoints.push([entryX, entryY]);
			guide.setAttribute('viewBox', `0 0 ${workspace.clientWidth} ${workspace.clientHeight}`);
			drawGuide('imagine-workspace-guide', inputPoints, scale);

			const exitX = exit.left + exit.width * (narrow ? 0.5 : 0.14) - bounds.left;
			const exitY = exit.bottom - bounds.top;
			const endX = narrow ? end.left + end.width * 0.87 - bounds.left : exitX;
			const endY = end.top - bounds.top;
			// Keep a straight desktop connection; phones retain the outer detour.
			const laneX = Math.max(exitX, title.right - bounds.left + clearance);
			const bendY = endY - Math.max(12, 12 * scale);
			const points = [[exitX, exitY]];
			if (laneX > exitX) {
				const upperBend = exitY + (title.top - bounds.top - exitY) / 2;
				points.push([exitX, upperBend], [laneX, upperBend]);
			}
			points.push([laneX, bendY], [endX, bendY], [endX, endY]);
			const outputPoints = narrow ? points : [
				[exitX, exitY],
				[endX, endY],
			];
			drawGuide('imagine-workspace-output', outputPoints, scale);

			if (newStorySource && newStoryStep && newStoryDisplay) {
				const storyStart = newStorySource.getBoundingClientRect();
				const storyScreen = newStoryDisplay.getBoundingClientRect();
				const sourceX = storyStart.left - bounds.left;
				const sourceY = storyStart.top - bounds.top;
				const monitor = newStoryDisplay.classList.contains('imagine-story-monitor');
				const targetX = narrow
					? storyScreen.left + storyScreen.width / 2 - bounds.left
					: storyScreen.left + (monitor ? storyScreen.width * 95 / 1536 : 0) - bounds.left;
				const bezelTop = monitor ? storyScreen.height * (narrow ? 53 / 1024 : 0.095) : 0;
				const targetY = storyScreen.top + bezelTop - bounds.top;
				const storyPoints = [[sourceX, sourceY]];
				if (!narrow) {
					storyPoints.push([sourceX, targetY], [targetX, targetY]);
				} else {
					const lane = sourceX + Math.max(12, 48 * scale);
					const states = keyframeStates?.getBoundingClientRect();
					const copy = newStoryStep.querySelector('.imagine-story-copy')?.getBoundingClientRect();
					const outsideX = Math.min(lane, copy ? copy.left - clearance - bounds.left : lane, states ? states.left - clearance - bounds.left : lane);
					const turnY = copy && copy.bottom - bounds.top < targetY
						? copy.bottom - bounds.top + clearance
						: targetY - Math.max(24, 48 * scale);
					storyPoints.push([lane, sourceY]);
					if (states && lane + bounds.left > states.left && lane + bounds.left < states.right) {
						// On phones the state cards stack below the workspace; pass to their left.
						const detourY = (end.bottom + states.top) / 2 - bounds.top;
						storyPoints.push([lane, detourY], [outsideX, detourY]);
					} else {
						storyPoints.push([outsideX, sourceY]);
					}
					storyPoints.push([outsideX, turnY], [targetX, turnY], [targetX, targetY]);
				}
				drawGuide('imagine-workspace-story', storyPoints, scale);
			}

			// Screens share one center axis; compact layouts put supporting panels in the flow.
			const wideSequence = window.matchMedia('(width >= 64rem)').matches;
			const centerX = bounds.width / 2;
			for (const [prefix, display, actionSelector] of [
				['imagine-workspace-story-copy', newStoryDisplay, '.imagine-story-next-anchor'],
				['imagine-workspace-direction-copy', directionDisplay, '.imagine-direction-create-anchor'],
				['imagine-workspace-script-copy', scriptsDisplay, '.imagine-scripts-create-anchor'],
				['imagine-workspace-keyframes-copy', keyframesDisplay, '.imagine-keyframes-create-anchor'],
				['imagine-workspace-clips-copy', clipsDisplay, '.imagine-clips-finalize-anchor'],
			]) {
				if (!display) continue;
				const section = display.closest('section');
				const copyElement = section.querySelector('.imagine-step-copy');
				if (!copyElement) continue;
				const copy = copyElement.getBoundingClientRect();
				const action = wideSequence && actionSelector ? section.querySelector(actionSelector)?.getBoundingClientRect() : null;
				const visual = (wideSequence ? display : copyElement.previousElementSibling).getBoundingClientRect();
				const startX = action ? action.left - bounds.left : centerX;
				const audio = !wideSequence && display === newStoryDisplay
					? section.querySelector('.imagine-story-audio-detail')?.getBoundingClientRect() : null;
				const startY = (action ? action.top : Math.max(visual.bottom, audio?.bottom ?? visual.bottom)) - bounds.top;
				const points = [[startX, startY]];
				if (Math.abs(startX - centerX) > 1) points.push([centerX, startY]);
				points.push([centerX, copy.top - bounds.top - clearance * 2]);
				drawGuide(prefix, points, scale);
			}
			for (const [prefix, previous, next] of [
				['imagine-workspace-direction', newStoryDisplay, directionDisplay],
				['imagine-workspace-scripts', directionDisplay, scriptsDisplay],
				['imagine-workspace-keyframes', scriptsDisplay, keyframesDisplay],
				['imagine-workspace-clips', keyframesDisplay, clipsDisplay],
				['imagine-workspace-final', clipsDisplay, finalDisplay],
			]) {
				if (!previous || !next) continue;
				const from = previous.closest('section').getBoundingClientRect();
				const to = next.getBoundingClientRect();
				drawGuide(prefix, [[centerX, from.bottom - bounds.top + clearance * 2], [centerX, to.top - bounds.top]], scale);
			}

			guide.setAttribute('data-aligned', '');
			alignFrostedSurfaces();
		}

		function alignScreen() {
			if (!frame.naturalWidth || !scene.clientWidth) return;
			const scale = scene.clientWidth / frame.naturalWidth;
			const projected = corners.map(([x, y]) => [x * scale, y * scale]);
			scene.setAttribute('data-projected', '');
			// Use the actual viewport dimensions so CSS cropping and projection share one ratio.
			screen.style.transform = `matrix3d(${projectScreen(projected, screen.offsetWidth, screen.offsetHeight).join(',')})`;
			alignGuide();
		}

		frame.addEventListener('load', alignScreen);
		new ResizeObserver(alignScreen).observe(scene);
		new ResizeObserver(alignGuide).observe(workspace);
		workspace.querySelectorAll('img').forEach(image => image.addEventListener('load', alignGuide));
		window.addEventListener('resize', alignGuide);
		document.fonts.ready.then(alignGuide);
		alignScreen();
	}
}

// Blur the user-flow image beneath the overlapping design-system panel.
{
	const stage = document.querySelector('#workflow');
	const background = stage?.querySelector('.imagine-user-flow-panel');
	const panel = stage?.querySelector('.imagine-design-system-panel');
	if (background && panel) {
		const layer = document.createElement('div');
		layer.className = 'imagine-frosted-backdrop';
		layer.setAttribute('aria-hidden', 'true');
		const copy = background.cloneNode(true);
		copy.classList.add('imagine-frosted-source');
		copy.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
		copy.querySelectorAll('img').forEach(img => { img.alt = ''; img.loading = 'eager'; });
		layer.append(copy);
		panel.prepend(layer);
		panel.classList.add('imagine-frosted-host');
		const alignBackdrop = () => {
			const sourceRect = background.getBoundingClientRect();
			const hostRect = panel.getBoundingClientRect();
			Object.assign(copy.style, {
				left: `${sourceRect.left - hostRect.left - panel.clientLeft}px`,
				top: `${sourceRect.top - hostRect.top - panel.clientTop}px`,
				width: `${sourceRect.width}px`,
				height: `${sourceRect.height}px`,
			});
		};
		new ResizeObserver(alignBackdrop).observe(stage);
		stage.querySelectorAll('img').forEach(img => img.addEventListener('load', alignBackdrop));
		window.addEventListener('resize', alignBackdrop);
		document.fonts.ready.then(alignBackdrop);
		alignBackdrop();
	}
}
