<template>
	<view class="page">
		<!-- 搜索表单 -->
		<view class="search-form">
			<view class="form-row">
				<view class="form-item">
					<text class="form-label">出发站</text>
					<input class="form-input" v-model="from" placeholder="如：北京南" @confirm="swapStation" />
				</view>
				<view class="swap-btn" @tap="swapStation">
					<text>⇄</text>
				</view>
				<view class="form-item">
					<text class="form-label">到达站</text>
					<input class="form-input" v-model="to" placeholder="如：上海虹桥" @confirm="searchTrains" />
				</view>
			</view>
			<view class="form-row date-row">
				<view class="form-item date-item">
					<text class="form-label">日期</text>
					<picker mode="date" :value="date" @change="onDateChange">
						<view class="date-picker">{{ date }}</view>
					</picker>
				</view>
				<button class="search-btn" @tap="searchTrains" :loading="loading">查 询</button>
			</view>
		</view>

		<!-- 历史/快捷选择 -->
		<view class="quick-stations" v-if="!searched">
			<view class="section-title">常用车站</view>
			<view class="station-tags">
				<view class="tag" v-for="(s, i) in quickStations" :key="i" @tap="fillStation(s)">{{ s }}</view>
			</view>
		</view>

		<!-- 查询结果 -->
		<view class="result-section" v-if="searched">
			<view class="result-header">
				<text class="result-route">{{ result.from }} → {{ result.to }}</text>
				<text class="result-date">{{ result.date }}</text>
			</view>
			<view class="result-count" v-if="result.total !== undefined">
				共查询到 <text class="count-num">{{ result.total }}</text> 个车次
			</view>
			<view class="train-list" v-if="trains.length > 0">
				<view class="train-card" v-for="(train, index) in trains" :key="index"
					@tap="goToTimetable(train.trainNo)">
					<view class="train-header">
						<text class="train-no">{{ train.trainNo }}</text>
						<text class="train-duration">{{ train.duration }}</text>
					</view>
					<view class="train-stations">
						<view class="station-item">
							<view class="station-badge origin">始</view>
							<view class="station-dot"></view>
							<text class="station-name">{{ train.fromStation }}</text>
						</view>
						<view class="station-line"></view>
						<view class="station-item">
							<text class="station-name">{{ train.toStation }}</text>
							<view class="station-dot arrival"></view>
							<view class="station-badge terminal">终</view>
						</view>
					</view>
					<view class="train-time">
						<text class="time-value">{{ train.fromTime }}</text>
						<text class="time-sep">→</text>
						<text class="time-value">{{ train.toTime }}</text>
					</view>
					<!-- 余票信息（仅显示有票的席别） -->
					<view class="ticket-row" v-if="availableSeats(train).length">
						<text class="ticket-label">余票</text>
						<view class="ticket-tags">
							<view class="ticket-tag" v-for="(seat, i) in availableSeats(train)" :key="i">
								<text class="ticket-name">{{ seat.name }}</text>
								<text class="ticket-value">{{ seat.value }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
			<view class="empty-state" v-if="trains.length === 0 && !loading">
				<text>未查询到车次信息</text>
			</view>
			<view class="elapsed" v-if="result.elapsed">
				查询耗时: {{ result.elapsed }}
			</view>
		</view>
	</view>
</template>

<script>
	import { getTrains, getLeftTickets } from '@/service/api.js'
	import { getName, resolveTelecode } from '@/common/station.js'

	// 席别 显示顺序 & 中文名
	const SEAT_TYPES = [
		{ key: 'businessSeat', name: '商务座' },
		{ key: 'premiumFirstClass', name: '优选一等座' },
		{ key: 'firstClass', name: '一等座' },
		{ key: 'secondClass', name: '二等座' },
		{ key: 'advancedSleeper', name: '高级软卧' },
		{ key: 'softSleeper', name: '软卧' },
		{ key: 'hardSleeper', name: '硬卧' },
		{ key: 'softSeat', name: '软座' },
		{ key: 'hardSeat', name: '硬座' },
		{ key: 'noSeat', name: '无座' },
		{ key: 'other', name: '其他' }
	]

	export default {
		data() {
			return {
				from: '',
				to: '',
				date: '',
				loading: false,
				searched: false,
				result: {},
				trains: [],
				seatMap: {},       // key: trainNo|fromTime|toTime → { seatKey: value }
				quickStations: ['北京南', '上海虹桥', '广州南', '深圳北', '杭州东', '成都东', '武汉', '南京南']
			}
		},
		onLoad() {
			const d = new Date()
			this.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
		},
		methods: {
			swapStation() {
				const tmp = this.from
				this.from = this.to
				this.to = tmp
			},
			onDateChange(e) {
				this.date = e.detail.value
			},
			fillStation(name) {
				if (!this.from) {
					this.from = name
				} else if (!this.to) {
					this.to = name
				} else {
					this.from = name
					this.to = ''
				}
			},
			async searchTrains() {
				if (!this.from.trim()) {
					uni.showToast({ title: '请输入出发站', icon: 'none' })
					return
				}
				if (!this.to.trim()) {
					uni.showToast({ title: '请输入到达站', icon: 'none' })
					return
				}
				this.loading = true
				this.searched = true
				try {
					const fromVal = this.from.trim()
					const toVal = this.to.trim()
					const res = await getTrains(fromVal, toVal, this.date)
					if (res.success) {
						this.result = res
						const list = res.trains || []
						this.trains = await Promise.all(list.map(async (train) => ({
							...train,
							fromStation: (await getName(train.fromStation)) || train.fromStation,
							toStation: (await getName(train.toStation)) || train.toStation
						})))
						// 并行获取余票信息
						this.fetchLeftTickets(fromVal, toVal)
					} else {
						this.trains = []
						this.seatMap = {}
						uni.showToast({ title: '查询失败', icon: 'none' })
					}
				} catch (err) {
					this.trains = []
					this.seatMap = {}
					uni.showToast({ title: '网络异常', icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			// 解析出发/到达站为电报码并请求余票
			async fetchLeftTickets(fromVal, toVal) {
				try {
					const [fromTc, toTc] = await Promise.all([
						resolveTelecode(fromVal),
						resolveTelecode(toVal)
					])
					const fromCode = fromTc.telecode
					const toCode = toTc.telecode
					if (!fromCode || !toCode) return
					const { success, trains } = await getLeftTickets(fromCode, toCode, this.date)
					if (!success || !Array.isArray(trains)) return
					const map = {}
					for (const t of trains) {
						if (!t.seats) continue
						const key = `${t.trainNo}|${t.fromTime}|${t.toTime}`
						map[key] = t.seats
					}
					this.seatMap = map
				} catch (e) {
					// 余票查询失败不影响车次展示
					console.error('余票查询失败', e)
				}
			},
			// 返回某车次"非--"的席别
			availableSeats(train) {
				const key = `${train.trainNo}|${train.fromTime}|${train.toTime}`
				const seats = this.seatMap[key]
				if (!seats) return []
				const result = []
				for (const st of SEAT_TYPES) {
					const val = seats[st.key]
					if (val != null && val !== '--' && val !== '') {
						result.push({ name: st.name, value: val })
					}
				}
				return result
			},
			goToTimetable(trainNo) {
				uni.navigateTo({
					url: `/pages/timetable/timetable?train=${trainNo}&date=${this.date}`
				})
			}
		}
	}
</script>

<style lang="scss">
.page { background: #f2f2f7; min-height: 100vh; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased; }

.search-form { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 14px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 0.5px solid rgba(60,60,67,0.06); }
.form-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.form-row:last-child { margin-bottom: 0; }
.form-item { flex: 1; }
.form-label { font-size: 13px; font-weight: 600; color: #8e8e93; margin-bottom: 4px; display: block; text-transform: uppercase; letter-spacing: 0.5px; }
.form-input { width: 100%; font-size: 17px; color: #1c1c1e; padding: 15px 14px; background: #f5f7fa; border-radius: 10px; border: none; outline: none; box-sizing: border-box; height: 52px; }

.swap-btn { flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%; background: #f2f2f7; display: flex; align-items: center; justify-content: center; margin-top: 18px; font-size: 18px; color: #007aff; }
.swap-btn:active { background: #e5e5ea; }
.date-row { align-items: flex-end; }
.date-item { flex: 1; }
.date-picker { font-size: 17px; color: #1c1c1e; padding: 15px 14px; background: #f5f7fa; border-radius: 10px; height: 52px; display: flex; align-items: center; box-sizing: border-box; }

.search-btn { flex-shrink: 0; background: #007aff; color: #fff; font-size: 16px; font-weight: 600; padding: 0 28px; height: 44px; line-height: 44px; border-radius: 22px; border: none; margin: 0; }
.search-btn:active { opacity: 0.8; }

.section-title { font-size: 13px; font-weight: 600; color: #8e8e93; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding-left: 4px; }
.station-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { padding: 8px 16px; background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 20px; font-size: 14px; color: #1c1c1e; font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,0.04); border: 0.5px solid rgba(60,60,67,0.06); }
.tag:active { background: rgba(255,255,255,0.5); }

.result-section { margin-top: 8px; }
.result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 0 4px; }
.result-route { font-size: 17px; font-weight: 700; color: #1c1c1e; }
.result-date { font-size: 14px; color: #8e8e93; }
.result-count { font-size: 13px; color: #8e8e93; margin-bottom: 12px; padding: 0 4px; }
.count-num { color: #007aff; font-weight: 600; }

.train-list { display: flex; flex-direction: column; gap: 10px; }
.train-card { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 14px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); border: 0.5px solid rgba(60,60,67,0.06); }
.train-card:active { opacity: 0.7; }
.train-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.train-no { font-size: 20px; font-weight: 700; color: #007aff; }
.train-duration { font-size: 14px; color: #8e8e93; background: #f2f2f7; padding: 2px 10px; border-radius: 10px; }

.train-stations { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.station-item { display: flex; align-items: center; gap: 6px; }
.station-dot { width: 8px; height: 8px; border-radius: 50%; background: #007aff; }
.station-dot.arrival { background: #ff3b30; }
.station-line { flex: 1; height: 1px; border-top: 1px dashed #c6c6c8; }
.station-name { font-size: 14px; color: #3a3a3c; font-weight: 500; }

/* 始发/终到小方格标注 */
.station-badge {
	font-size: 11px;
	font-weight: 700;
	color: #fff;
	width: 18px;
	height: 18px;
	line-height: 18px;
	text-align: center;
	border-radius: 4px;
	flex-shrink: 0;
	user-select: none;
}
.station-badge.origin { background: #f5a623; }   /* 始发站：黄色 */
.station-badge.terminal { background: #34c759; } /* 终到站：绿色 */

.train-time { display: flex; align-items: center; gap: 8px; padding-left: 14px; }
.time-value { font-size: 15px; color: #1c1c1e; font-weight: 600; }
.time-sep { font-size: 12px; color: #c6c6c8; }

/* ===== 余票 ===== */
.ticket-row { display: flex; align-items: flex-start; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 0.5px solid rgba(60,60,67,0.08); }
.ticket-label { font-size: 12px; color: #8e8e93; font-weight: 600; flex-shrink: 0; padding-top: 2px; }
.ticket-tags { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.ticket-tag { display: flex; align-items: baseline; gap: 5px; padding: 3px 9px; background: rgba(52,199,89,0.12); border-radius: 8px; }
.ticket-name { font-size: 12px; color: #2e7d46; font-weight: 600; }
.ticket-value { font-size: 12px; color: #34c759; font-weight: 700; }

.empty-state { text-align: center; padding: 60px 0; color: #8e8e93; font-size: 15px; }
.elapsed { text-align: center; padding: 12px 0; font-size: 12px; color: #c6c6c8; }
</style>
