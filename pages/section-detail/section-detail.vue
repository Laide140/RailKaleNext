<template>
	<view class="detail">
		<view class="hero" :style="heroStyle">
			<view class="hero-overlay">
				<view class="hero-icon" :style="{ backgroundColor: section.badgeColor }">
					<i class="fas" :class="section.icon"></i>
				</view>
				<text class="hero-title">{{ section.title }}</text>
				<text class="hero-subtitle">{{ section.subtitle }}</text>
			</view>
		</view>

		<view class="grid">
			<view class="grid-item" v-for="(item, i) in features" :key="i" @click="goToPage(item.path)">
				<view class="grid-icon" :style="{ backgroundColor: item.color }">
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
				section: { title: '', subtitle: '', icon: '', badgeColor: '', bgImage: '' },
				features: [],
			}
		},
		computed: {
			customCards() { return this.$store.state.settings.customCards },
			heroStyle() {
				if (this.section.bgImage) {
					return {
						backgroundImage: `url(${this.section.bgImage})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						backgroundColor: this.section.badgeColor || '#1c1c1e'
					}
				}
				return { backgroundColor: this.section.badgeColor || '#1c1c1e' }
			}
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
						icon: 'fa-th-large',
						badgeColor: card.color,
						bgImage: card.bgImage || ''
					}
					this.features = getFeaturesByIds(card.features)
				}
			} else {
				const sec = SECTIONS.find(s => s.id === id)
				if (sec) {
					this.section = {
						title: sec.title,
						subtitle: sec.subtitle,
						icon: sec.icon,
						badgeColor: sec.badgeColor,
						bgImage: sec.bgImage
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
	.hero {
		position: relative;
		height: 220px;
		background-size: cover;
		background-position: center;
		margin-bottom: 20px;
	}

	.hero-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.65));
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding: 0 20px 28px;
	}

	.hero-icon {
		width: 44px;
		height: 44px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 12px;
		box-shadow: 0 4px 12px rgba(0,0,0,0.2);
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

	.grid-icon {
		width: 40px;
		height: 40px;
		border-radius: 11px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 8px;
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
