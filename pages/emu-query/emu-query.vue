<template>
	<view class="page">
		<view class="search-box">
			<view class="toggle-bar">
				<view class="toggle-btn" :class="{ active: mode === 'train' }" @tap="mode='train'">车次</view>
				<view class="toggle-btn" :class="{ active: mode === 'emu' }" @tap="mode='emu'">车组号</view>
			</view>
			<input class="search-input" v-model="query" :placeholder="mode === 'train' ? '输入车次号，如：G1' : '输入车组号，如：CR400BFS-3157'" @confirm="search" />
			<button class="search-btn" @tap="search">查询</button>
		</view>

		<view class="loading" v-if="loading"><text>查询中...</text></view>
		<view class="error" v-if="error"><text>{{ error }}</text></view>

		<view class="result" v-if="result && result.length">
			<view class="result-title">{{ mode === 'train' ? '车次 ' + query + ' 的运用记录' : '车组 ' + query + ' 的担当记录' }}</view>
			<view class="record" v-for="(r, i) in result" :key="i">
				<view class="record-date">{{ r.date }}</view>
				<view class="record-body">
					<text class="record-train" v-if="mode === 'emu'">{{ r.train_no }}</text>
					<text class="record-emu" v-if="mode === 'train'">{{ r.emu_no }}</text>
				</view>
			</view>
		</view>

		<view class="empty" v-if="!loading && !error && result && !result.length">
			<text>未查询到记录</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return { query: '', mode: 'train', loading: false, result: null, error: '' }
		},
		methods: {
			search() {
				var q = this.query.trim()
				if (!q) { uni.showToast({ title: '请输入查询内容', icon: 'none' }); return }
				this.loading = true
				this.error = ''
				this.result = null
				var url = this.mode === 'train'
					? 'https://api.rail.re/train/' + encodeURIComponent(q)
					: 'https://api.rail.re/emu/' + encodeURIComponent(q)
				uni.request({
					url: url,
					success: (r) => {
						try {
							var data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
							this.result = Array.isArray(data) ? data : []
						} catch (e) {
							// 返回非 JSON（如错误页）时避免页面卡在加载中
							this.error = '查询失败：返回数据格式异常'
							this.result = null
						}
						this.loading = false
					},
					fail: () => { this.error = '网络异常'; this.loading = false }
				})
			}
		}
	}
</script>

<style>
	page { background: #f2f2f7; }
	.page { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased; padding: 20rpx; }
	.search-box { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 14px; padding: 24rpx; margin-bottom: 20rpx; }
	.toggle-bar { display: flex; margin-bottom: 16rpx; background: #f0f2f5; border-radius: 12rpx; padding: 4rpx; }
	.toggle-btn { flex: 1; text-align: center; padding: 12rpx 0; border-radius: 10rpx; font-size: 26rpx; color: #666; }
	.toggle-btn.active { background: #fff; color: #007aff; font-weight: bold; }
	.search-input { width: 100%; height: 80rpx; padding: 0 20rpx; background: #f5f7fa; border-radius: 12rpx; font-size: 28rpx; margin-bottom: 16rpx; }
	.search-btn { width: 100%; background: #007aff; color: #fff; font-size: 28rpx; height: 80rpx; line-height: 80rpx; text-align: center; border-radius: 12rpx; }
	.loading, .error, .empty { text-align: center; padding: 60rpx 0; color: #999; font-size: 28rpx; }
	.error { color: #e74c3c; }
	.result-title { font-size: 28rpx; font-weight: bold; color: #333; margin-bottom: 16rpx; padding-left: 16rpx; border-left: 6rpx solid #007aff; }
	.record { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 12px; padding: 20rpx 24rpx; margin-bottom: 12rpx; }
	.record-date { font-size: 24rpx; color: #999; margin-bottom: 8rpx; }
	.record-train, .record-emu { font-size: 30rpx; font-weight: bold; color: #007aff; }
</style>
