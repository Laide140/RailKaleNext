<template>
	<view class="page" :style="themeStyle">
		<!-- 顶部搜索框 -->
		<view class="search-section">
			<i class="fas fa-search search-icon"></i>
			<input
				class="search-input"
				v-model="searchText"
				placeholder="输入车次，如 G1"
				placeholder-class="search-placeholder"
				confirm-type="search"
				@confirm="doSearch"
			/>
			<text class="search-cancel" v-if="searchText" @tap="searchText = ''">✕</text>
			<!-- 日期选择：点击弹出日历，改日期后按新日期重查 -->
			<view class="date-btn" @tap="pickDate">
				<i class="fas fa-calendar-day"></i>
				<text class="date-text">{{ shortDate }}</text>
			</view>
			<view class="search-btn" @tap="doSearch">查询</view>
		</view>

		<!-- 车次标题 -->
		<view class="hero" v-if="trainNo">
			<view class="hero-main">
				<text class="hero-no">{{ trainNo }}</text>
				<view class="hero-route" v-if="origin">
					<text class="hero-route-text">{{ origin }}</text>
					<text class="hero-arrow">→</text>
					<text class="hero-route-text">{{ destination }}</text>
				</view>
			</view>
			<view class="hero-meta">
				<text class="hero-meta-item" v-if="date">{{ date }}</text>
				<text class="hero-meta-item" v-if="stops.length">共 {{ stops.length }} 站</text>
				<text class="hero-meta-item" v-if="departTime && arriveTime">{{ departTime }} - {{ arriveTime }}</text>
			</view>
			<view class="hero-status" v-if="statusText">
				<i class="fas" :class="isRunning ? 'fa-train' : 'fa-circle-info'"></i>
				<text>{{ statusText }}</text>
			</view>
		</view>

		<!-- 三个 Tab：下划线滑动 + 内容横向推入推出 -->
		<slide-tabs :items="tabs" v-model="activeTabIndex">

			<!-- ===== Tab 1：时刻 ===== -->
			<template #time>
			<view class="tab-panel">
			<view class="loading-state" v-if="loading">
				<view class="spinner"></view>
				<text>正在查询 {{ trainNo }} 次列车...</text>
			</view>
			<!-- 无数据空态：仅在加载完成后显示 -->
			<view class="empty-state" v-if="!loading && !stops.length">
				<i class="fas fa-calendar-alt empty-icon"></i>
				<text>未获取到时刻表数据</text>
			</view>
			<!-- 有数据：停台提示与站点列表并列，不参与 v-if/v-else 配对 -->
			<template v-if="stops.length">
				<view class="platform-hint" v-if="platformLoading">正在查询各站停台…</view>
				<view class="stops">
				<view class="stop" v-for="(stop, index) in stops" :key="index" :class="{ current: isCurrentStop(stop) }">
					<view class="stop-rail">
						<view class="stop-dot" :class="{ terminal: index === 0 || index === stops.length - 1 }"></view>
						<view class="stop-line" v-if="index < stops.length - 1"></view>
					</view>
					<view class="stop-body">
						<view class="stop-head">
							<text class="stop-name">{{ stop.station_name }}</text>
							<text class="stop-badge" v-if="isCurrentStop(stop)">当前</text>
							<!-- 每站右侧显示停靠站台 -->
							<text class="stop-platform" v-if="platformOf(stop)">停靠 {{ platformOf(stop) }} 站台</text>
						</view>
						<view class="stop-times">
							<view class="stop-time">
								<text class="stop-time-label">到达</text>
								<text class="stop-time-value">{{ stop.arrive_time || '—' }}</text>
							</view>
							<view class="stop-time">
								<text class="stop-time-label">出发</text>
								<text class="stop-time-value">{{ stop.depart_time || '—' }}</text>
							</view>
							<view class="stop-time" v-if="stop.stopover_display">
								<text class="stop-time-label">停靠</text>
								<text class="stop-time-value">{{ stop.stopover_display }}</text>
							</view>
						</view>
						<view class="stop-extra" v-if="entranceOf(stop)">
							<text class="stop-extra-text">{{ entranceOf(stop) }}</text>
						</view>
					</view>
				</view>
			</view>
			</template>
		</view>
			</template>

			<!-- ===== Tab 2：运行（实时位置 与 路径地图 分块展示）===== -->
			<template #run>
			<view class="tab-panel">
			<view class="loading-state" v-if="loading && !locate && !lineData">
				<view class="spinner"></view>
				<text>正在获取运行数据…</text>
			</view>
			<view class="panel-title">
				<view class="panel-bar"></view>
				<text class="panel-text">列车实时位置</text>
				<text class="panel-hint" v-if="polling">自动刷新</text>
			</view>
			<view class="card">
				<view class="card-head">
					<i class="fas fa-location-dot card-icon"></i>
					<text class="card-title">当前位置</text>
					<text class="card-live" v-if="polling">实时</text>
				</view>
				<view class="empty-inline" v-if="!locate">
					<text>列车尚未发车或已到达终点，暂无实时位置</text>
				</view>
				<view v-else>
					<view class="kv">
						<text class="kv-label">状态</text>
						<text class="kv-value">{{ statusText }}</text>
					</view>
					<view class="kv">
						<text class="kv-label">进度</text>
						<text class="kv-value">{{ locate.progress || '—' }}</text>
					</view>
					<view class="kv" v-if="locate.station">
						<text class="kv-label">最近车站</text>
						<text class="kv-value">{{ locate.station }}</text>
					</view>
					<view class="kv" v-if="locate.segment">
						<text class="kv-label">本段区间</text>
						<text class="kv-value">{{ locate.segment.depart_time }} - {{ locate.segment.arrive_time }}</text>
					</view>
					<view class="kv" v-if="positionText">
						<text class="kv-label">坐标</text>
						<text class="kv-value">{{ positionText }}</text>
					</view>
					<text class="card-note" v-if="locate.time">{{ locate.time }}</text>
				</view>
			</view>

			<view class="panel-title spaced">
				<view class="panel-bar"></view>
				<text class="panel-text">路径地图</text>
				<text class="panel-hint" v-if="lineData">共 {{ stationNames.length }} 站</text>
			</view>
			<view class="card">
				<view class="card-head">
					<i class="fas fa-route card-icon"></i>
					<text class="card-title">运行线路</text>
				</view>
				<view class="empty-inline" v-if="!lineData">
					<text>未获取到线路数据</text>
				</view>
				<template v-else>
					<image class="map-image" :src="staticMapUrl" mode="widthFix" v-if="staticMapUrl"></image>
					<view class="legend">
						<view class="legend-item"><view class="legend-dot legend-station"></view><text>途经车站</text></view>
						<view class="legend-item"><view class="legend-line"></view><text>运行路径</text></view>
					</view>
					<view class="station-chips">
						<text class="station-chip" v-for="(s, i) in stationNames" :key="i">{{ s }}</text>
					</view>
				</template>
			</view>

			<!-- 实时位置地图：独立一张图，放在路径地图下方 -->
			<view class="panel-title spaced">
				<view class="panel-bar"></view>
				<text class="panel-text">实时位置地图</text>
				<text class="panel-hint" v-if="polling">自动刷新</text>
			</view>
			<view class="card">
				<view class="empty-inline" v-if="!position">
					<text>列车尚未发车或已到达终点，暂无实时位置</text>
				</view>
				<template v-else>
					<image class="map-image locate-map" :src="locateMapUrl" mode="widthFix" v-if="locateMapUrl"></image>
					<view class="legend">
						<view class="legend-item"><view class="legend-dot legend-train"></view><text>列车当前位置</text></view>
						<text class="legend-coord" v-if="positionText">{{ positionText }}</text>
					</view>
				</template>
			</view>
		</view>
			</template>

			<!-- ===== Tab 3：列车 ===== -->
			<template #train>
			<view class="tab-panel">
			<view class="loading-state" v-if="loading && !trainSet">
				<view class="spinner"></view>
				<text>正在获取车组信息…</text>
			</view>
			<!-- 完全无车组信息时给出明确空态，避免整页空白 -->
			<view class="empty-state" v-else-if="!trainSet && !trainSetTrains.length">
				<i class="fas fa-subway empty-icon"></i>
				<text>未查询到该车次的担当车组资料</text>
				<text class="empty-sub">该车次可能尚未编组或无公开担当数据</text>
			</view>
			<view class="card" v-if="trainSet || !loading">
				<view class="card-head">
					<i class="fas fa-subway card-icon"></i>
					<text class="card-title">担当车组</text>
				</view>
				<view class="empty-inline" v-if="!trainSet">
					<text>未查到该车次的担当车组</text>
				</view>
				<view v-else class="emu-block" @tap="goEmuDetail(trainSet)">
					<view class="emu-main">
						<text class="emu-no">{{ trainSet }}</text>
						<text class="emu-model">{{ emuModel }}</text>
					</view>
					<i class="fas fa-chevron-right emu-arrow"></i>
				</view>
				<text class="card-note" v-if="trainSet">点击车型可查询该车组的全部运用车次</text>
			</view>

			<!-- ===== 车组资料（自有数据源 /12306/train/）===== -->
			<template v-if="trainSet">
				<!-- 列车信息：编组 / 长度 / 定员 / 时速 / 餐车 等 -->
				<view class="card">
					<view class="card-head">
						<i class="fas fa-circle-info card-icon"></i>
						<text class="card-title">{{ emuModel }} 列车信息</text>
						<text class="card-live" v-if="carInfoLoading">加载中…</text>
					</view>
					<view class="empty-inline" v-if="!carInfoLoading && !carInfo.length">
						<text>暂无该车型的资料</text>
					</view>
					<view class="car-info-grid" v-else>
						<view class="car-info-item" v-for="(it, i) in carInfo" :key="i">
							<text class="car-info-name">{{ it.pictureName }}</text>
							<text class="car-info-value">{{ it.pictureValue }}</text>
							<image
								class="car-info-icon"
								:src="cateringImage(it.pictureUrl)"
								mode="aspectFit"
								v-if="cateringImage(it.pictureUrl)"
							></image>
						</view>
					</view>
				</view>

				<!-- 列车大图 -->
				<view class="card">
					<view class="card-head">
						<i class="fas fa-image card-icon"></i>
						<text class="card-title">列车外观</text>
					</view>
					<image
						class="car-pic"
						:src="carPic"
						mode="widthFix"
						@tap="previewImage(carPic)"
						@error="onCarPicError"
						v-if="carPic && !carPicFailed"
					></image>
					<view class="empty-inline" v-else><text>暂无列车大图</text></view>
				</view>

				<!-- 车厢图：横向滚动，点按看大图 -->
				<view class="card" v-if="visibleDiagrams.length">
					<view class="card-head">
						<i class="fas fa-train-subway card-icon"></i>
						<text class="card-title">车厢图</text>
						<text class="card-live" v-if="formation">{{ formation }} 编组 · 左右滑动</text>
						<text class="card-live" v-else>左右滑动 · 点按放大</text>
					</view>
					<scroll-view class="car-scroll" scroll-x show-scrollbar="false">
						<view class="car-scroll-row">
							<image
								class="car-diagram"
								v-for="d in visibleDiagrams"
								:key="d.i"
								:src="d.url"
								mode="widthFix"
								@tap="previewImage(d.url, visibleDiagramUrls)"
								@error="onDiagramError(d.i)"
							></image>
						</view>
					</scroll-view>
				</view>
			</template>

			<view class="card" v-if="trainSet">
				<view class="card-head">
					<i class="fas fa-list card-icon"></i>
					<text class="card-title">{{ trainSet }} 担当车次</text>
					<text class="card-live" v-if="trainSetTrains.length">共 {{ trainSetTrains.length }} 趟</text>
				</view>
				<view class="empty-inline" v-if="!trainSetTrains.length">
					<text>未查到该车组担当的其他车次</text>
				</view>
				<view class="train-list" v-else>
					<view
						class="train-row"
						v-for="(r, i) in trainSetTrains"
						:key="i"
						:class="{ current: r.train === trainNo }"
						@tap="goTrainDetail(r.train)"
					>
						<text class="train-row-no">{{ r.train }}</text>
						<text class="train-row-tag" v-if="r.train === trainNo">当前</text>
						<text class="train-row-type" v-else>{{ r.type }}</text>
						<i class="fas fa-chevron-right train-row-arrow"></i>
					</view>
				</view>
			</view>
		</view>
			</template>
		</slide-tabs>

		<view class="empty-state big" v-if="!trainNo && !loading">
			<i class="fas fa-train empty-icon"></i>
			<text>输入车次号，查看时刻、运行与担当信息</text>
		</view>
		<app-toast ref="toast" />
		<app-date-picker ref="datePick" />
	</view>
</template>

<script>
	import {
		getTrainDetail, getTrainLocate, getAmapStaticMap, getPlatformMap,
		getTrainSetInfo, carPicUrl, cateringImageUrl
	} from '@/service/api.js'
	import SlideTabs from '@/components/slide-tabs/slide-tabs.vue'

	export default {
		// 页面内局部注册（uni-app H5 下比全局注册更可靠）
		components: { SlideTabs },
		data() {
			return {
				searchText: '',
				trainNo: '',
				date: '',
				loading: false,
				activeTabIndex: 0,

				timetable: null,
				platformMap: {},
				platformLoading: false,
				lineData: null,
				locate: null,
				trainSet: '',
				trainSetTrains: [],

				// 车组资料
				carInfo: [],
				carDiagrams: [],
				formation: 0,
				carPic: '',
				carInfoLoading: false,
				carPicFailed: false,
				carDiagramBroken: {},

				polling: false,
				_pollTimer: null,
				_loadToken: 0
			}
		},
		computed: {
			// 日期可选范围：数据只覆盖近段时间，故限制在近几天到未来几天
			dateStart() { return addDays(formatToday(), -7) },
			dateEnd() { return addDays(formatToday(), 7) },
			// 搜索框里显示的简短日期：今年省略年份，显示"8月17日"
			shortDate() {
				const d = this.date || ''
				const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
				if (!m) return d || '选择日期'
				const nowYear = String(new Date().getFullYear())
				return m[1] === nowYear ? `${+m[2]}月${+m[3]}日` : `${m[1]}-${m[2]}-${m[3]}`
			},
			// 供 slide-tabs 使用：key 对应插槽名，label 为显示文字
			tabs() {
				return [
					{ key: 'time', label: '时刻' },
					{ key: 'run', label: '运行' },
					{ key: 'train', label: '列车' }
				]
			},
			stops() { return (this.timetable && this.timetable.stops) || [] },
			origin() { return (this.timetable && this.timetable.origin) || '' },
			destination() { return (this.timetable && this.timetable.destination) || '' },
			departTime() { return (this.timetable && this.timetable.depart_time) || '' },
			arriveTime() { return (this.timetable && this.timetable.arrive_time) || '' },
			isRunning() { return !!(this.locate && this.locate.status === 'running') },
			statusText() {
				if (!this.locate) return ''
				if (this.locate.status === 'running') return '运行中'
				if (this.locate.status === 'arrived') return '已到达'
				return '等待中'
			},
			position() {
				const p = this.locate && this.locate.position
				if (!p) return null
				const lng = p.gcj02_lng || p.lng
				const lat = p.gcj02_lat || p.lat
				return (lng && lat) ? { lng, lat } : null
			},
			positionText() {
				if (!this.position) return ''
				return `${Number(this.position.lng).toFixed(4)}, ${Number(this.position.lat).toFixed(4)}`
			},
			stationNames() {
				if (!this.lineData || !this.lineData.stations) return []
				return this.lineData.stations.map(s => Object.keys(s)[0])
			},
			// CR400BF-A-5054 → CR400BF-A
			emuModel() {
				if (!this.trainSet) return ''
				const m = String(this.trainSet).match(/^(.*?)-\d+$/)
				return m ? m[1] : this.trainSet
			},
			routePoints() {
				const train = (this.lineData && this.lineData.train) || {}
				const segs = Object.keys(train)
					.map(k => ({ index: (train[k] && train[k].index) || 0, line: (train[k] && train[k].line) || [] }))
					.sort((a, b) => a.index - b.index)
				const out = []
				for (const seg of segs) {
					for (const p of seg.line) out.push(`${p[0].toFixed(4)},${p[1].toFixed(4)}`)
				}
				return out
			},
			// 过滤掉加载失败的车厢图
			visibleDiagrams() {
				return this.carDiagrams
					.map((url, i) => ({ url, i }))
					.filter(d => !this.carDiagramBroken[d.i])
			},
			visibleDiagramUrls() {
				return this.visibleDiagrams.map(d => d.url)
			},

			// 高德静态图：同组 markers 必须写在一条里且 label 不能省略（省略会报 20003）
			// 路径地图：仅绘制运行路径与途经车站，不含列车位置
			// （位置点与车站点同色同大时会被线路和小圆点淹没，故单独出图）
			staticMapUrl() {
				if (!this.lineData) return ''
				const pts = this.routePoints
				if (pts.length < 2) return ''
				const stations = stationCoordStrs(this.lineData)
				const parts = []
				if (stations) parts.push(`markers=${encodeURIComponent('mid,0x007AFF,0:' + stations)}`)
				parts.push(`paths=${encodeURIComponent('7,0x007AFF,1,,:' + pts.join(';'))}`)
				return getAmapStaticMap('750*500', null, null) + '&' + parts.join('&')
			},
			// 实时位置地图：独立一张图，放在路径地图下方。
			// 高德的静态标记尺寸是固定的（large 约 21x32px），
			// 画布越小标记占比越大 —— 故用 400*240 小画布 + 近距缩放，
			// 让列车位置在小卡片里也清晰可见。
			locateMapUrl() {
				const p = this.position
				if (!p) return ''
				const marker = `large,0x007AFF,A:${p.lng},${p.lat}`
				return getAmapStaticMap('400*240', marker, null) +
					`&location=${p.lng},${p.lat}&zoom=16`
			}
		},
		onLoad(options) {
			const train = options && options.train ? decodeURIComponent(options.train) : ''
			this.date = options && options.date ? options.date : formatToday()
			if (train) {
				this.searchText = train
				this.setTrain(train)
			}
		},
		onUnload() { this.stopPolling() },
		onHide() { this.stopPolling() },
		methods: {
			// 车组资料图片地址（carInfo 的 pictureUrl 是 MD5 文件名）
			// 注意：模板中是以方法形式调用 cateringImage(...)，
			// 必须定义在 methods 而不是 computed，否则渲染时抛
			// "cateringImage is not a function" 并中断整个组件更新
			cateringImage(pictureUrl) {
				return cateringImageUrl(pictureUrl)
			},

			platformOf(stop) {
				const p = this.platformMap[stop.station_name]
				return (p && p.platform) || ''
			},
			entranceOf(stop) {
				const p = this.platformMap[stop.station_name]
				if (!p || !p.entrance || !p.entrance.length) return ''
				return p.entrance.join(' · ')
			},
			isCurrentStop(stop) {
				if (!this.locate || !this.locate.station) return false
				return stop.station_name === this.locate.station
			},
			async pickDate() {
				const v = await this.datePick({
					value: this.date,
					start: this.dateStart,
					end: this.dateEnd,
					title: '乘车日期'
				})
				if (!v || v === this.date) return
				this.date = v
				if (this.trainNo) this.setTrain(this.trainNo)
			},
			doSearch() {
				const no = String(this.searchText || '').trim().toUpperCase()
				if (!no) {
					this.toast('请输入车次号')
					return
				}
				this.setTrain(no)
			},
			goTrainDetail(trainNo) {
				if (!trainNo) return
				const no = String(trainNo).trim().toUpperCase()
				if (no === this.trainNo) return
				this.searchText = no
				this.setTrain(no)
			},
			goEmuDetail(trainSet) {
				if (!trainSet) return
				uni.navigateTo({
					url: `/pages/emu-query/emu-query?mode=emu&q=${encodeURIComponent(trainSet)}`
				})
			},
			async setTrain(trainNo) {
				this.stopPolling()
				this.trainNo = trainNo
				this.loading = true
				this.reset()
				this.$store.commit('addSearchHistory', { train: trainNo, time: Date.now() })
				uni.setNavigationBarTitle({ title: `${trainNo} 次列车` })
				const token = ++this._loadToken
				// 分步渲染：哪个接口先回就先显示哪块，
				// 首屏不再等最慢的接口（冷缓存下 getTrainLocate 可达 5s+）
				const onPartial = (patch) => {
					if (token !== this._loadToken) return   // 已切换到别的车次，丢弃
					if (patch.timetable) {
						this.timetable = patch.timetable
						this.loading = false                   // 有时刻表即可渲染首屏
					}
					if (patch.line) this.lineData = patch.line
					if (patch.locate) {
						this.locate = patch.locate
						if (this.isRunning) this.startPolling()
					}
					if (patch.trainSet) {
						this.trainSet = patch.trainSet
						this.loadCarInfo()
					}
				}

				try {
					const res = await getTrainDetail(trainNo, this.date, onPartial)
					this.platformMap = res.platformMap || {}
					this.timetable = res.timetable || this.timetable
					this.lineData = res.line || this.lineData
					this.locate = res.locate || this.locate
					this.trainSet = res.trainSet || this.trainSet
					this.trainSetTrains = res.trainSetTrains || []
					if (!res.timetable && !res.line && !res.locate) {
						this.toast('未查询到该车次')
					}
					if (this.isRunning) this.startPolling()
				} catch (e) {
					this.toast('网络异常，请稍后重试')
				} finally {
					this.loading = false
				}
				// 以下均为异步补充，不阻塞主体渲染
				if (this.trainSet) this.loadCarInfo()
				this.loadPlatforms()
			},
			reset() {
				this.timetable = null
				this.platformMap = {}
				this.platformLoading = false
				this.lineData = null
				this.locate = null
				this.trainSet = ''
				this.trainSetTrains = []
				this.carInfo = []
				this.carDiagrams = []
				this.formation = 0
				this.carPic = ''
				this.carPicFailed = false
				this.carDiagramBroken = {}
			},

			// 停台查询：需要先下载整张车站表，耗时较长，单独异步补充
			// （放在主流程里会让整页卡在 loading 直到超时）
			async loadPlatforms() {
				const stops = this.stops
				if (!stops.length) return
				this.platformLoading = true
				try {
					const map = await getPlatformMap(this.trainNo, stops)
					// 仅当仍是同一车次时才回填，避免快速切换车次时串数据
					if (map && Object.keys(map).length) this.platformMap = map
				} catch (e) {
					// 停台属于附加信息，失败不打扰用户
				} finally {
					this.platformLoading = false
				}
			},

			// 拉取车组资料（carInfo.json + 车厢图）
			async loadCarInfo() {
				if (!this.trainSet) return
				this.carInfoLoading = true
				try {
					const res = await getTrainSetInfo(this.trainSet)
					this.carInfo = res.info || []
					this.carDiagrams = res.diagrams || []
					this.formation = res.formation || 0
					this.carPic = res.carPic || carPicUrl(this.trainSet)
				} catch (e) {
					this.carInfo = []
					this.carDiagrams = []
				} finally {
					this.carInfoLoading = false
				}
			},

			// 列车大图加载失败：延迟到下一个 tick 再改状态，
			// 避免在渲染过程中改 data 与 v-if 形成反复重渲染
			onCarPicError() {
				if (this.carPicFailed) return
				this.$nextTick(() => { this.carPicFailed = true })
			},

			// 车厢图缺图：隐藏该张（不改变数组长度，仅标记）
			onDiagramError(i) {
				this.carDiagramBroken = Object.assign({}, this.carDiagramBroken, { [i]: true })
			},

			// 点按图片放大预览
			previewImage(current, urls) {
				if (!current) return
				uni.previewImage({ urls: urls && urls.length ? urls : [current], current })
			},
			startPolling() {
				this.stopPolling()
				this.polling = true
				this._pollTimer = setInterval(async () => {
					try {
						const res = await getTrainLocate(this.trainNo)
						if (res && res.code === 0 && res.data) {
							this.locate = res.data
							if (res.data.status !== 'running') this.stopPolling()
						}
					} catch (e) {}
				}, 10000)
			},
			stopPolling() {
				this.polling = false
				if (this._pollTimer) {
					clearInterval(this._pollTimer)
					this._pollTimer = null
				}
			}
		}
	}

	function addDays(str, n) {
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''))
		if (!m) return str
		const d = new Date(+m[1], +m[2] - 1, +m[3])
		d.setDate(d.getDate() + n)
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
	}

	function formatToday() {
		const d = new Date()
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
	}

	function stationCoordStrs(lineData) {
		if (!lineData || !lineData.stations) return ''
		return lineData.stations
			.map(s => {
				const c = Object.values(s)[0]
				return c ? `${c[0].toFixed(4)},${c[1].toFixed(4)}` : null
			})
			.filter(Boolean)
			.join(';')
	}
</script>

<style lang="scss">
	.page {
		min-height: 100vh;
		background: var(--bg);
		padding: 16px 16px 40px;
	}

	/* ===== 搜索 ===== */
	.search-section {
		display: flex; align-items: center; gap: 10px;
		background: var(--card);
		border-radius: 12px;
		padding: 10px 10px 10px 16px;
		margin-bottom: 14px;
		border: 1px solid var(--theme-border);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}
	.search-icon { font-size: 17px; color: var(--theme-text); }
	.search-input { flex: 1; font-size: 17px; color: var(--label); height: 38px; }
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
	}
	/* 日期选择按钮：日历图标 + 月日 */
	.date-btn {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0 6px;
		i { font-size: 15px; color: var(--theme-text); }
	}
	.date-text {
		font-size: 13px;
		font-weight: 600;
		color: var(--theme-text);
		font-variant-numeric: tabular-nums;
	}

	/* ===== 车次标题 ===== */
	.hero {
		background: var(--theme);
		border-radius: 16px;
		padding: 18px 20px;
		margin-bottom: 14px;
	}
	.hero-main { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
	.hero-no { font-size: 30px; font-weight: 700; color: #fff; letter-spacing: -0.02em; }
	.hero-route { display: flex; align-items: center; gap: 6px; }
	.hero-route-text { font-size: 15px; color: #fff; opacity: 0.95; }
	.hero-arrow { font-size: 14px; color: #fff; opacity: 0.8; }
	.hero-meta { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; }
	.hero-meta-item { font-size: 13px; color: #fff; opacity: 0.85; }
	.hero-status {
		display: inline-flex; align-items: center; gap: 6px;
		margin-top: 12px; padding: 4px 12px;
		border-radius: 20px;
		background: rgba(255, 255, 255, 0.22);
		font-size: 12px; color: #fff;
		i { font-size: 12px; color: #fff; }
	}

	/* ===== Tabs ===== */
	.tabs {
		display: flex;
		background: var(--card);
		border-radius: 12px;
		padding: 4px;
		margin-bottom: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}
	.tab {
		flex: 1;
		position: relative;
		display: flex; flex-direction: column; align-items: center;
		padding: 10px 0 8px;
		border-radius: 9px;
	}
	.tab-label { font-size: 15px; font-weight: 500; color: var(--secondary); }
	.tab.active { background: var(--theme-fill); }
	.tab.active .tab-label { color: var(--theme-text); font-weight: 700; }
	.tab-bar {
		position: absolute; bottom: 3px;
		width: 18px; height: 2.5px; border-radius: 2px;
		background: var(--theme);
	}

	/* ===== 加载 ===== */
	.loading-state {
		display: flex; flex-direction: column; align-items: center; gap: 14px;
		padding: 60px 0; color: var(--secondary); font-size: 14px;
	}
	.spinner {
		width: 26px; height: 26px; border-radius: 50%;
		border: 2.5px solid var(--theme-fill-strong);
		border-top-color: var(--theme);
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }

	.platform-hint {
		font-size: 12px;
		color: var(--secondary);
		text-align: center;
		padding: 8px 0 12px;
	}

	/* ===== 时刻表 ===== */
	.stops { background: var(--card); border-radius: 14px; padding: 6px 16px; }
	.stop { display: flex; gap: 12px; }
	.stop-rail { width: 14px; display: flex; flex-direction: column; align-items: center; padding-top: 16px; }
	.stop-dot {
		width: 9px; height: 9px; border-radius: 50%;
		background: var(--theme-fill-strong);
		border: 1.5px solid var(--theme);
		flex-shrink: 0;
	}
	.stop-dot.terminal { width: 11px; height: 11px; background: var(--theme); }
	.stop-line { width: 2px; flex: 1; background: var(--theme-border); margin: 4px 0; }
	.stop-body { flex: 1; padding: 14px 0; border-bottom: 0.5px solid var(--separator); }
	.stop:last-child .stop-body { border-bottom: none; }
	.stop.current .stop-body { background: var(--theme-fill); border-radius: 8px; padding-left: 10px; padding-right: 10px; }

	.stop-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
	.stop-name { font-size: 17px; font-weight: 600; color: var(--label); }
	.stop-badge {
		font-size: 10px; font-weight: 600; color: #fff;
		background: var(--theme); border-radius: 5px; padding: 1px 6px;
	}
	/* 每站右侧的停靠站台 */
	.stop-platform {
		margin-left: auto;
		font-size: 12px; font-weight: 600;
		color: var(--theme-text);
		background: var(--theme-fill);
		border-radius: 6px;
		padding: 2px 8px;
		white-space: nowrap;
	}

	.stop-times { display: flex; gap: 18px; margin-top: 6px; }
	.stop-time { display: flex; align-items: baseline; gap: 5px; }
	.stop-time-label { font-size: 11px; color: var(--secondary); }
	.stop-time-value { font-size: 15px; font-weight: 600; color: var(--label); }
	.stop-extra { margin-top: 6px; }
	.stop-extra-text { font-size: 11px; color: var(--secondary); }

	/* ===== 运行页分节标题：把「实时位置」与「路径地图」视觉分开 ===== */
	.panel-title {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 4px;
		margin-bottom: 10px;
	}
	/* 与上一块拉开明显距离 */
	.panel-title.spaced { margin-top: 28px; }
	.panel-bar {
		width: 3px;
		height: 14px;
		border-radius: 2px;
		background: var(--theme);
		flex-shrink: 0;
	}
	.panel-text {
		font-size: 15px;
		font-weight: 700;
		color: var(--label);
	}
	.panel-hint {
		margin-left: auto;
		font-size: 11px;
		color: var(--secondary);
	}

	/* ===== 卡片 ===== */
	.card {
		background: var(--card);
		border-radius: 14px;
		padding: 16px;
		margin-bottom: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}
	.card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
	.card-icon { font-size: 15px; color: var(--theme-text); }
	.card-title { font-size: 15px; font-weight: 700; color: var(--label); flex: 1; }
	.card-live { font-size: 11px; color: var(--secondary); }
	.card-note { display: block; margin-top: 10px; font-size: 11px; color: var(--secondary); }

	.kv {
		display: flex; justify-content: space-between; align-items: center;
		padding: 9px 0; border-bottom: 0.5px solid var(--separator);
	}
	.kv:last-of-type { border-bottom: none; }
	.kv-label { font-size: 13px; color: var(--secondary); }
	.kv-value { font-size: 15px; font-weight: 600; color: var(--label); }

	.empty-inline { padding: 20px 0; text-align: center; font-size: 13px; color: var(--secondary); }

	/* ===== 地图 ===== */
	.map-image { width: 100%; border-radius: 10px; display: block; }
	.legend { display: flex; gap: 16px; margin-top: 10px; }
	.legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--secondary); }
	.legend-dot { width: 9px; height: 9px; border-radius: 50%; }
	.legend-station { background: var(--theme); }
	.legend-train { background: var(--theme); box-shadow: 0 0 0 3px var(--theme-fill-strong); }
	.legend-line { width: 16px; height: 3px; border-radius: 2px; background: var(--theme); }
	.legend-coord { margin-left: auto; font-size: 11px; color: var(--secondary); }
	/* 实时位置地图：单独一张，宽度略窄以突出定位 */
	.locate-map { border: 1px solid var(--theme-border); }
	.station-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
	.station-chip {
		font-size: 11px; color: var(--theme-text);
		background: var(--theme-fill);
		border-radius: 6px; padding: 3px 8px;
	}

	/* ===== 车组 ===== */
	.emu-block {
		display: flex; align-items: center; gap: 12px;
		background: var(--theme-fill);
		border-radius: 12px;
		padding: 14px 16px;
	}
	.emu-main { flex: 1; display: flex; flex-direction: column; gap: 3px; }
	.emu-no { font-size: 19px; font-weight: 700; color: var(--theme-text); }
	.emu-model { font-size: 12px; color: var(--theme-text); opacity: 0.8; }
	.emu-arrow { font-size: 14px; color: var(--theme-text); }

	.train-list { display: flex; flex-direction: column; }
	.train-row {
		display: flex; align-items: center; gap: 12px;
		padding: 12px 0;
		border-bottom: 0.5px solid var(--separator);
	}
	.train-row:last-child { border-bottom: none; }
	.train-row.current { background: var(--theme-fill); border-radius: 8px; padding-left: 10px; padding-right: 10px; }
	.train-row-no { font-size: 16px; font-weight: 600; color: var(--theme-text); flex: 1; }
	.train-row-tag {
		font-size: 10px; font-weight: 600; color: #fff;
		background: var(--theme); border-radius: 5px; padding: 1px 6px;
	}
	.train-row-type { font-size: 12px; color: var(--secondary); }
	.train-row-arrow { font-size: 12px; color: var(--secondary); }

	/* ===== 车组资料 ===== */
	.car-info-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.car-info-item {
		flex: 1 1 calc(50% - 5px);
		min-width: calc(50% - 5px);
		box-sizing: border-box;
		background: var(--theme-fill);
		border-radius: 10px;
		padding: 10px 12px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		position: relative;
	}
	.car-info-name { font-size: 12px; color: var(--secondary); }
	.car-info-value { font-size: 16px; font-weight: 700; color: var(--theme-text); }
	.car-info-icon {
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		width: 26px;
		height: 26px;
		opacity: 0.9;
	}

	.car-pic {
		width: 100%;
		border-radius: 10px;
		display: block;
		background: var(--card2);
	}

	/* 车厢图横向滚动区。
	 * 不用负边距外扩 —— scroll-view 内部有独立滚动容器，
	 * 负边距在部分端上会与实际滚动区错位，这里保持常规布局。 */
	.car-scroll {
		width: 100%;
		white-space: nowrap;
	}
	.car-scroll-row { display: inline-flex; gap: 10px; padding-bottom: 4px; }
	/* 车厢图为超宽横图（1767x400，约 4.4:1），
	 * 宽度给小了高度只剩几十像素、内容看不清。
	 * 这里放大到 620px（高度约 140px），并在卡片内独立横向滚动查看。 */
	.car-diagram {
		width: 620px;
		flex-shrink: 0;
		border-radius: 8px;
		background: var(--card2);
	}

	/* ===== 空态 ===== */
	.empty-state {
		display: flex; flex-direction: column; align-items: center; gap: 12px;
		padding: 48px 0; color: var(--secondary); font-size: 14px; text-align: center;
	}
	.empty-state.big { padding: 90px 24px; }
	.empty-sub { font-size: 12px; color: var(--secondary); opacity: 0.8; }
	.empty-icon { font-size: 34px; color: var(--theme-text); opacity: 0.5; }
</style>
