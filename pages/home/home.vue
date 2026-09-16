<template>
	<view class="home">
		<!-- 搜索栏 -->
		<view class="search-section" @click="goToPage('train-query')">
			<i class="fas fa-search search-icon"></i>
			<text class="search-text">查车次、查车站、查时刻...</text>
		</view>

		<!-- 模式一：分区卡片 -->
		<template v-if="homeLayout === 'card'">
			<view
				class="section-card"
				v-for="sec in sections"
				:key="sec.id"
				:style="{ backgroundImage: 'url(' + sec.bgImage + ')' }"
				@click="goToSection(sec.id)"
			>
				<view class="card-overlay">
					<view class="card-top">
						<view class="card-icon" :style="{ backgroundColor: sec.badgeColor }">
							<i class="fas" :class="sec.icon"></i>
						</view>
						<text class="card-arrow">›</text>
					</view>
					<text class="card-title">{{ sec.title }}</text>
					<text class="card-subtitle">{{ sec.subtitle }}</text>
					<view class="card-tags">
						<text class="card-tag" v-for="fid in sec.features" :key="fid">{{ featureLabel(fid) }}</text>
					</view>
				</view>
			</view>
		</template>

		<!-- 模式二：宫格 -->
		<template v-if="homeLayout === 'grid'">
			<view class="section-block" v-for="sec in sections" :key="sec.id">
				<view class="grid-section-title">
					<i class="fas" :class="sec.icon"></i>
					<text>{{ sec.title }}</text>
				</view>
				<view class="grid">
					<view class="grid-item" v-for="fid in sec.features" :key="fid" @click="goToPage(featurePath(fid))">
						<view class="grid-icon" :style="{ backgroundColor: featureColor(fid) }">
							<i class="fas grid-icon-text" :class="featureIcon(fid)"></i>
						</view>
						<text class="grid-label">{{ featureLabel(fid) }}</text>
					</view>
				</view>
			</view>
		</template>

		<!-- 模式三：自定义卡片 -->
		<template v-if="homeLayout === 'custom'">
			<view
				class="section-card custom-card"
				v-for="card in customCards"
				:key="card.id"
				:style="customCardStyle(card)"
				@click="goToCustom(card.id)"
			>
				<view class="card-overlay">
					<view class="card-top">
						<view class="card-icon" :style="{ backgroundColor: card.color }">
							<i class="fas fa-th-large"></i>
						</view>
						<text class="card-arrow">›</text>
					</view>
					<text class="card-title">{{ card.title || '未命名卡片' }}</text>
					<view class="card-tags">
						<text class="card-tag" v-for="fid in card.features" :key="fid">{{ featureLabel(fid) }}</text>
					</view>
				</view>
			</view>
			<view class="empty-custom" v-if="!customCards.length" @click="goEditor">
				<i class="fas fa-palette"></i>
				<text>还没有自定义卡片，去创建</text>
			</view>
		</template>

		<view class="footer">
			<image class="footer-logo" src="https://next.laide.net.cn/d7a80102a3f4bfad07fcab4685262dac.png" mode="aspectFit"></image>
			<text>铁路万花筒 · RailKale: Next</text>
		</view>
	</view>
</template>

<script>
	import { FEATURES, SECTIONS, getFeature } from '@/common/features.js'

	export default {
		computed: {
			homeLayout() { return this.$store.state.settings.homeLayout },
			customCards() { return this.$store.state.settings.customCards }
		},
		data() {
			return {
				sections: SECTIONS,
				allFeatures: FEATURES,
			}
		},
		methods: {
			featureIcon(id) { const f = getFeature(id); return f ? f.icon : 'fa-question' },
			featureLabel(id) { const f = getFeature(id); return f ? f.label : id },
			featurePath(id) { const f = getFeature(id); return f ? f.path : id },
			featureColor(id) { const f = getFeature(id); return f ? f.color : '#007aff' },
			customCardStyle(card) {
				if (card.bgImage) {
					return {
						backgroundImage: `url(${card.bgImage})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						transform: 'translateZ(0)'
					}
				}
				const color = card.color || this.getThemeColor() || '#007aff'
				return { backgroundColor: this.hexToRgba(color, 0.5) }
			},
			// 主题色（应用全局主题色）
			getThemeColor() {
				return (this.$store && this.$store.state && this.$store.state.settings && this.$store.state.settings.themeColor) || '#007aff'
			},
			// 十六进制颜色转 rgba（带透明度）
			hexToRgba(hex, alpha) {
				let c = String(hex || '').trim()
				// 已是 rgba 或 rgb，返回原样（附 alpha 覆盖）
				if (/^rgba?\(/.test(c)) {
					if (c.indexOf('rgba') === 0) return c
					return c.replace(/^rgb\(/, 'rgba(').replace(/\)$/, `,${alpha})`)
				}
				if (c.indexOf('#') === 0) c = c.slice(1)
				if (c.length === 3) c = c.split('').map(ch => ch + ch).join('')
				if (c.length !== 6) return `rgba(0,122,255,${alpha})`
				const int = parseInt(c, 16)
				const r = (int >> 16) & 255
				const g = (int >> 8) & 255
				const b = int & 255
				return `rgba(${r},${g},${b},${alpha})`
			},
			goToPage(path) {
				const url = `/pages/${path}/${path}`
				const tabBarPages = ['home', 'rail-network-map', 'mine']
				if (tabBarPages.includes(path)) {
					uni.switchTab({ url })
				} else {
					uni.navigateTo({ url })
				}
			},
			goToSection(id) {
				uni.navigateTo({ url: `/pages/section-detail/section-detail?id=${id}` })
			},
			goToCustom(cardId) {
				uni.navigateTo({ url: `/pages/section-detail/section-detail?id=custom-${cardId}` })
			},
			goEditor() {
				uni.navigateTo({ url: '/pages/custom-editor/custom-editor' })
			}
		}
	}
</script>

<style lang="scss">
	.home {
		padding: 0 16px 24px;
		background: var(--bg);
		min-height: 100vh;
	}

	/* ===== Search ===== */
	.search-section {
		display: flex; align-items: center; gap: 10px;
		background: var(--card);
		backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
		border-radius: 12px; padding: 14px 16px; margin: 16px 0 16px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.06);
		border: 0.5px solid var(--separator);
	}
	.search-icon { font-size: 18px; color: var(--secondary); }
	.search-text { font-size: 17px; color: var(--secondary); flex: 1; }

	/* ===== Section Card ===== */
	.section-card {
		position: relative;
		height: 200px;
		border-radius: 16px;
		overflow: hidden;
		margin-bottom: 14px;
		background-size: cover;
		background-position: center;
		background-color: #fff;
		box-shadow: 0 2px 16px rgba(0,0,0,0.08);
		transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.25s;

		&:active {
			transform: scale(0.97);
			box-shadow: 0 1px 6px rgba(0,0,0,0.05);
		}
	}

	/* ===== 自定义卡片：主题色 50% 透明背景 + 白色 3px 边框 + 无渐变遮罩 ===== */
	.custom-card {
		border: 3px solid #fff;
		box-shadow: 0 2px 16px rgba(0,0,0,0.12);
	}
	.custom-card .card-overlay {
		background: none;
		background-image: none;
	}

	.card-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, transparent 30%, var(--card) 70%);
		padding: 18px 20px 20px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.card-icon {
		width: 42px;
		height: 42px;
		border-radius: 11px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 3px 10px rgba(0,0,0,0.12);
		i { font-size: 20px; color: #fff; }
	}

	.card-arrow {
		font-size: 28px;
		color: var(--secondary);
		font-weight: 300;
		margin-top: 6px;
	}

	.card-title {
		font-size: 22px;
		font-weight: 700;
		color: var(--label);
		margin-bottom: 2px;
	}

	.card-subtitle {
		font-size: 13px;
		color: var(--secondary);
		font-weight: 400;
		margin-bottom: 10px;
	}

	.card-tags {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
	}

	.card-tag {
		padding: 3px 10px;
		background: var(--separator);
		border-radius: 20px;
		font-size: 11px;
		color: var(--secondary);
		font-weight: 500;
	}

	/* ===== Grid Mode ===== */
	.section-block { margin-bottom: 20px; }
	.grid-section-title {
		display: flex; align-items: center; gap: 8px;
		font-size: 15px; font-weight: 700; color: var(--label);
		margin-bottom: 10px; padding-left: 4px;
		i { color: var(--blue); font-size: 15px; }
	}
	.grid {
		display: flex; flex-wrap: wrap;
		background: var(--card);
		border-radius: 14px; padding: 8px 0;
		box-shadow: 0 1px 3px rgba(0,0,0,0.06);
	}
	.grid-item { width: 25%; display: flex; flex-direction: column; align-items: center; padding: 14px 0; }
	.grid-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
	.grid-icon-text { font-size: 18px; color: #fff; }
	.grid-label { font-size: 12px; color: var(--label); font-weight: 500; }

	/* ===== Custom mode empty ===== */
	.empty-custom {
		display: flex; flex-direction: column; align-items: center; gap: 10px;
		padding: 60px 0; color: var(--secondary); font-size: 15px;
		i { font-size: 40px; color: var(--secondary); }
	}

	/* ===== Footer ===== */
	.footer { text-align: center; padding: 20px 0; font-size: 12px; color: var(--secondary); display: flex; flex-direction: column; align-items: center; gap: 6px; }
	.footer-logo { width: 32px; height: 32px; border-radius: 8px; opacity: 0.85; }
</style>
