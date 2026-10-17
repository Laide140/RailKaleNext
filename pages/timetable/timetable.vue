<template>
	<view class="page" :style="themeStyle">
		<!-- 顶部搜索框：输入车次查询时刻表 -->
		<view class="search-section">
			<i class="fas fa-search search-icon"></i>
			<input
				class="search-input"
				v-model="train"
				placeholder="输入车次，如 G1"
				placeholder-class="search-placeholder"
				confirm-type="search"
				@confirm="fetchTimetable"
			/>
			<text class="search-cancel" v-if="train" @click="train = ''">✕</text>
			<view class="search-btn" @click="fetchTimetable">查询</view>
		</view>

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
						<text class="stop-day" v-if="dayTagOf(index)">{{ dayTagOf(index) }}</text>
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
		<app-toast ref="toast" />
		<app-action-sheet ref="sheet" />
	</view>
</template>

<script>
	import { getTrainTimeTable } from '@/service/api.js'

	// 'HH:MM' → 当天分钟数；无法解析返回 null
	function toMinutes(t) {
		const m = /^(\d{1,2}):(\d{2})/.exec(String(t || ''))
		return m ? Number(m[1]) * 60 + Number(m[2]) : null
	}
	function pad(n) { return String(n).padStart(2, '0') }
	function formatToday() {
		const d = new Date()
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
	}
	function addDays(str, n) {
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''))
		if (!m) return str
		const d = new Date(+m[1], +m[2] - 1, +m[3])
		d.setDate(d.getDate() + n)
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
	}

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
		computed: {
			// 跨天车：始发时间晚于终到时间
			isOvernight() {
				const dep = toMinutes(this.trainInfo.depart_time)
				const arr = toMinutes(this.trainInfo.arrive_time)
				if (dep === null || arr === null) return false
				return dep > arr
			},
			/**
			 * 沿途各站相对发车日的天偏移：以始发站为第 0 天，
			 * 逐站比较上一站出发与本站到达，发 > 到 即跨过零点，偏移 +1。
			 * 非跨天车返回空数组。
			 */
			dayOffsets() {
				if (!this.isOvernight) return []
				const out = []
				let day = 0
				for (let i = 0; i < this.stops.length; i++) {
					const prev = this.stops[i - 1]
					if (prev) {
						const d = toMinutes(prev.depart_time)
						const a = toMinutes(this.stops[i].arrive_time)
						if (d !== null && a !== null && d > a) day += 1
					}
					out.push(day)
				}
				return out
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
		methods: {
			// 站点天标记：只标注「昨天」「明天」，即发车当天对应的站点不标注
			dayTagOf(index) {
				const off = this.dayOffsets[index]
				if (off === undefined || off === 0) return ''
				return off < 0 ? '昨天' : '明天'
			},
			/**
			 * 跨天车次查询后弹框确认发车日。
			 * 跨天车（始发晚于终到）在查询日次日才到站，
			 * 「昨天发车」那趟此刻可能仍在跑，必须让用户明确选一班。
			 */
			async askDepartDate(tt) {
				if (!tt) return
				const dep = toMinutes(tt.depart_time)
				const arr = toMinutes(tt.arrive_time)
				if (dep === null || arr === null || dep <= arr) return   // 非跨天车
				if (this._departAsked === this.train + this.date) return // 已确认过

				const base = this.date || formatToday()
				const y = addDays(base, -1)
				const idx = await this.sheet({
					title: `${this.train} 是跨天车次，请选择发车日`,
					itemList: [`${y} 发车`, `${base} 发车`],
					cancelText: '取消'
				})
				if (idx < 0) return
				const picked = idx === 0 ? y : base
				this._departAsked = this.train + picked
				if (picked === this.date) return
				this.date = picked
				this.fetchTimetable()
			},
			async fetchTimetable() {
				if (!this.train.trim()) {
					this.toast('请输入车次号')
					return
				}
				this.loading = true
				try {
					const res = await getTrainTimeTable(this.train.trim(), this.date)
					if (res.code === 0 && res.data) {
						this.trainInfo = res.data
						this.stops = res.data.stops || []
						uni.setNavigationBarTitle({ title: `${this.train}次列车时刻表` })
						// 跨天车次：同一车次号每天发一班，需先确认用户要哪一天发的
						this.askDepartDate(res.data)
					} else {
						this.stops = []
						this.toast(res.msg || '查询失败')
					}
				} catch (err) {
					this.stops = []
					this.toast('网络异常')
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
		background: #f2f2f7;
		padding: 20rpx;
	}

	.stop-day {
		font-size: 20rpx; font-weight: 600; color: var(--theme-text);
		background: var(--theme-soft); border-radius: 10rpx; padding: 2rpx 12rpx;
	}

	/* ===== 搜索框 ===== */
	.search-section {
		display: flex; align-items: center; gap: 10px;
		background: var(--card);
		border-radius: 12px;
		padding: 10px 10px 10px 16px;
		margin-bottom: 20rpx;
		border: 1px solid var(--theme-border);
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
	}
	.search-icon { font-size: 17px; color: var(--theme-text); }
	.search-input {
		flex: 1;
		font-size: 17px;
		color: var(--label);
		background: transparent;
		border: none;
		outline: none;
		/* uni-app 的 input 需显式高度 */
		height: 44px;
		line-height: 44px;
	}
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

	.train-info {
		/* 装饰性车次横幅：跟随主题色 */
		background: var(--theme);
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
