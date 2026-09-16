<template>
	<view class="page">
		<view class="train-info" v-if="trainInfo.train_number">
			<view class="train-header">
				<text class="train-no">{{ trainInfo.train_number }}</text>
				<view class="train-route">
					<text class="route-text">{{ trainInfo.origin }} → {{ trainInfo.destination }}</text>
					<text class="route-time">{{ trainInfo.depart_time }} - {{ trainInfo.arrive_time }}</text>
				</view>
			</view>
			<view class="train-meta">
				<text class="meta-item">日期: {{ trainInfo.date }}</text>
				<text class="meta-item">共 {{ trainInfo.total_stops }} 站</text>
			</view>
		</view>

		<view class="timetable" v-if="stops.length > 0">
			<view class="stop-item" v-for="(stop, index) in stops" :key="index">
				<view class="stop-timeline">
					<view class="stop-dot" :class="{ 'first': index === 0, 'last': index === stops.length - 1 }"></view>
					<view class="stop-line" v-if="index < stops.length - 1"></view>
				</view>
				<view class="stop-content">
					<view class="stop-header">
						<text class="stop-no">{{ stop.station_no }}</text>
						<text class="stop-name">{{ stop.station_name }}</text>
					</view>
					<view class="stop-time">
						<text class="time-label">到达</text>
						<text class="time-value">{{ stop.arrive_time || '—' }}</text>
						<text class="time-sep">|</text>
						<text class="time-label">出发</text>
						<text class="time-value">{{ stop.depart_time || '—' }}</text>
					</view>
					<view class="stop-stay" v-if="stop.stopover_display">
						停靠 {{ stop.stopover_display }}
					</view>
				</view>
			</view>
		</view>

		<view class="empty-state" v-if="!loading && stops.length === 0">
			<text>请输入车次号查询时刻表</text>
		</view>
	</view>
</template>

<script>
	import { getTrainTimeTable } from '@/service/api.js'

	export default {
		data() {
			return {
				train: '',
				date: '',
				loading: false,
				trainInfo: {},
				stops: []
			}
		},
		onLoad(options) {
			if (options.train) {
				this.train = options.train
			}
			if (options.date) {
				this.date = options.date
			} else {
				const d = new Date()
				this.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
			}
			if (this.train) {
				this.fetchTimetable()
			}
		},
		onNavigationBarButtonTap() {
			this.promptTrain()
		},
		methods: {
			async fetchTimetable() {
				if (!this.train.trim()) {
					uni.showToast({ title: '请输入车次号', icon: 'none' })
					return
				}
				this.loading = true
				try {
					const res = await getTrainTimeTable(this.train.trim(), this.date)
					if (res.code === 0 && res.data) {
						this.trainInfo = res.data
						this.stops = res.data.stops || []
						uni.setNavigationBarTitle({ title: `${this.train}次列车时刻表` })
					} else {
						this.stops = []
						uni.showToast({ title: res.msg || '查询失败', icon: 'none' })
					}
				} catch (err) {
					this.stops = []
					uni.showToast({ title: '网络异常', icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			promptTrain() {
				uni.showModal({
					title: '查询时刻表',
					content: '请输入车次号（如 G1）',
					editable: true,
					placeholderText: this.train,
					success: (res) => {
						if (res.confirm && res.content) {
							this.train = res.content.trim()
							this.fetchTimetable()
						}
					}
				})
			}
		}
	}
</script>

<style lang="scss">
	.page { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased;
		min-height: 100vh;
		background: #f2f2f7;
		padding: 20rpx;
	}

	.train-info {
		background: linear-gradient(135deg, #007aff, #4A90D9);
		border-radius: 20rpx;
		padding: 30rpx;
		color: #fff;
		margin-bottom: 20rpx;
	}

	.train-header {
		display: flex;
		align-items: center;
	}

	.train-no {
		font-size: 48rpx;
		font-weight: bold;
		margin-right: 24rpx;
	}

	.train-route {
		flex: 1;
	}

	.route-text {
		font-size: 28rpx;
		display: block;
	}

	.route-time {
		font-size: 24rpx;
		opacity: 0.8;
		display: block;
		margin-top: 4rpx;
	}

	.train-meta {
		display: flex;
		gap: 30rpx;
		margin-top: 16rpx;
		padding-top: 16rpx;
		border-top: 1rpx solid rgba(255, 255, 255, 0.2);
	}

	.meta-item {
		font-size: 22rpx;
		opacity: 0.85;
	}

	.timetable {
		background: #fff;
		border-radius: 20rpx;
		padding: 20rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
	}

	.stop-item {
		display: flex;
		padding: 16rpx 0;
	}

	.stop-timeline {
		width: 40rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stop-dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		background: #007aff;
		flex-shrink: 0;
	}

	.stop-dot.first {
		background: #50C878;
		width: 20rpx;
		height: 20rpx;
	}

	.stop-dot.last {
		background: #ff6b35;
		width: 20rpx;
		height: 20rpx;
	}

	.stop-line {
		width: 2rpx;
		flex: 1;
		background: #e0e0e0;
	}

	.stop-content {
		flex: 1;
		margin-left: 16rpx;
		padding-bottom: 16rpx;
		border-bottom: 1rpx solid #f2f2f7;
	}

	.stop-item:last-child .stop-content {
		border-bottom: none;
		padding-bottom: 0;
	}

	.stop-header {
		display: flex;
		align-items: center;
		margin-bottom: 8rpx;
	}

	.stop-no {
		font-size: 22rpx;
		color: #999;
		background: #f0f0f0;
		padding: 2rpx 12rpx;
		border-radius: 10rpx;
		margin-right: 12rpx;
	}

	.stop-name {
		font-size: 30rpx;
		font-weight: bold;
		color: #333;
	}

	.stop-time {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}

	.time-label {
		font-size: 22rpx;
		color: #999;
	}

	.time-value {
		font-size: 28rpx;
		color: #333;
		font-weight: bold;
	}

	.time-sep {
		font-size: 22rpx;
		color: #ddd;
	}

	.stop-stay {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: #ff6b35;
	}

	.empty-state {
		text-align: center;
		padding: 100rpx 0;
		color: #999;
		font-size: 28rpx;
	}
</style>
