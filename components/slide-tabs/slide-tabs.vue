<template>
	<view class="slide-tabs">
		<!-- 标签栏：下划线滑块随选中项平滑移动 -->
		<view class="slide-tab-bar" :class="{ 'is-seg': variant === 'seg' }">
			<view
				class="slide-tab"
				v-for="(t, i) in items"
				:key="t.key !== undefined ? t.key : i"
				:class="{ active: currentIndex === i }"
				@tap="select(i)"
			>
				<text class="slide-tab-label">{{ t.label !== undefined ? t.label : t }}</text>
			</view>
			<!-- 滑块：宽度 = 1/n，位移 = 索引 * 100% -->
			<view
				class="slide-indicator"
				:class="{ 'is-seg': variant === 'seg' }"
				:style="indicatorStyle"
				v-if="items.length"
			></view>
		</view>

		<!-- 内容区：水平推入推出去（bar-only 时不渲染，内容由使用方自行控制） -->
		<view class="slide-body" v-if="!barOnly">
			<view class="slide-track" :style="trackStyle">
				<view
					class="slide-pane"
					:style="paneStyle"
					v-for="(t, i) in items"
					:key="'p' + (t.key !== undefined ? t.key : i)"
				>
					<slot :name="t.key !== undefined ? t.key : String(i)" :item="t" :index="i"></slot>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	/**
	 * 带滑动动画的标签页
	 *
	 * 两个动画同时发生：
	 *  1) 下划线滑块平移（transform，走 GPU，不触发重排）
	 *  2) 内容区整体左右位移，当前页始终贴住可视区
	 *
	 * 内容用「轨道 + 并列面板」实现：轨道宽度 = n * 100%，
	 * 每个面板宽度 = 1/n，位移 -index * 100% / n 即切换到第 index 页。
	 *
	 * @prop {Array}  items    取值数组；元素可为字符串，或 { key, label }
	 * @prop {Number} value    当前索引（支持 v-model）
	 * @prop {String} variant  'line'（默认，下划线）| 'seg'（分段控件，胶囊滑块）
	 */
	export default {
		name: 'slide-tabs',
		props: {
			items: { type: Array, default: () => [] },
			value: { type: Number, default: 0 },
			variant: { type: String, default: 'line' },
			// 切换动画时长（毫秒）
			duration: { type: Number, default: 260 },
			// 仅标签栏（用于「车次/车组号」这类分段控件，内容不由本组件承载）
			barOnly: { type: Boolean, default: false }
		},
		data() {
			return { currentIndex: 0 }
		},
		computed: {
			indicatorStyle() {
				const n = this.items.length || 1
				const w = 100 / n
				return {
					width: w + '%',
					transform: `translateX(${this.currentIndex * 100}%)`,
					transitionDuration: this.duration + 'ms'
				}
			},
			trackStyle() {
				const n = this.items.length || 1
				return {
					width: n * 100 + '%',
					transform: `translateX(${-this.currentIndex * (100 / n)}%)`,
					transitionDuration: this.duration + 'ms'
				}
			},
			// 轨道宽 = n*100%，故每页必须占轨道的 100/n%
			paneStyle() {
				const n = this.items.length || 1
				return { width: 100 / n + '%' }
			}
		},
		watch: {
			value: {
				immediate: true,
				handler(v) { this.currentIndex = this.clamp(v) }
			},
			items() { this.currentIndex = this.clamp(this.value) }
		},
		methods: {
			clamp(i) {
				const n = this.items.length || 1
				const v = Number(i) || 0
				return Math.min(Math.max(v, 0), n - 1)
			},
			select(i) {
				if (i === this.currentIndex) return
				this.currentIndex = i
				this.$emit('input', i)
				this.$emit('change', i)
			}
		}
	}
</script>

<style lang="scss">
	.slide-tabs { width: 100%; }

	/* ===== 标签栏 ===== */
	.slide-tab-bar {
		position: relative;
		display: flex;
		background: var(--card);
		border-radius: 12px;
		padding: 4px;
		margin-bottom: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}
	.slide-tab {
		flex: 1;
		position: relative;
		z-index: 1;                 /* 压在滑块之上，保证文字可点可读 */
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 10px 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
	.slide-tab-label {
		font-size: 15px;
		font-weight: 500;
		color: var(--secondary);
		transition: color 0.2s ease, font-weight 0.2s ease;
	}
	.slide-tab.active .slide-tab-label {
		color: var(--theme-text);
		font-weight: 700;
	}

	/* 滑块：贴在标签栏底部的一条下划线 */
	.slide-indicator {
		position: absolute;
		left: 0;
		bottom: 3px;
		height: 2.5px;
		border-radius: 2px;
		background: var(--theme);
		transition-property: transform;
		transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
		pointer-events: none;
	}

	/* 分段控件形态：滑块变成整块胶囊背景 */
	.slide-tab-bar.is-seg {
		background: var(--fill);
		border-radius: 12px;
		padding: 4px;
		box-shadow: none;
		overflow: hidden;
	}
	.slide-indicator.is-seg {
		top: 4px;
		bottom: 4px;
		height: auto;
		border-radius: 9px;
		background: var(--card);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	/* ===== 内容区 ===== */
	.slide-body {
		overflow: hidden;           /* 只露出当前一页 */
		width: 100%;
	}
	.slide-track {
		display: flex;
		align-items: flex-start;
		transition-property: transform;
		transition-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
		will-change: transform;
	}
	.slide-pane {
		flex-shrink: 0;
		box-sizing: border-box;
		min-width: 0;
	}
</style>
