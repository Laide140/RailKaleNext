<template>
	<view class="page">
		<view class="search-box">
			<text class="search-label">车次号</text>
			<input class="search-input" v-model="train" placeholder="如：D190" @confirm="fetchLocation" />
			<button class="search-btn" @tap="fetchLocation" :loading="loading">定位</button>
		</view>

		<view class="live-badge" v-if="polling">
			<text class="live-dot"></text>
			<text class="live-text">实时追踪中（2秒/次）</text>
		</view>

		<view class="loading-state" v-if="loading && !data">
			<view class="loading-spinner"></view>
			<text>正在查询列车位置...</text>
		</view>

		<view class="location-info" v-if="data">
			<view class="status-bar" :class="statusClass">
				<i class="fas status-icon" :class="statusIcon"></i>
				<view class="status-text">
					<text class="status-title">{{ statusText }}</text>
					<text class="status-time">{{ data.time }}</text>
				</view>
			</view>

			<view class="info-card">
				<view class="info-row">
					<text class="info-label">列车</text>
					<text class="info-value">{{ data.train }}</text>
				</view>
				<view class="info-row" v-if="data.from_station || data.to_station">
					<text class="info-label">运行区间</text>
					<text class="info-value">{{ data.from_station || '?' }} → {{ data.to_station || '?' }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">当前进度</text>
					<text class="info-value progress-value">{{ data.progress }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">车组号</text>
					<text class="info-value">{{ emu || '—' }}</text>
				</view>
				<view class="info-row" v-if="data.segment">
					<text class="info-label">本段区间</text>
					<text class="info-value">{{ data.segment.depart_time }} - {{ data.segment.arrive_time }}</text>
				</view>
				<view class="info-row">
					<text class="info-label">状态</text>
					<text class="info-value">{{ data.station ? (data.station + ' ' + data.progress) : (statusText) }}</text>
				</view>
			</view>

			<view class="coord-card">
				<text class="coord-title">当前位置</text>
				<view class="coord-row">
					<text>经度: {{ lngFormatted }}</text>
					<text>纬度: {{ latFormatted }}</text>
				</view>
				<image class="map-image" :src="mapImage" mode="widthFix" v-if="mapImage"></image>
			</view>

			<view class="loading-mini" v-if="polling && !loading">
				<view class="mini-spinner"></view>
				<text>更新中...</text>
			</view>
		</view>

		<view class="empty-state" v-if="!loading && !data && !error">
			<text>输入车次号查询列车实时位置</text>
		</view>

		<view class="error-state" v-if="!loading && error">
			<text>{{ error }}</text>
			<text class="retry-text" @tap="fetchLocation" v-if="error">点击重试</text>
		</view>
	</view>
</template>

<script>
	import { getTrainLocate } from '@/service/api.js'
	import { getKey } from '@/common/keys.js'

	export default {
		data() {
			return { train: '', loading: false, data: null, error: '', polling: false, _pollTimer: null, emu: '' }
		},
		computed: {
			statusClass() {
				if (!this.data) return ''
				if (this.data.status === 'running') return 'status-running'
				if (this.data.status === 'arrived') return 'status-arrived'
				return 'status-waiting'
			},
			statusIcon() {
				if (!this.data) return 'fa-train'
				if (this.data.status === 'running') return 'fa-train'
				if (this.data.status === 'arrived') return 'fa-check-circle'
				return 'fa-pause-circle'
			},
			statusText() {
				if (!this.data) return ''
				if (this.data.status === 'running') return '运行中'
				if (this.data.status === 'arrived') return '已到达'
				return '等待中'
			},
			lngFormatted() {
				if (!this.data || !this.data.position) return ''
				var lng = this.data.position.gcj02_lng || this.data.position.lng
				return lng ? lng.toFixed(4) : ''
			},
			latFormatted() {
				if (!this.data || !this.data.position) return ''
				var lat = this.data.position.gcj02_lat || this.data.position.lat
				return lat ? lat.toFixed(4) : ''
			},
			mapImage() {
				if (!this.data || !this.data.position) return ''
				var pos = this.data.position
				var lng = pos.gcj02_lng || pos.lng
				var lat = pos.gcj02_lat || pos.lat
				if (!lng || !lat) return ''
				var marker = encodeURIComponent('large,0xDD3333,T:' + lng + ',' + lat)
				return 'https://restapi.amap.com/v3/staticmap?location=' + lng + ',' + lat + '&zoom=16&size=600*300&markers=' + marker + '&key=' + getKey('amap')
			}
		},
		onUnload() {
			this.stopPolling()
		},
		methods: {
			async fetchLocation() {
				if (!this.train.trim()) {
					uni.showToast({ title: '请输入车次号', icon: 'none' })
					return
				}
				this.stopPolling()
				this.loading = true
				this.error = ''
				this.emu = ''
				this.data = null
				try {
					await this.query()
					// 查询成功后拉取车组担当号
					this.fetchEmu(this.train.trim())
				} finally {
					this.loading = false
				}
			},

			async query() {
				var t = this.train.trim()
				try {
					var res = await getTrainLocate(t)
					if (res.code === 0 && res.data) {
						this.data = res.data
						this.error = ''
						this.startPolling()
					} else if (res.code === 0 && !res.data) {
						this.stopPolling()
						this.error = '列车已到达终点或尚未发车'
						this.data = null
					} else {
						this.stopPolling()
						this.error = res.msg || '查询失败'
					}
				} catch (err) {
					this.stopPolling()
					if (!this.data) this.error = '网络异常，请稍后重试'
				}
			},

			fetchEmu(train) {
			var self = this
			uni.request({
				url: 'https://api.rail.re/train/' + encodeURIComponent(train),
				responseType: 'text',
				success: function(r) {
					try {
						var arr = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
						if (Array.isArray(arr) && arr.length) {
							var today = new Date()
							var ds = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0')
							var f = arr.find(function(x){return x.date && x.date.indexOf(ds)===0})
							self.emu = (f && f.emu_no) || arr[0].emu_no
						}
					} catch(e) {}
				}
			})
		},

		startPolling() {
				this.stopPolling()
				this.polling = true
				var self = this
				this._pollTimer = setInterval(function() { self.query() }, 2000)
			},

			stopPolling() {
				this.polling = false
				if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null }
			}
		}
	}
</script>

<style lang="scss">
	.page { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; background: #f2f2f7; padding: 20rpx; }
	.search-box { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 14px; padding: 30rpx; display: flex; align-items: center; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); gap: 20rpx; }
	.search-label { font-size: 28rpx; color: #333; font-weight: bold; flex-shrink: 0; }
	.search-input { flex: 1; font-size: 30rpx; color: #333; padding: 16rpx 20rpx; background: #f5f7fa; border-radius: 12rpx; }
	.search-btn { flex-shrink: 0; background: #007aff; color: #fff; font-size: 26rpx; padding: 0 30rpx; height: 64rpx; line-height: 64rpx; border-radius: 50rpx; }

	.live-badge { display: flex; align-items: center; justify-content: center; gap: 8rpx; margin: 16rpx 0; }
	.live-dot { width: 12rpx; height: 12rpx; background: #50C878; border-radius: 50%; animation: pulse 1.5s infinite; }
	@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
	.live-text { font-size: 22rpx; color: #50C878; }

	.loading-state { display: flex; flex-direction: column; align-items: center; padding: 80rpx 0; color: #999; font-size: 26rpx; gap: 20rpx; }
	.loading-spinner { width: 48rpx; height: 48rpx; border: 4rpx solid #e0e0e0; border-top-color: #007aff; border-radius: 50%; animation: spin 1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }

	.status-bar { display: flex; align-items: center; padding: 24rpx 30rpx; border-radius: 20rpx; margin-bottom: 20rpx; gap: 16rpx; }
	.status-running { background: linear-gradient(135deg, #50C878, #2ECC71); }
	.status-arrived { background: linear-gradient(135deg, #999, #777); }
	.status-waiting { background: linear-gradient(135deg, #F39C12, #E67E22); }
	.status-icon { font-size: 52rpx; color: #fff; }
	.status-text { flex: 1; }
	.status-title { font-size: 32rpx; font-weight: bold; color: #fff; display: block; }
	.status-time { font-size: 22rpx; color: rgba(255,255,255,0.85); display: block; margin-top: 4rpx; }

	.info-card { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 14px; padding: 24rpx 30rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
	.info-row { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #f2f2f7; }
	.info-row:last-child { border-bottom: none; }
	.info-label { font-size: 26rpx; color: #999; }
	.info-value { font-size: 28rpx; color: #333; font-weight: bold; }
	.progress-value { color: #ff6b35; }

	.coord-card { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 14px; padding: 24rpx 30rpx; margin-bottom: 20rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.06); }
	.coord-title { font-size: 26rpx; color: #333; font-weight: bold; display: block; margin-bottom: 12rpx; }
	.coord-row { display: flex; justify-content: space-between; font-size: 24rpx; color: #666; margin-bottom: 16rpx; }
	.map-image { width: 100%; border-radius: 12rpx; }

	.loading-mini { display: flex; align-items: center; justify-content: center; gap: 10rpx; padding: 16rpx 0; color: #999; font-size: 24rpx; }
	.mini-spinner { width: 24rpx; height: 24rpx; border: 3rpx solid #e0e0e0; border-top-color: #007aff; border-radius: 50%; animation: spin 1s linear infinite; }

	.empty-state, .error-state { text-align: center; padding: 100rpx 40rpx; color: #999; font-size: 28rpx; }
	.error-state { color: #E74C3C; }
	.retry-text { display: block; margin-top: 20rpx; color: #007aff; font-size: 26rpx; }
</style>
