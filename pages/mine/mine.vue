<template>
	<view class="page">
		<!-- Profile -->
		<view class="profile-card">
			<view class="avatar"><image class="avatar-img" src="https://next.laide.net.cn/d7a80102a3f4bfad07fcab4685262dac.png"></image></view>
			<view class="profile-info">
				<text class="profile-name">铁路万花筒</text>
				<text class="profile-en">RailKale: Next</text>
				<text class="profile-version">v{{version}}</text>
			</view>
		</view>

		<!-- Section 1: Settings -->
		<view class="group">
			<view class="row" @tap="goToPage('settings')">
				<view class="row-left"><i class="fas fa-sliders-h row-icon" :style="{color: themeColor}"></i><text class="row-label">设置</text></view>
				<text class="row-value">{{ layoutName }}</text>
				<text class="row-arrow">›</text>
			</view>
		</view>

		<!-- Section 2: Tools -->
		<view class="group">
			<view class="row" @tap="goToPage('station-code')">
				<view class="row-left"><i class="fas fa-search row-icon" :style="{color: themeColor}"></i><text class="row-label">车站代码查询</text></view>
				<text class="row-arrow">›</text>
			</view>
			<view class="row" @tap="goToPage('souvenir-ticket')">
				<view class="row-left"><i class="fas fa-ticket-alt row-icon" style="color:#ff9500"></i><text class="row-label">纪念车票生成</text></view>
				<text class="row-arrow">›</text>
			</view>
		</view>

		<!-- Section 3: Info -->
		<view class="group">
			<view class="row">
				<view class="row-left"><i class="fas fa-database row-icon" style="color:#8e8e93"></i><text class="row-label">数据来源</text></view>
				<text class="row-value">自有数据</text>
			</view>
			<view class="row" @tap="showAbout">
				<view class="row-left"><i class="fas fa-info-circle row-icon" :style="{color: themeColor}"></i><text class="row-label">关于应用</text></view>
				<text class="row-arrow">›</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { version } from '@/package.json'
	export default {
		data() { return { version } },
		computed: {
			layoutName() {
				const map = { card: '分区卡片', grid: '宫格', custom: '自定义' }
				return map[this.homeLayout] || '分区卡片'
			}
		},
		methods: {
			goToPage(path) { uni.navigateTo({ url: `/pages/${path}/${path}` }) },
			showAbout() {
				uni.showModal({
					title: '关于 RailKale: Next',
					content: `铁路万花筒（RailKale: Next） v${version}\n\n综合铁路信息查询工具\n\n数据接口：自有 / RailGo\n动车组配属、交路查询：rail.re\n\n仅供个人学习参考使用`,
					showCancel: false,
					confirmText: '好'
				})
			}
		}
	}
</script>

<style lang="scss">
	.page { background: var(--bg); min-height: 100vh; padding: 0 0 24px; }

	/* Profile card */
	.profile-card {
		display: flex; align-items: center; gap: 16px;
		padding: 32px 20px 28px;
		background: var(--card);
		margin-bottom: 2px;
	}
	.avatar {
		width: 56px; height: 56px; border-radius: 14px;
		background: #007aff;
		display: flex; align-items: center; justify-content: center;
		box-shadow: 0 4px 12px rgba(0,122,255,0.3);
	}
	.avatar-img { width: 56px; height: 56px; border-radius: 14px; }
	.profile-info { display: flex; flex-direction: column; gap: 2px; }
	.profile-name { font-size: 20px; font-weight: 700; color: var(--label); }
	.profile-en { font-size: 13px; color: var(--secondary); font-weight: 500; }
	.profile-version { font-size: 14px; color: var(--secondary); }

	/* Grouped table */
	.group {
		background: var(--card);
		border-radius: 14px;
		margin: 0 16px 20px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0,0,0,0.04);
	}
	.row {
		display: flex; align-items: center; justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 0.5px solid var(--separator);
		cursor: pointer;
	}
	.row:last-child { border-bottom: none; }
	.row-left { display: flex; align-items: center; gap: 12px; }
	.row-icon { font-size: 18px; width: 24px; text-align: center; }
	.row-label { font-size: 17px; color: var(--label); }
	.row-value { font-size: 15px; color: var(--secondary); }
	.row-arrow { font-size: 20px; color: var(--secondary); font-weight: 300; line-height: 1; }
</style>
