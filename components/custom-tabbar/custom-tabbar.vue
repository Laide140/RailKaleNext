<template>
	<view class="tabbar">
		<view class="tabbar-bg"></view>
		<view class="tabbar-item" v-for="(tab, i) in tabs" :key="i" :class="{ active: activeTab === tab.page }" @tap="switchTab(tab.page)">
			<i class="tabbar-icon fas" :class="tab.icon" :style="activeTab === tab.page ? { color: themeColor } : ''"></i>
			<text class="tabbar-label" :style="activeTab === tab.page ? { color: themeColor } : ''">{{ tab.label }}</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				tabs: [
					{ icon: 'fa-home', label: '首页', page: 'home' },
					{ icon: 'fa-map', label: '路网地图', page: 'rail-network-map' },
					{ icon: 'fa-user', label: '我的', page: 'mine' },
				],
				activeTab: 'home'
			}
		},
		mounted() { this.updateActiveTab() },
		methods: {
			updateActiveTab() {
				const pages = getCurrentPages()
				if (pages.length > 0) {
					const route = pages[pages.length - 1].route || ''
					for (const tab of this.tabs) {
						if (route.includes(tab.page)) { this.activeTab = tab.page; break }
					}
				}
			},
			switchTab(page) {
				if (this.activeTab === page) return
				uni.switchTab({ url: `/pages/${page}/${page}` })
			}
		}
	}
</script>

<style lang="scss">
	.tabbar {
		position: fixed; bottom: 0; left: 0; right: 0;
		display: flex; align-items: flex-start;
		padding-top: 6px; height: 83px;
		padding-bottom: env(safe-area-inset-bottom, 0);
		z-index: 999;
	}
	.tabbar-bg {
		position: absolute; inset: 0;
		background: var(--card);
		backdrop-filter: blur(20px) saturate(180%);
		-webkit-backdrop-filter: blur(20px) saturate(180%);
		border-top: 0.5px solid var(--separator);
	}
	.tabbar-item {
		flex: 1; display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		position: relative; z-index: 1;
		padding: 2px 0 4px;
		cursor: pointer; -webkit-tap-highlight-color: transparent;
	}
	.tabbar-icon { font-size: 23px; color: var(--secondary); margin-bottom: 1px; }
	.tabbar-label { font-size: 10px; color: var(--secondary); font-weight: 500; letter-spacing: -0.01em; }
	.tabbar-item.active .tabbar-icon { color: #007aff; }
	.tabbar-item.active .tabbar-label { color: #007aff; }
</style>
