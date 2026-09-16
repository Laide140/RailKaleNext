<template>
	<view class="page">
		<view class="search-box">
			<text class="search-label">车次号</text>
			<input class="search-input" v-model="train" placeholder="如：G1" @confirm="fetchLineMap" />
			<button class="search-btn" @tap="fetchLineMap" :loading="loading">查看线路</button>
		</view>

		<view class="loading-state" v-if="loading">
			<text>正在加载线路数据...</text>
		</view>

		<!-- 线路图 -->
		<view class="line-section" v-if="lineData">
			<!-- 车站列表 -->
			<view class="stations-card">
				<view class="card-title">途经车站</view>
				<view class="station-list">
					<view class="station-marker" v-for="(station, index) in stationNames" :key="index">
						<view class="marker-dot" :class="{ start: index === 0, end: index === stationNames.length - 1 }"></view>
						<text class="marker-name">{{ station }}</text>
						<text class="marker-index">第{{ index + 1 }}站</text>
					</view>
				</view>
			</view>

			<!-- 地图 -->
			<view class="map-card" v-if="lineData && lineData.train">
				<view class="card-title">运行线路</view>
				<image class="map-image" :src="staticMapUrl" mode="widthFix" v-if="staticMapUrl"></image>
			</view>

			<!-- 线路详情 -->
			<view class="segments-card" v-if="lineData && lineData.train">
				<view class="card-title">线路分段</view>
				<view class="segment-item" v-for="(seg, name, idx) in lineData.train" :key="idx">
					<text class="seg-name">{{ name.replace(/-/g, ' → ') }}</text>
					<text class="seg-points">{{ seg.line ? seg.line.length : 0 }} 个坐标点</text>
				</view>
			</view>
		</view>

		<view class="empty-state" v-if="!loading && !lineData">
			<text>输入车次号查看铁路线路图</text>
		</view>
	</view>
</template>

<script>
	import { getMapLine, getAmapStaticMap } from '@/service/api.js'

	export default {
		data() {
			return {
				train: '',
				loading: false,
				lineData: null
			}
		},
		computed: {
			stationNames() {
				if (!this.lineData || !this.lineData.stations) return []
				return this.lineData.stations.map(s => {
					return Object.keys(s)[0]
				})
			},
			staticMapUrl() {
				if (!this.lineData || !this.lineData.stations || this.lineData.stations.length < 2) return ''

				// 1. 所有车站坐标 → markers
				const markers = this.lineData.stations.map(s => {
					const coord = Object.values(s)[0]
					return coord ? coord.join(',') : null
				}).filter(Boolean).join(';')

				// 2. 按 index 排序分段 → 拼接 paths（高德用 paths 复数）
				const train = this.lineData.train || {}
				const segments = Object.entries(train).sort((a, b) => (a[1].index || 0) - (b[1].index || 0))
				const pathCoords = []
				for (const [, seg] of segments) {
					if (seg.line && Array.isArray(seg.line)) {
						for (const point of seg.line) {
							pathCoords.push(point.join(','))
						}
					}
				}
				if (pathCoords.length < 2) return ''

				// 3. 生成 URL（高德会自动根据 paths 计算居中位置和缩放级别）
				const markerStr = `mid,0xDD3333,0:${markers}`
				const pathsStr = `3,0x3377FF,0.8,,:${pathCoords.join(';')}`

				return getAmapStaticMap('600*400', markerStr, pathsStr)
			}
		},
		methods: {
			async fetchLineMap() {
				if (!this.train.trim()) {
					uni.showToast({ title: '请输入车次号', icon: 'none' })
					return
				}
				this.loading = true
				this.lineData = null
				try {
					const res = await getMapLine(this.train.trim())
					if (res.success && res.data) {
						this.lineData = res.data
					} else {
						uni.showToast({ title: res.msg || '查询失败', icon: 'none' })
					}
				} catch (err) {
					uni.showToast({ title: '网络异常', icon: 'none' })
				} finally {
					this.loading = false
				}
			}
		}
	}
</script>

<style lang="scss">
	.page {
		min-height: 100vh;
		background: #f4f6f9;
		padding: 20rpx;
	}

	.search-box {
		background: #fff;
		border-radius: 20rpx;
		padding: 24rpx;
		display: flex;
		align-items: center;
		gap: 16rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
		margin-bottom: 20rpx;
	}

	.search-label {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		padding: 14rpx 20rpx;
		background: #f5f7fa;
		border-radius: 12rpx;
		font-size: 28rpx;
	}

	.search-btn {
		background: #1a73e8;
		color: #fff;
		font-size: 26rpx;
		padding: 0 28rpx;
		height: 60rpx;
		line-height: 60rpx;
		border-radius: 50rpx;
		flex-shrink: 0;
	}

	.loading-state {
		text-align: center;
		padding: 80rpx 0;
		color: #999;
		font-size: 28rpx;
	}

	.stations-card, .map-card, .segments-card {
		background: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
	}

	.card-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 20rpx;
		padding-left: 16rpx;
		border-left: 6rpx solid #1a73e8;
	}

	.station-list {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.station-marker {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.marker-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background: #4A90D9;
		flex-shrink: 0;
	}

	.marker-dot.start {
		background: #50C878;
		width: 20rpx;
		height: 20rpx;
	}

	.marker-dot.end {
		background: #FF6B35;
		width: 20rpx;
		height: 20rpx;
	}

	.marker-name {
		font-size: 28rpx;
		color: #333;
		flex: 1;
	}

	.marker-index {
		font-size: 22rpx;
		color: #bbb;
	}

	.map-image {
		width: 100%;
		border-radius: 12rpx;
	}

	.segment-item {
		display: flex;
		justify-content: space-between;
		padding: 16rpx 0;
		border-bottom: 1rpx solid #f5f5f5;
	}

	.segment-item:last-child {
		border-bottom: none;
	}

	.seg-name {
		font-size: 24rpx;
		color: #555;
	}

	.seg-points {
		font-size: 22rpx;
		color: #bbb;
	}

	.empty-state {
		text-align: center;
		padding: 100rpx 0;
		color: #999;
		font-size: 28rpx;
	}
</style>
