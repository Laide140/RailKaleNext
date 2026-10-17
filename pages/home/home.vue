<template>
	<view class="home" :style="themeStyle">
		<!-- 顶部搜索框：输入车次，进入车次综合信息页 -->
		<view class="search-section">
			<i class="fas fa-search search-icon"></i>
			<input
				class="search-input"
				v-model="searchText"
				placeholder="输入车次，如 G1"
				placeholder-class="search-placeholder"
				confirm-type="search"
				@confirm="doSearch"
			/>
			<text class="search-cancel" v-if="searchText" @click="searchText = ''">✕</text>
			<view class="search-btn" @click="doSearch">搜索</view>
		</view>
		<view class="quick-trains" v-if="recentTrains.length">
			<text class="quick-label">最近</text>
			<text class="quick-chip" v-for="t in recentTrains" :key="t" @click="goTrainDetail(t)">{{ t }}</text>
		</view>

		<!-- 模式一：分区卡片 -->
		<template v-if="homeLayout === 'card'">
			<view
				class="section-card"
				v-for="sec in sections"
				:key="sec.id"
				@click="goToSection(sec.id)"
			>
				<view class="card-overlay">
					<view class="card-top">
						<view class="card-icon">
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
						<view class="grid-icon">
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
				:class="{ 'has-bg': !!card.bgImage }"
				v-for="card in customCards"
				:key="card.id"
				:style="customCardStyle(card)"
				@click="goToCustom(card.id)"
			>
				<view class="card-overlay">
					<view class="card-top">
						<view class="card-icon">
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
		<app-toast ref="toast" />
	</view>
</template>

<script>
	import { FEATURES, SECTIONS, getFeature } from '@/common/features.js'

	export default {
		data() {
			return {
				sections: SECTIONS,
				allFeatures: FEATURES,
				searchText: ''
			}
		},
		computed: {
			homeLayout() { return this.$store.state.settings.homeLayout },
			customCards() { return this.$store.state.settings.customCards },
			// 最近查询过的车次（来自 Vuex 搜索历史）
			recentTrains() {
				const list = this.$store.state.searchHistory || []
				const seen = []
				for (const item of list) {
					const no = typeof item === 'string' ? item : (item && (item.train || item.trainNo))
					if (no && seen.indexOf(no) < 0) seen.push(no)
					if (seen.length >= 6) break
				}
				return seen
			}
		},
		methods: {
			featureIcon(id) { const f = getFeature(id); return f ? f.icon : 'fa-question' },
			featureLabel(id) { const f = getFeature(id); return f ? f.label : id },
			featurePath(id) { const f = getFeature(id); return f ? f.path : id },

			// 顶部搜索：输入车次 → 车次综合信息页
			doSearch() {
				const no = String(this.searchText || '').trim().toUpperCase()
				if (!no) {
					this.toast('请输入车次号')
					return
				}
				this.goTrainDetail(no)
			},
			goTrainDetail(trainNo) {
				if (!trainNo) return
				this.$store.commit('addSearchHistory', { train: trainNo, time: Date.now() })
				uni.navigateTo({
					url: `/pages/train-detail/train-detail?train=${encodeURIComponent(trainNo)}`
				})
			},
			customCardStyle(card) {
				if (card.bgImage) {
					return {
						backgroundImage: `url(${card.bgImage})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						transform: 'translateZ(0)'
					}
				}
				// 无背景图时统一使用主题色淡底（不再逐卡片配色）
				return { backgroundColor: 'var(--theme-soft)' }
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
		border-radius: 12px; padding: 10px 10px 10px 16px; margin: 16px 0 10px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.06);
		border: 1px solid var(--theme-border);
	}
	.search-icon { font-size: 17px; color: var(--theme-text); }
	.search-input { flex: 1; font-size: 17px; color: var(--label); height: 38px; }
	.search-placeholder { color: var(--secondary); }
	.search-cancel { font-size: 15px; color: var(--secondary); padding: 0 6px; }
	.search-btn {
		flex-shrink: 0;
		background: var(--theme);
		color: #fff;
		font-size: 15px;
		font-weight: 600;
		border-radius: 10px;
		padding: 8px 16px;
		line-height: 1.2;
	}
	.quick-trains { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
	.quick-label { font-size: 12px; color: var(--secondary); }
	.quick-chip {
		font-size: 13px; font-weight: 600;
		color: var(--theme-text);
		background: var(--theme-fill);
		border-radius: 20px;
		padding: 3px 12px;
	}

	/* ===== Section Card ===== */
	.section-card {
		position: relative;
		border-radius: 16px;
		overflow: hidden;
		margin-bottom: 14px;
		padding: 18px 20px 20px;
		background: var(--card);
		border: 1px solid var(--theme-border);
		box-shadow: 0 2px 16px rgba(0,0,0,0.06);
		display: flex;
		flex-direction: column;
		transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.25s;

		&:active {
			transform: scale(0.97);
			box-shadow: 0 1px 6px rgba(0,0,0,0.05);
		}
	}

	/* ===== 自定义卡片：主题色淡底 + 白色 3px 边框 ===== */
	.custom-card {
		border: 3px solid #fff;
		box-shadow: 0 2px 16px rgba(0,0,0,0.12);
	}
	/* 自定义卡片设了背景图时，压一层中性白色渐变保证文字可读（非彩色遮罩） */
	.custom-card.has-bg {
		padding: 0;
	}
	.custom-card.has-bg .card-overlay {
		background: linear-gradient(to bottom, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.92) 62%);
		padding: 18px 20px 20px;
	}

	/* 卡片内容容器：卡片本身已有内边距，这里只做纵向排布。
	 * 不能再绝对定位 —— 否则内容被 overflow:hidden 裁掉，
	 * 且卡片高度不随内容增长（表现为「分区卡片显示不完全」） */
	.card-overlay {
		display: flex;
		flex-direction: column;
		width: 100%;
		box-sizing: border-box;
	}

	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 10px;
	}

	.card-icon {
		width: 42px;
		height: 42px;
		border-radius: 11px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--theme);
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
		background: var(--theme-fill);
		border-radius: 20px;
		font-size: 11px;
		color: var(--theme-text);
		font-weight: 500;
	}

	/* ===== Grid Mode ===== */
	.section-block { margin-bottom: 20px; }
	.grid-section-title {
		display: flex; align-items: center; gap: 8px;
		font-size: 15px; font-weight: 700; color: var(--label);
		margin-bottom: 10px; padding-left: 4px;
		i { color: var(--theme-text); font-size: 15px; }
	}
	.grid {
		display: flex; flex-wrap: wrap;
		background: var(--card);
		border-radius: 14px; padding: 8px 0;
		box-shadow: 0 1px 3px rgba(0,0,0,0.06);
	}
	.grid-item { width: 25%; display: flex; flex-direction: column; align-items: center; padding: 14px 0; }
	.grid-icon {
		width: 36px; height: 36px; border-radius: 10px;
		display: flex; align-items: center; justify-content: center;
		margin-bottom: 6px;
		background: var(--theme-fill);
	}
	.grid-icon-text { font-size: 18px; color: var(--theme-text); }
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
