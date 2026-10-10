<script>
	import { applyTheme } from '@/common/settings.js'

	export default {
		onLaunch: function() {
			console.log('铁路万花筒 App Launch');
			// 应用持久化的主题色
			if (this.$store && this.$store.state.settings) {
				applyTheme(this.$store.state.settings.themeColor)
			}
		},
		onShow: function() {
			console.log('App Show')
			// 确保页面 DOM 就绪后主题色仍生效
			if (this.$store && this.$store.state.settings) {
				applyTheme(this.$store.state.settings.themeColor)
			}
		},
		onHide: function() { console.log('App Hide') },
		globalData: { test: '' },
		methods: {}
	}
</script>

<style lang="scss">
	@import '@/uni_modules/uni-scss/index.scss';
	@import './common/uni.css';
	@import '@/static/customicons.css';
	@import '@/static/fontawesome/fontawesome-all.css';

	:root {
		--font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'PingFang SC', 'Microsoft YaHei', sans-serif;

		/* ===== 主题色令牌 =====
		 * 仅用于 UI 装饰：图标、按钮、分区、选中态、链接。
		 * 由「设置 → 主题色」决定，运行时由 applyTheme / themeStyle 覆写。
		 *
		 * 注意：状态色、线路色等「语义色」（车站大屏状态、地图线路、
		 * 报警/错误提示）不在此列，必须保持各自原值 —— 那是信息，不是配色。
		 */
		--blue: #007aff;          /* 主题色（历史变量名，等价于 --theme） */
		--theme: #007aff;
		--theme-text: #007aff;    /* 白底上可读的主题色（图标 / 文字） */
		--theme-strong: #0062cc;
		--theme-soft: #cce4ff;
		--theme-softer: #ebf4ff;
		--theme-border: rgba(0, 122, 255, 0.22);
		--theme-fill: rgba(0, 122, 255, 0.08);
		--theme-fill-strong: rgba(0, 122, 255, 0.14);

		/* ===== 中性色（浅色底 / 文字 / 分隔线）===== */
		--bg: #f2f2f7;
		--card: #ffffff;
		--card2: #f8f8fa;
		--label: #1c1c1e;
		--secondary: #8e8e93;
		--separator: rgba(60, 60, 67, 0.08);
		--fill: #f5f7fa;
		--radius: 14px;
	}

	page {
		font-family: var(--font);
		background-color: var(--bg);
		color: var(--label);
		font-size: 17px;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/* iOS-style translucent nav bar */
	uni-page-head {
		background: rgba(255, 255, 255, 0.72) !important;
		backdrop-filter: blur(20px) saturate(180%) !important;
		-webkit-backdrop-filter: blur(20px) saturate(180%) !important;
		border-bottom: 0.5px solid rgba(60, 60, 67, 0.08) !important;
	}

	uni-page-head .uni-page-head {
		background: transparent !important;
	}

	/* Page body */
	uni-page-body {
		background-color: var(--bg) !important;
		min-height: 100% !important;
		height: auto !important;
	}

	/* iOS-style cards */
	.card {
		background: var(--card);
		border-radius: var(--radius);
		padding: 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		margin-bottom: 16px;
	}

	/* iOS-style pill button */
	.btn-pill {
		background: var(--theme);
		color: #fff;
		border: none;
		border-radius: 25px;
		padding: 12px 28px;
		font-size: 17px;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.2s;
	}
	.btn-pill:active { opacity: 0.7; }

	/* iOS-style separator */
	.separator {
		height: 0.5px;
		background: var(--separator);
		margin: 0 16px;
	}

	/* H5 desktop */
	@media screen and (min-width: 768px) {
		body { overflow-y: scroll; }
		uni-page-body { max-width: 420px; margin: 0 auto; }
	}
</style>
