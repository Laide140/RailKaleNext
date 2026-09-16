<template>
	<view class="page">
		<!-- 车站选择 -->
		<view class="search-box">
			<text class="search-label">车站名称</text>
			<input class="search-input" v-model="stationCode" placeholder="如：北京南" @confirm="fetchScreen" />
			<button class="search-btn" @tap="fetchScreen" :loading="loading">查询</button>
		</view>

		<!-- 状态说明 -->
		<view class="legend">
			<view class="legend-item"><view class="legend-dot on-time"></view>正点</view>
			<view class="legend-item"><view class="legend-dot delay"></view>晚点</view>
			<view class="legend-item"><view class="legend-dot early"></view>早点</view>
			<view class="legend-item"><view class="legend-dot checking"></view>检票中</view>
			<view class="legend-item"><view class="legend-dot stopped"></view>停检</view>
			<view class="legend-item"><view class="legend-dot canceled"></view>取消</view>
		</view>

		<!-- 大屏列表 -->
		<view class="screen-list" v-if="list.length > 0">
			<view class="screen-header">
				<text class="header-time">时间</text>
				<text class="header-train">车次</text>
				<text class="header-route">区间</text>
				<text class="header-status">状态</text>
			</view>
			<view class="screen-item" v-for="(item, index) in list" :key="index">
				<text class="cell-time">{{ item.time }}</text>
				<text class="cell-train">{{ item.trainNum }}</text>
				<text class="cell-route">{{ item.trainStartStation }}/{{ item.trainEndStation || '—' }}</text>
				<view class="cell-status">
					<text class="status-tag" :class="statusClass(item.bigScreenStatusCode)">{{ item.bigScreenStatus }}</text>
				</view>
			</view>
		</view>

		<view class="empty-state" v-if="list.length === 0 && !loading">
			<text>输入车站名称查询大屏信息</text>
		</view>
	</view>
</template>

<script>
	import { getStationBigScreen } from '@/service/api.js'
	import { resolveTelecode } from '@/common/station.js'

	export default {
		data() {
			return {
				stationCode: '',
				loading: false,
				list: []
			}
		},
		methods: {
			statusClass(code) {
				const map = {
					'ON_TIME': 'on-time',
					'DELAY': 'delay',
					'CHECK_BEGIN': 'checking',
					'CHECK_STOP': 'stopped',
					'CANCELED': 'canceled',
					'WAITING': 'waiting',
					'EARLY': 'early'
				}
				return map[code] || ''
			},
			async fetchScreen() {
				if (!this.stationCode.trim()) {
					uni.showToast({ title: '请输入车站', icon: 'none' })
					return
				}
				this.loading = true
				try {
					const { telecode, name } = await resolveTelecode(this.stationCode)
					const res = await getStationBigScreen(telecode)
					if (res.success && res.data) {
						this.list = res.data
						if (name) {
							uni.setNavigationBarTitle({ title: name + ' 车站大屏' })
						}
					} else {
						this.list = []
						uni.showToast({ title: res.msg || '查询失败', icon: 'none' })
					}
				} catch (err) {
					this.list = []
					uni.showToast({ title: '网络异常', icon: 'none' })
				} finally {
					this.loading = false
				}
			}
		}
	}
</script>

<style lang="scss">
	.page { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased;
		min-height: 100vh;
		background: #0a1628;
		padding: 20rpx;
	}

	.search-box {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 20rpx;
		padding: 24rpx;
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.search-label {
		font-size: 26rpx;
		color: #8ab4f8;
		font-weight: bold;
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		font-size: 28rpx;
		color: #fff;
		padding: 14rpx 20rpx;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 12rpx;
	}

	.search-btn {
		flex-shrink: 0;
		background: #007aff;
		color: #fff;
		font-size: 26rpx;
		padding: 0 28rpx;
		height: 60rpx;
		line-height: 60rpx;
		border-radius: 50rpx;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin: 20rpx 0;
		padding: 16rpx;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 12rpx;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 6rpx;
		font-size: 20rpx;
		color: #aaa;
	}

	.legend-dot {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
	}

	.legend-dot.on-time { background: #50C878; }
	.legend-dot.delay { background: #FF6B35; }
	.legend-dot.early { background: #3498DB; }
	.legend-dot.checking { background: #F1C40F; }
	.legend-dot.stopped { background: #999; }
	.legend-dot.canceled { background: #E74C3C; }
	.legend-dot.waiting { background: #8E44AD; }

	.screen-list {
		margin-top: 10rpx;
	}

	.screen-header {
		display: flex;
		padding: 16rpx 20rpx;
		font-size: 22rpx;
		color: #668;
		border-bottom: 1rpx solid rgba(255, 255, 255, 0.05);
	}

	.header-time { width: 18%; }
	.header-train { width: 20%; }
	.header-route { width: 37%; }
	.header-status { width: 25%; text-align: right; }

	.screen-item {
		display: flex;
		align-items: center;
		padding: 20rpx 20rpx;
		border-bottom: 1rpx solid rgba(255, 255, 255, 0.03);
		font-size: 26rpx;
	}

	.cell-time {
		width: 18%;
		color: #8ab4f8;
		font-family: monospace;
	}

	.cell-train {
		width: 20%;
		color: #fff;
		font-weight: bold;
	}

	.cell-route {
		width: 37%;
		color: #ccc;
		font-size: 24rpx;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cell-status {
		width: 25%;
		text-align: right;
	}

	.status-tag {
		display: inline-block;
		padding: 4rpx 16rpx;
		border-radius: 20rpx;
		font-size: 22rpx;
	}

	.status-tag.on-time { background: rgba(80, 200, 120, 0.2); color: #50C878; }
	.status-tag.delay { background: rgba(255, 107, 53, 0.2); color: #FF6B35; }
	.status-tag.checking { background: rgba(241, 196, 15, 0.2); color: #F1C40F; }
	.status-tag.stopped { background: rgba(153, 153, 153, 0.2); color: #999; }
	.status-tag.canceled { background: rgba(231, 76, 60, 0.2); color: #E74C3C; }
	.status-tag.waiting { background: rgba(142, 68, 173, 0.2); color: #BB86FC; }
	.status-tag.early { background: rgba(52, 152, 219, 0.2); color: #3498DB; }

	.empty-state {
		text-align: center;
		padding: 100rpx 0;
		color: #668;
		font-size: 28rpx;
	}
</style>
