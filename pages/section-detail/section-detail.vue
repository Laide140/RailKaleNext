<template>
	<view class="detail" :style="themeStyle">
		<view class="hero">
			<view class="hero-overlay">
				<view class="hero-icon">
					<i class="fas" :class="section.icon"></i>
				</view>
				<text class="hero-title">{{ section.title }}</text>
				<text class="hero-subtitle">{{ section.subtitle }}</text>
			</view>
		</view>

		<view class="grid">
			<view class="grid-item" v-for="(item, i) in features" :key="i" @click="goToPage(item.path)">
				<view class="grid-icon">
					<i class="fas grid-icon-text" :class="item.icon"></i>
				</view>
				<text class="grid-label">{{ item.label }}</text>
			</view>
		</view>

		<view class="footer">
			<image class="footer-logo" src="https://next.laide.net.cn/d7a80102a3f4bfad07fcab4685262dac.png" mode="aspectFit"></image>
			<text>铁路万花筒 · RailKale: Next</text>
		</view>
	</view>
</template>

<script>
	import { SECTIONS, getFeaturesByIds } from '@/common/features.js'

	export default {
		data() {
			return {
				section: { title: '', subtitle: '', icon: '' },
				features: [],
			}
		},
		computed: {
			customCards() { return this.$store.state.settings.customCards }
		},
		onLoad(options) {
			const id = options.id || 'travel'
			if (id.indexOf('custom-') === 0) {
				// 自定义卡片
				const cardId = id.substring(7)
				const card = this.customCards.find(c => c.id === cardId)
				if (card) {
					this.section = {
						title: card.title || '我的卡片',
						subtitle: '',
						icon: 'fa-th-large'
					}
					this.features = getFeaturesByIds(card.features)
				}
			} else {
				const sec = SECTIONS.find(s => s.id === id)
				if (sec) {
					this.section = {
						title: sec.title,
						subtitle: sec.subtitle,
						icon: sec.icon
					}
					this.features = getFeaturesByIds(sec.features)
				}
			}
			uni.setNavigationBarTitle({ title: this.section.title || '功能' })
		},
		methods: {
			goToPage(path) {
				const tabBarPages = ['home', 'rail-network-map', 'mine']
				const url = `/pages/${path}/${path}`
				if (tabBarPages.includes(path)) {
					uni.switchTab({ url })
				} else {
					uni.navigateTo({ url })
				}
			}
		}
	}
</script>

<style lang="scss">
	.detail {
		min-height: 100vh;
		background: var(--bg);
		padding-bottom: 40px;
	}

	/* ===== Hero Banner ===== */
	/* 分区头图：主题色填充（不再使用图片背景） */
	.hero {
		position: relative;
		background: var(--theme);
		border-radius: 16px;
		overflow: hidden;
		min-height: 150px;
		margin-bottom: 20px;
	}

	.hero-overlay {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding: 22px 20px 24px;
	}

	/* 头图图标：半透明白底 + 白色图标，落在主题色上 */
	.hero-icon {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
		background: rgba(255, 255, 255, 0.22);
		i { font-size: 22px; color: #fff; }
	}

	.hero-title {
		font-size: 26px;
		font-weight: 700;
		color: #fff;
		margin-bottom: 4px;
		text-shadow: 0 1px 4px rgba(0,0,0,0.3);
	}

	.hero-subtitle {
		font-size: 14px;
		color: rgba(255,255,255,0.85);
		font-weight: 400;
	}

	/* ===== Feature Grid ===== */
	.grid {
		display: flex;
		flex-wrap: wrap;
		background: var(--card);
		border-radius: 14px;
		padding: 8px 0;
		margin: 0 16px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.06);
	}

	.grid-item {
		width: 25%;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 18px 0;
	}

	/* 功能图标：主题色实底 + 白色图标（原先靠内联 item.color 上色，
	 * 该字段已随 features.js 移除，导致图标变透明不可见） */
	.grid-icon {
		width: 40px;
		height: 40px;
		border-radius: 11px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 8px;
		background: var(--theme);
		transition: transform 0.2s;
	}

	.grid-item:active .grid-icon {
		transform: scale(0.88);
	}

	.grid-icon-text { font-size: 20px; color: #fff; }

	.grid-label {
		font-size: 12px;
		color: var(--label);
		font-weight: 500;
		text-align: center;
	}

	.footer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		text-align: center;
		padding: 32px 0;
		font-size: 12px;
		color: var(--secondary);
	}
	.footer-logo { width: 32px; height: 32px; border-radius: 8px; opacity: 0.85; }
</style>
