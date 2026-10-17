<template>
	<view class="page" :style="themeStyle">
		<view class="hero">
			<view class="hero-icon">
				<i class="fas fa-chart-simple"></i>
			</view>
			<text class="hero-title">铁路大数据</text>
		</view>

		<view class="status-card">
			<i class="fas fa-screwdriver-wrench status-icon"></i>
			<text class="status-text">功能开发中...敬请期待</text>
			<text class="status-sub">数据统计与可视化看板，正在建设中</text>
		</view>

		<bike-scene></bike-scene>
	</view>
</template>

<script>
	import BikeScene from '@/components/bike-scene/bike-scene.vue'

	export default {
		components: { BikeScene }
	}
</script>

<style lang="scss">
	.page {
		min-height: 100vh;
		background: var(--bg);
		padding: 24px 20px 40px;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		margin-bottom: 22px;
	}
	.hero-icon {
		width: 56px;
		height: 56px;
		border-radius: 16px;
		background: var(--theme);
		display: flex;
		align-items: center;
		justify-content: center;
		i { font-size: 26px; color: #fff; }
	}
	.hero-title {
		font-size: 20px;
		font-weight: 700;
		color: var(--label);
	}

	.status-card {
		width: 100%;
		background: var(--card);
		border-radius: 14px;
		padding: 22px 18px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
		margin-bottom: 28px;
	}
	.status-icon {
		font-size: 22px;
		color: var(--theme-text);
		margin-bottom: 2px;
	}
	.status-text {
		font-size: 16px;
		font-weight: 600;
		color: var(--label);
		text-align: center;
	}
	.status-sub {
		font-size: 13px;
		color: var(--secondary);
		text-align: center;
		line-height: 1.6;
	}
</style>
