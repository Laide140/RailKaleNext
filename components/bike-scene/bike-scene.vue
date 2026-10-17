<template>
	<view class="bike-scene">
		<svg
			class="scene-svg"
			viewBox="0 0 240 150"
			xmlns="http://www.w3.org/2000/svg"
			preserveAspectRatio="xMidYMid meet"
		>
			<!-- 地面 -->
			<line x1="10" y1="132" x2="230" y2="132" class="ground" />

			<!-- 滚动的小石头，营造前进感 -->
			<g class="pebbles">
				<circle class="pebble p1" cx="200" cy="128" r="1.6" />
				<circle class="pebble p2" cx="160" cy="130" r="1.2" />
				<circle class="pebble p3" cx="120" cy="129" r="1.5" />
				<circle class="pebble p4" cx="80" cy="131" r="1.1" />
				<circle class="pebble p5" cx="40" cy="128" r="1.4" />
			</g>

			<g class="rig">
				<!-- 后轮 -->
				<g class="wheel wheel-rear">
					<circle class="tyre" cx="88" cy="112" r="19" />
					<circle class="rim" cx="88" cy="112" r="13" />
					<g class="spokes">
						<line x1="88" y1="99" x2="88" y2="125" />
						<line x1="75" y1="112" x2="101" y2="112" />
						<line x1="79" y1="103" x2="97" y2="121" />
						<line x1="97" y1="103" x2="79" y2="121" />
					</g>
				</g>

				<!-- 前轮 -->
				<g class="wheel wheel-front">
					<circle class="tyre" cx="168" cy="112" r="19" />
					<circle class="rim" cx="168" cy="112" r="13" />
					<g class="spokes">
						<line x1="168" y1="99" x2="168" y2="125" />
						<line x1="155" y1="112" x2="181" y2="112" />
						<line x1="159" y1="103" x2="177" y2="121" />
						<line x1="177" y1="103" x2="159" y2="121" />
					</g>
				</g>

				<!-- 车架 -->
				<g class="frame">
					<line x1="88" y1="112" x2="128" y2="86" />
					<line x1="128" y1="86" x2="150" y2="112" />
					<line x1="88" y1="112" x2="140" y2="112" />
					<line x1="140" y1="112" x2="128" y2="86" />
					<line x1="128" y1="86" x2="124" y2="72" />
					<line x1="150" y1="112" x2="126" y2="74" />
				</g>

				<!-- 车把与座垫 -->
				<g class="cocks">
					<path d="M124 72 L132 66 L142 66" class="bar" />
					<line x1="118" y1="74" x2="130" y2="74" class="saddle" />
					<line x1="168" y1="112" x2="146" y2="68" class="fork" />
				</g>

				<!-- 骑手 -->
				<g class="rider">
					<!-- 尾巴 -->
					<path d="M100 62 Q88 60 84 68 Q90 66 96 68 Z" class="tail" />

					<!-- 身体 -->
					<ellipse cx="118" cy="66" rx="22" ry="15" class="body" />

					<!-- 脖子 -->
					<path d="M132 56 Q140 46 144 40" class="neck" />

					<!-- 头 -->
					<circle cx="148" cy="36" r="9" class="head" />

					<!-- 长喙 -->
					<path d="M156 35 Q172 33 178 37 Q170 40 157 40 Z" class="beak" />

					<!-- 眼睛 -->
					<circle cx="151" cy="33" r="1.7" class="eye" />

					<!-- 翅膀（轻微摆动） -->
					<path d="M112 60 Q120 52 132 58 Q124 66 112 64 Z" class="wing" />

					<!-- 蹬车的腿 -->
					<g class="leg">
						<path d="M116 78 Q122 88 128 92" class="leg-line" />
						<circle cx="128" cy="92" r="2.6" class="foot" />
					</g>

					<!-- 扶把的翅尖 -->
					<path d="M136 56 Q142 60 140 66" class="arm" />
				</g>

			</g>

			<!-- 速度线 -->
			<g class="winds">
				<line class="wind w1" x1="30" y1="60" x2="58" y2="60" />
				<line class="wind w2" x1="18" y1="76" x2="52" y2="76" />
				<line class="wind w3" x1="26" y1="92" x2="50" y2="92" />
			</g>
		</svg>
	</view>
</template>

<script>
	/**
	 * 场景动画组件（纯 SVG + CSS 动画，不依赖位图资源）
	 * 供「功能开发中」占位页使用。
	 */
	export default {
		name: 'bike-scene'
	}
</script>

<style lang="scss">
	.bike-scene {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.scene-svg {
		width: 240px;
		height: 150px;
		overflow: visible;
	}

	/* ===== 线条样式：只用主题色与中性色 ===== */
	.ground {
		stroke: var(--separator);
		stroke-width: 1.5;
		stroke-linecap: round;
	}

	.tyre {
		fill: none;
		stroke: var(--theme-text);
		stroke-width: 3.5;
	}
	.rim {
		fill: none;
		stroke: var(--theme-text);
		stroke-width: 1.2;
		opacity: 0.5;
	}
	.spokes line {
		stroke: var(--theme-text);
		stroke-width: 1;
		opacity: 0.45;
	}

	.frame line,
	.cocks line,
	.cocks .bar,
	.cocks .fork {
		stroke: var(--theme-text);
		stroke-width: 2.2;
		stroke-linecap: round;
		fill: none;
	}
	.cocks .saddle { stroke-width: 3; }

	/* ===== 骑手 ===== */
	.body { fill: var(--theme-text); opacity: 0.92; }
	.head { fill: var(--theme-text); }
	.neck {
		stroke: var(--theme-text);
		stroke-width: 7;
		stroke-linecap: round;
		fill: none;
	}
	.beak { fill: var(--theme-fill-strong); stroke: var(--theme-text); stroke-width: 1; }
	.eye { fill: var(--card); }
	.wing {
		fill: var(--theme-text);
		opacity: 0.55;
		transform-box: fill-box;
		transform-origin: 30% 60%;
		animation: wing-flap 0.55s ease-in-out infinite alternate;
	}
	.tail { fill: var(--theme-text); opacity: 0.75; }
	.leg-line {
		stroke: var(--theme-text);
		stroke-width: 3;
		stroke-linecap: round;
		fill: none;
		transform-box: fill-box;
		transform-origin: 0% 0%;
		animation: leg-pump 0.6s ease-in-out infinite alternate;
	}
	.foot {
		fill: var(--theme-text);
		transform-box: fill-box;
		transform-origin: 0% 0%;
		animation: leg-pump 0.6s ease-in-out infinite alternate;
	}
	.arm {
		stroke: var(--theme-text);
		stroke-width: 3;
		stroke-linecap: round;
		fill: none;
	}

	/* ===== 动画 ===== */
	/* 轮子滚动
	 *
	 * 用 fill-box + 50% 50%：以「元素自身包围盒的中心」为旋转中心。
	 * 轮子是一组同心圆，包围盒中心就是圆心，这样不依赖 SVG 用户坐标系，
	 * 各浏览器表现一致。
	 *
	 * 之前用 view-box + 88px/112px 会绕到错误的点，轮子会位移飞出；
	 * 而 fill-box 配用户坐标又会双重解释原点，同样错位。
	 */
	.wheel {
		transform-box: fill-box;
		transform-origin: 50% 50%;
	}
	.wheel-rear {
		animation: spin 0.9s linear infinite;
	}
	.wheel-front {
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	/* 整体轻微上下颠动 */
	.rig {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: bob 0.9s ease-in-out infinite;
	}
	@keyframes bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-1.6px); }
	}

	/* 翅膀扇动 */
	@keyframes wing-flap {
		from { transform: rotate(0deg); }
		to { transform: rotate(-9deg); }
	}

	/* 蹬腿 */
	@keyframes leg-pump {
		from { transform: rotate(-7deg); }
		to { transform: rotate(9deg); }
	}

	/* 速度线：循环左移并淡入淡出 */
	.wind {
		stroke: var(--theme-text);
		stroke-width: 1.6;
		stroke-linecap: round;
		opacity: 0;
	}
	.w1 { animation: dash 1.6s linear infinite; }
	.w2 { animation: dash 1.6s linear infinite 0.35s; }
	.w3 { animation: dash 1.6s linear infinite 0.7s; }
	@keyframes dash {
		0%   { opacity: 0; transform: translateX(10px); }
		25%  { opacity: 0.5; }
		100% { opacity: 0; transform: translateX(-26px); }
	}

	/* 小石头滚动 */
	.pebble {
		fill: var(--secondary);
		opacity: 0.45;
	}
	.p1 { animation: roll 2.4s linear infinite; }
	.p2 { animation: roll 2.4s linear infinite 0.5s; }
	.p3 { animation: roll 2.4s linear infinite 1s; }
	.p4 { animation: roll 2.4s linear infinite 1.5s; }
	.p5 { animation: roll 2.4s linear infinite 2s; }
	@keyframes roll {
		0%   { opacity: 0; transform: translateX(30px); }
		20%  { opacity: 0.45; }
		100% { opacity: 0; transform: translateX(-60px); }
	}

	/* 尊重「减少动态效果」偏好 */
	@media (prefers-reduced-motion: reduce) {
		.wheel, .rig, .wing, .leg-line, .foot,
		.wind, .pebble { animation: none !important; }
	}
</style>
