<template>
	<view class="page" :style="themeStyle">
		<!-- 高德地图 + canvas 叠加层 -->
		<view class="map-card">
			<view class="map-wrap">
				<view id="amapContainer" class="map-container"></view>
			</view>
			<view class="map-legend">
				<view class="legend-item">
					<view class="legend-dot current-dot"></view>
					<text>当前位置</text>
				</view>
				<view class="legend-item">
					<view class="legend-line"></view>
					<text>移动路径</text>
				</view>
				<view class="legend-item legend-points" v-if="points.length > 1">
					<text>{{ points.length }} 个轨迹点 · {{ totalDistance.toFixed(1) }} m</text>
				</view>
			</view>
		</view>

		<!-- 实时速度（总路程 ÷ 测试时间） -->
		<view class="speed-card">
			<view class="speed-label">实时速度</view>
			<view class="speed-value-wrap">
				<text class="speed-value">{{ currentSpeed.toFixed(1) }}</text>
				<text class="speed-unit">km/h</text>
			</view>
			<view class="speed-meta">
				<view class="meta-item">
					<text class="meta-label">最高速度</text>
					<text class="meta-value">{{ maxSpeed.toFixed(1) }} km/h</text>
				</view>
				<view class="meta-sep"></view>
				<view class="meta-item">
					<text class="meta-label">测试时长</text>
					<text class="meta-value">{{ elapsedText }}</text>
				</view>
				<view class="meta-sep"></view>
				<view class="meta-item">
					<text class="meta-label">累计距离</text>
					<text class="meta-value">{{ totalDistance.toFixed(0) }} m</text>
				</view>
			</view>
		</view>

		<!-- 坐标 -->
		<view class="coord-card" v-if="hasFix">
			<view class="coord-row">
				<text class="coord-label">经度</text>
				<text class="coord-value">{{ longitude.toFixed(6) }}</text>
			</view>
			<view class="coord-row">
				<text class="coord-label">纬度</text>
				<text class="coord-value">{{ latitude.toFixed(6) }}</text>
			</view>
			<view class="coord-row" v-if="accuracy">
				<text class="coord-label">精度</text>
				<text class="coord-value">±{{ accuracy.toFixed(0) }} 米</text>
			</view>
		</view>

		<!-- 开始/停止 -->
		<view class="control-section">
			<button class="start-btn" :class="{ recording: recording }" @tap="toggleTrack">
				<i class="fas" :class="recording ? 'fa-stop' : 'fa-play'" style="font-size: 20px;"></i>
				<text>{{ recording ? '停止' : '开始' }}</text>
			</button>
			<view class="status-row">
				<view class="status-dot" :class="{ active: recording, error: error }"></view>
				<text class="status-text" :class="{ error: error }">{{ statusText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { getKey } from '@/common/keys.js'

	export default {
		data() {
			return {
				recording: false,
				error: false,
				statusText: '点击开始进行定位测速',
				mapReady: false,
				hasFix: false,
				longitude: 0,
				latitude: 0,
				accuracy: 0,
				// 轨迹（经纬度序列）
				points: [],           // [{ lng, lat, t }]
				lastFix: null,
				// 速度
				totalDistance: 0,     // m（路程累计）
				maxSpeed: 0,          // km/h（相邻定位瞬时速度的最大值）
				// 运行时
				watchId: null,        // 浏览器 geolocation watch id
				_pollTimer: null,     // 非 H5 兜底的轮询定时器
				_startTs: 0,
				_now: 0,              // 当前时间戳（用于实时刷新 总路程/总时长 得出速度）
				map: null,            // AMap.Map 实例
				_tileLoaded: false,
				_g: null,             // 高德地图叠加 canvas 的 2d context
				_proj: null,          // 缓存的 Web Mercator 投影参数
				settingCenter: false, // 正在 setCenter（期间忽略重绘，避免用旧中心投影）
				_redrawTimer: null,   // 重绘节流定时器
				_pathCache: [],       // 已投影的轨迹点缓存
				_pathCacheKey: '',    // 缓存键（点数 | 投影参数）
				_lastDot: null,       // 上一次小圆点位置（供脉冲局部重绘）
				_dotRadius: 24,
				_canvasEl: null,
				_drawTimer: null,
				_frame: 0,
			}
		},
		computed: {
			// 实时速度 = 总路程 ÷ 测试总时长（km/h）
			currentSpeed() {
				const elapsedMs = this._now - this._startTs
				const seconds = elapsedMs > 0 ? elapsedMs / 1000 : 0
				if (seconds <= 0 || this.totalDistance <= 0) return 0
				return (this.totalDistance / 1000) / (seconds / 3600)
			},
			// 已测试时长（mm:ss / hh:mm:ss）
			elapsedText() {
				const ref = this._now > 0 ? this._now : Date.now()
				const start = this._startTs > 0 ? this._startTs : ref
				const totalSec = Math.max(0, Math.floor((ref - start) / 1000))
				const h = Math.floor(totalSec / 3600)
				const m = Math.floor((totalSec % 3600) / 60)
				const s = totalSec % 60
				return h > 0
					? `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`
					: `${this.pad(m)}:${this.pad(s)}`
			}
		},
		onReady() {
			// #ifdef H5
			this.initMap()
			// #endif
		},
		onUnload() {
			this.cleanup()
		},
		methods: {
			// ===== 高德地图初始化（H5）=====
			initMap() {
				const that = this
				const loadAmap = () => new Promise((resolve, reject) => {
					if (typeof window !== 'undefined' && window.AMap) { resolve(); return }
					const key = getKey('amap_js')
					const sec = getKey('amap_sec')
					try {
						window._AMapSecurityConfig = { securityJsCode: sec }
					} catch (e) {}
					const s = document.createElement('script')
					s.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(key)
					s.async = true
					s.onload = resolve
					s.onerror = () => reject(new Error('高德地图加载失败'))
					document.head.appendChild(s)
				})

				loadAmap().then(() => {
					// 等待容器 DOM 就绪
					this.$nextTick(() => {
						const el = document.getElementById('amapContainer')
						if (!el) { this.statusText = '地图容器初始化失败'; return }
						this.map = new window.AMap.Map('amapContainer', {
							zoom: 16,
							mapStyle: 'amap://styles/fresh',
							resizeEnable: true,
							dragEnable: true,
							scrollWheel: true,
							touchZoom: true,
							doubleClickZoom: true,
							zoomEnable: true
						})
						this.setupOverlayCanvas()
						// 地图完成加载后再校正一次尺寸：
						// 初始化瞬间容器可能尚未完成布局（高度为 0），
						// 那样 canvas 会被设成 0 尺寸且之后再无机会重算。
						if (this.map && this.map.on) {
							this.map.on('complete', () => {
								this._sizeCanvas()
								this.redrawPath()
							})
						}
						this.$nextTick(() => { this._sizeCanvas(); this.redrawPath() })
						this.mapReady = true
						this.statusText = '点击开始进行定位测速'
						this.drawPlaceholder()
					})
				}).catch(() => {
					this.statusText = '高德地图加载失败'
					this.error = true
				})
			},

			// 在地图容器上方叠加一层自建的原生 canvas
			//
			// 不要用 <canvas canvas-id> 组件：uni-app 会把它渲染成
			// <uni-canvas> 外壳，内部的 canvas 由组件自身管理，
			// 直接 getContext('2d') 绘制的内容不会保留（实测写入后读不到像素）。
			// 这里仿照路网地图的做法，自己 createElement 并 append，
			// 完全掌控上下文。
			setupOverlayCanvas() {
				const el = document.getElementById('amapContainer')
				if (!el) return

				if (this._canvasEl && this._canvasEl.parentNode) {
					this._canvasEl.parentNode.removeChild(this._canvasEl)
				}
				const cv = document.createElement('canvas')
				cv.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10'
				cv.className = 'map-canvas'
				el.appendChild(cv)

				this._canvasEl = cv
				this._g = cv.getContext('2d')
				if (!this._g) return
				this._sizeCanvas()

				// 只在移动/缩放**结束后**重绘。
				//
				// 不使用 mapmove 做实时重绘：拖动期间 map.getCenter() 返回的是
				// 动画中间态，用它做投影基准会与地图实际渲染位置错位，
				// 表现为轨迹「飞出去」。moveend 时中心已稳定，投影才准确。
				// 拖动/缩放开始时先隐藏画布，结束后再显示并重绘：
				// 这样过程中不会看到「轨迹与地图脱节」的错位画面。
				const hide = () => {
					if (this._canvasEl) this._canvasEl.style.visibility = 'hidden'
				}
				const onMove = () => {
					if (this._canvasEl) this._canvasEl.style.visibility = 'visible'
					this.scheduleRedraw()
				}
				this.map.on('movestart', hide)
				this.map.on('zoomstart', hide)
				this.map.on('moveend', onMove)
				this.map.on('zoomend', onMove)
				// 保存引用以便在 cleanup 时移除，避免监听泄漏
				this._onResize = () => {
					this._sizeCanvas()
					this.redrawPath()
				}
				if (typeof window !== 'undefined' && window.addEventListener) {
					window.addEventListener('resize', this._onResize)
				}
			},

			/**
			 * 让叠加 canvas 与地图容器尺寸一致，并按 DPR 适配
			 *
			 * 关键点：给 cv.width / cv.height 赋值会**重置整个上下文状态**
			 * （包括此前的 setTransform），所以每次设完尺寸都必须重新
			 * setTransform，否则坐标系会退回设备像素，绘制位置整体放大 DPR 倍
			 * —— 表现为「拖动后轨迹偏移巨大」。
			 */
			_sizeCanvas() {
				const el = document.getElementById('amapContainer')
				const cv = this._canvasEl
				if (!el || !cv) return
				this._canvasEl = cv
				const rect = el.getBoundingClientRect()
				if (!rect.width || !rect.height) return   // 容器还没布局好，等下次
				const dpr = window.devicePixelRatio || 1
				this._mapRect = { width: rect.width, height: rect.height }
				this._dpr = dpr

				cv.style.width = rect.width + 'px'
				cv.style.height = rect.height + 'px'
				const dw = Math.round(rect.width * dpr)
				const dh = Math.round(rect.height * dpr)
				// 尺寸没变就不重设，避免无谓地重置上下文
				if (cv.width !== dw || cv.height !== dh) {
					cv.width = dw
					cv.height = dh
				}
				const g = cv.getContext('2d')
				this._g = g
				// 必须在设置尺寸之后调用：赋值 width/height 会清空变换
				g.setTransform(dpr, 0, 0, dpr, 0, 0)
				// 投影中心依赖容器尺寸，尺寸变了要重算
				this.refreshProjection()
			},

			// 无轨迹时的占位提示
			drawPlaceholder() {
				this.redrawPath()
			},

			// 用高德 lngLatToContainer 把轨迹经纬度画到叠加 canvas 上（原生 2D）
			// 节流重绘：拖动/缩放时短时间内只重绘一次
			scheduleRedraw() {
				// setCenter 尚未生效时不要重绘：此刻 getCenter() 还是旧值，
				// 用旧中心投影新坐标会得到离谱的像素位置
				if (this.settingCenter) return
				if (this._redrawTimer) return
				this._redrawTimer = setTimeout(() => {
					this._redrawTimer = null
					this.redrawPath()
				}, 16)
			},

			redrawPath() {
				const g = this._g
				if (!g || !this.map || !this._mapRect) return
				// 每次重绘前刷新投影参数（纯数学，开销极小）
				this.refreshProjection()
				// 坐标系已按 DPR 放大，故用 CSS 尺寸清除即可覆盖整个画布；
				// 多留 1px 余量，避免浮点误差留下残边。
				g.clearRect(0, 0, this._mapRect.width + 1, this._mapRect.height + 1)
				const pts = this.points
				// 轨迹点投影结果按 (点数, 投影版本) 缓存：
				// 投影未变时（纯脉冲刷新）直接复用，跳过重复数学运算
				const projKey = this._proj ? (this._proj.cX + ',' + this._proj.cY + ',' + this._proj.scale) : ''
				if (this._pathCacheKey !== pts.length + '|' + projKey) {
					const projected = []
					for (let i = 0; i < pts.length; i++) {
						const xy = this.projectTo(pts[i].lng, pts[i].lat)
						if (xy) projected.push(xy)
					}
					this._pathCache = projected
					this._pathCacheKey = pts.length + '|' + projKey
				}
				const cached = this._pathCache || []
				if (cached.length >= 2) {
					g.lineCap = 'round'
					g.lineJoin = 'round'
					// 路径光晕
					g.beginPath()
					g.strokeStyle = 'rgba(52,199,89,0.25)'
					g.lineWidth = 8
					let started = false
					for (let i = 0; i < cached.length; i++) {
						const px = cached[i]
						if (!started) { g.moveTo(px.x, px.y); started = true }
						else g.lineTo(px.x, px.y)
					}
					if (started) g.stroke()
					// 路径主色
					g.beginPath()
					g.strokeStyle = '#34c759'
					g.lineWidth = 3.5
					started = false
					for (let i = 0; i < cached.length; i++) {
						const px = cached[i]
						if (!started) { g.moveTo(px.x, px.y); started = true }
						else g.lineTo(px.x, px.y)
					}
					if (started) g.stroke()
				}
				// 当前位置小圆点
				const lastProj = cached.length ? cached[cached.length - 1] : null
				if (lastProj) {
					this.drawDot(lastProj.x, lastProj.y)
				} else {
					const last = this.points[this.points.length - 1] || this.lastFix
					if (last) {
						const px = this.projectTo(last.lng, last.lat)
						if (px) this.drawDot(px.x, px.y)
					}
				}
			},

			/**
			 * 缓存当前投影参数（Web Mercator）
			 *
			 * 参照路网地图的做法：不逐点调用 map.lngLatToContainer ——
			 * 那会为每个点创建 AMap.LngLat 与 Pixel 对象，拖图时明显卡顿。
			 * 这里改为纯数学投影，参数只在移动/缩放后重算一次。
			 */
			refreshProjection() {
				if (!this.map) return
				try {
					const center = this.map.getCenter()
					const z = this.map.getZoom()
					const scale = 256 * Math.pow(2, z)
					const cLng = center.getLng()
					let sinLat = Math.sin(center.getLat() * Math.PI / 180)
					if (sinLat > 0.9999) sinLat = 0.9999
					if (sinLat < -0.9999) sinLat = -0.9999
					const cX = (cLng + 180) / 360 * scale
					const cY = (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale

					// 中心点必须用「本 canvas 的 CSS 尺寸」，不能混用 map.getSize()：
					// 容器经过 flex 布局或 resize 后两者可能短暂不一致，
					// 一旦中心算错，整条轨迹会整体偏移。
					const rect = this._mapRect
					const w = rect && rect.width ? rect.width : (this.map.getSize ? this.map.getSize().getWidth() : 0)
					const h = rect && rect.height ? rect.height : (this.map.getSize ? this.map.getSize().getHeight() : 0)
					this._proj = { scale, cX, cY, ox: w / 2, oy: h / 2 }
				} catch (e) {
					this._proj = null
				}
			},

			// 经纬度 → 画布坐标（纯数学，无对象创建；结果写入 out 复用）
			projectTo(lng, lat, out) {
				const p = this._proj
				if (!p) return null
				let sinLat = Math.sin(lat * Math.PI / 180)
				if (sinLat > 0.9999) sinLat = 0.9999
				if (sinLat < -0.9999) sinLat = -0.9999
				const x = p.ox + ((lng + 180) / 360 * p.scale - p.cX)
				const y = p.oy + ((0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * p.scale - p.cY)
				if (!isFinite(x) || !isFinite(y)) return null
				if (out) { out.x = x; out.y = y; return out }
				return { x, y }
			},

			/**
			 * 判断画布坐标是否落在可视范围内（含一定外扩）
			 *
			 * 投影以地图中心为原点，若轨迹点与当前中心相距很远
			 * （例如刚切换车次、定位跳变、setCenter 尚未生效），
			 * 算出的像素值可能是六位数，直接画会把内容甩到画布外，
			 * 视觉上就是「轨迹飞了」。这里做一次合理性过滤。
			 */
			isOnCanvas(xy, pad) {
				if (!xy || !this._mapRect) return false
				const m = pad === undefined ? 200 : pad
				return xy.x >= -m && xy.x <= this._mapRect.width + m &&
				       xy.y >= -m && xy.y <= this._mapRect.height + m
			},

			// 兼容旧调用名
			toCanvasXY(lng, lat) {
				return this.projectTo(lng, lat)
			},

			drawDot(x, y) {
				const g = this._g
				if (!g) return
				// 记录位置，供脉冲动画做局部重绘
				this._lastDot = { x, y }
				this._dotRadius = 24
				const pulse = 12 + Math.round(Math.sin(this._frame / 3) * 2)
				// 外圈脉冲
				g.beginPath()
				g.fillStyle = 'rgba(0,122,255,0.25)'
				g.arc(x, y, pulse, 0, Math.PI * 2)
				g.fill()
				// 白圈
				g.beginPath()
				g.fillStyle = '#ffffff'
				g.arc(x, y, 7, 0, Math.PI * 2)
				g.fill()
				// 蓝心
				g.beginPath()
				g.fillStyle = '#007aff'
				g.arc(x, y, 4, 0, Math.PI * 2)
				g.fill()
			},

			// ===== 测速控制 =====
			toggleTrack() {
				if (this.recording) this.stopTrack()
				else this.startTrack()
			},

			startTrack() {
				// 先清理上一次可能残留的监听/定时器
				this.clearWatch()
				this.points = []
				this.maxSpeed = 0
				this.totalDistance = 0
				this.lastFix = null
				this._startTs = Date.now()
				this._now = this._startTs
				this.recording = true
				this.error = false
				this.statusText = '正在获取定位权限…'
				this.redrawPath()

				// 平台差异：
				//  - H5   ：用 navigator.geolocation.watchPosition 实时推送
				//  - App/小程序：navigator.geolocation 在 WebView 里存在但回调永不触发，
				//          必须走 uni.getLocation 轮询（否则会一直停在「正在实时定位…」）
				// #ifdef H5
				if (typeof navigator !== 'undefined' && navigator.geolocation) {
					try {
						this.watchId = navigator.geolocation.watchPosition(
							pos => this.handleFix(pos.coords),
							err => this.handleGeolocationError(err),
							{ enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
						)
						this.statusText = '正在实时定位…'
						return
					} catch (e) { /* 落到下方轮询兜底 */ }
				}
				// #endif

				// 非 H5，或 H5 下 watchPosition 不可用时的轮询方案
				const timer = setInterval(() => {
					if (!this.recording) { clearInterval(timer); return }
					uni.getLocation({
						type: 'gcj02',
						success: res => this.handleFix(res),
						fail: (err) => this.handleLocationFail(err)
					})
				}, 2000)
				this._pollTimer = timer
				this.statusText = '正在实时定位…'
				// 立即取一次，避免等 2 秒才出数
				uni.getLocation({
					type: 'gcj02',
					success: res => this.handleFix(res),
					fail: (err) => this.handleLocationFail(err)
				})
			},

			// uni.getLocation 失败处理：权限被拒时给出可操作提示
			handleLocationFail(err) {
				const msg = (err && (err.errMsg || err.message)) || ''
				console.error('getLocation 失败', err)
				if (msg.indexOf('deny') >= 0 || msg.indexOf('auth') >= 0 || msg.indexOf('permission') >= 0) {
					this.error = true
					this.recording = false
					this.statusText = '定位权限被拒绝，请在系统设置中开启'
					this.clearWatch()
				} else if (!this.hasFix) {
					this.statusText = '正在获取定位…（首次定位可能较慢）'
				}
			},

			handleFix(coords) {
				const lng = Number(coords.longitude)
				const lat = Number(coords.latitude)
				if (!isFinite(lng) || !isFinite(lat)) return
				const t = Date.now()
				const acc = coords.accuracy || 0
				this.longitude = lng
				this.latitude = lat
				this.accuracy = acc
				this.hasFix = true
				this._now = t

				// 累计路程
				if (this.lastFix) {
					const d = this.distance(this.lastFix.lat, this.lastFix.lng, lat, lng)
					const dt = (t - this.lastFix.t) / 1000
					if (dt > 0 && d > 0.6) {
						this.totalDistance += d
					}
				}
				this.lastFix = { lng, lat, t }
				this.points.push({ lng, lat, t })

				// 每次当前速度变化时，若当前速度大于最高速度则更新最高速度
				// 前 3 秒不计算最高速度（避免定位初始噪声）
				if (t - this._startTs >= 3000) {
					const curSpeed = this.currentSpeed
					if (curSpeed > this.maxSpeed) this.maxSpeed = curSpeed
				}

				// 高德地图跟随当前位置
				//
				// 注意：setCenter 是异步的，调用后 map.getCenter() 仍返回旧值。
				// 若紧接着 redrawPath()，投影会以「旧中心 + 新轨迹点」计算，
				// 像素坐标瞬间变成六位数、整条轨迹被甩出画布 —— 这正是
				// 「一拖动位置就飞」的根源。所以必须等地图真正移动后再重绘。
				if (this.map) {
					this.settingCenter = true
					this.map.setCenter([lng, lat])
					// 双保险：同时用 moveend 与定时兜底，避免个别端不触发回调
					const done = () => {
						if (!this.settingCenter) return
						this.settingCenter = false
						this.redrawPath()
					}
					try {
						if (this.map.once) this.map.once('moveend', done)
					} catch (e) {}
					setTimeout(done, 260)
				}
				if (this.recording) this.statusText = '正在实时测速…'
				this.startDrawLoop()
			},

			handleGeolocationError(err) {
				console.error('Geolocation error', err)
				if (err && err.code === 1) {
					this.error = true
					this.recording = false
					this.statusText = '定位权限被拒绝，请在浏览器设置中允许'
				} else if (err && err.code === 2) {
					this.statusText = '定位暂时不可用，正在重试…'
				} else if (err && err.code === 3) {
					this.statusText = '定位超时，正在重试…'
				} else {
					this.error = true
					this.recording = false
					this.statusText = '定位失败，请稍后再试'
				}
			},

			stopTrack() {
				this.recording = false
				this._now = Date.now()
				this.clearWatch()
				this.stopDrawLoop()
				this.statusText = '已停止，共记录 ' + this.points.length + ' 个轨迹点'
			},

			clearWatch() {
				// 清理浏览器定位 watch
				if (this.watchId != null) {
					if (typeof navigator !== 'undefined' && navigator.geolocation) {
						try { navigator.geolocation.clearWatch(this.watchId) } catch (e) {}
					}
					this.watchId = null
				}
				// 清理非 H5 兜底的轮询定时器
				if (this._pollTimer != null) {
					try { clearInterval(this._pollTimer) } catch (e) {}
					this._pollTimer = null
				}
			},

			cleanup() {
				this.recording = false
				this.stopDrawLoop()
				this.clearWatch()
				if (this._redrawTimer) { clearTimeout(this._redrawTimer); this._redrawTimer = null }
				// 移除 window resize 监听
				if (this._onResize && typeof window !== 'undefined' && window.removeEventListener) {
					try { window.removeEventListener('resize', this._onResize) } catch (e) {}
					this._onResize = null
				}
				if (this.map) {
					try { this.map.destroy() } catch (e) {}
					this.map = null
				}
			},

			// ===== 脉冲动画 =====
			startDrawLoop() {
				if (this._drawTimer) return
				this._drawTimer = setInterval(() => this.pulseTick(), 180)
			},
			stopDrawLoop() {
				if (this._drawTimer) {
					clearInterval(this._drawTimer)
					this._drawTimer = null
				}
			},
			pulseTick() {
				if (!this.recording) return
				this._frame = (this._frame || 0) + 1
				// 刷新当前时间戳，驱动「总路程÷总时长」的速度与测试时长实时更新
				this._now = Date.now()
				// 脉冲动画只需重画小圆点那一小块，不必重绘整条轨迹：
				// 轨迹点可能上百个，每 180ms 全量重绘会明显拖慢。
				if (this._proj && this._lastDot) {
					const g = this._g
					if (g) {
						const r = this._dotRadius || 20
						g.clearRect(this._lastDot.x - r, this._lastDot.y - r, r * 2, r * 2)
					}
					this.drawDot(this._lastDot.x, this._lastDot.y)
				} else {
					this.redrawPath()
				}
			},

			// ===== 计算 =====
			pad(n) {
				return n < 10 ? '0' + n : String(n)
			},
			distance(lat1, lng1, lat2, lng2) {
				const R = 6371000
				const toRad = d => d * Math.PI / 180
				const dLat = toRad(lat2 - lat1)
				const dLng = toRad(lng2 - lng1)
				const a = Math.sin(dLat / 2) ** 2 +
					Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
				return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
			}
		}
	}
</script>

<style lang="scss">
	.page {
		padding: 0 16px 40px;
		background: #f2f2f7;
		min-height: 100vh;
		position: relative;
	}

	/* ===== Map Card ===== */
	.map-card {
		background: #fff;
		border-radius: 14px;
		overflow: hidden;
		margin-bottom: 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}
	.map-wrap {
		position: relative;
		width: 100%;
		height: 320px;
	}
	.map-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
	}
	.map-legend {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px 16px;
		flex-wrap: wrap;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		color: #8e8e93;
	}
	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}
	.current-dot {
		background: #007aff;
		box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.25);
	}
	.legend-line {
		width: 18px;
		height: 3px;
		border-radius: 2px;
		background: #34c759;
	}
	.legend-points {
		margin-left: auto;
		font-size: 12px;
		color: #c6c6c8;
	}

	/* ===== Speed Card ===== */
	.speed-card {
		background: #fff;
		border-radius: 14px;
		padding: 18px 16px 14px;
		margin-bottom: 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.speed-label {
		font-size: 13px;
		font-weight: 600;
		color: #8e8e93;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
	}
	.speed-value-wrap {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.speed-value {
		font-size: 56px;
		font-weight: 700;
		color: #1c1c1e;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}
	.speed-unit {
		font-size: 16px;
		color: #8e8e93;
		font-weight: 500;
	}
	.speed-meta {
		display: flex;
		align-items: center;
		justify-content: space-around;
		width: 100%;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 0.5px solid rgba(60, 60, 67, 0.08);
	}
	.meta-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		flex: 1;
	}
	.meta-label {
		font-size: 12px;
		color: #8e8e93;
	}
	.meta-value {
		font-size: 16px;
		font-weight: 600;
		color: #1c1c1e;
		font-variant-numeric: tabular-nums;
	}
	.meta-sep {
		width: 0.5px;
		height: 28px;
		background: rgba(60, 60, 67, 0.08);
	}

	/* ===== Coord Card ===== */
	.coord-card {
		background: #fff;
		border-radius: 14px;
		padding: 6px 16px;
		margin-bottom: 16px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}
	.coord-row {
		display: flex;
		justify-content: space-between;
		padding: 10px 0;
		border-bottom: 0.5px solid rgba(60, 60, 67, 0.08);
		&:last-child { border-bottom: none; }
	}
	.coord-label {
		font-size: 15px;
		color: #8e8e93;
	}
	.coord-value {
		font-size: 15px;
		color: #1c1c1e;
		font-variant-numeric: tabular-nums;
	}

	/* ===== Control ===== */
	.control-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.start-btn {
		width: 72px;
		height: 72px;
		border-radius: 36px;
		background: #007aff;
		color: #fff;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 2px;
		padding: 0;
		font-size: 14px;
		font-weight: 600;
		box-shadow: 0 4px 14px rgba(0, 122, 255, 0.35);
		transition: transform 0.2s, background 0.2s;

		&.recording {
			background: #ff3b30;
			box-shadow: 0 4px 14px rgba(255, 59, 48, 0.35);
		}
		&:active { transform: scale(0.95); }
	}
	.status-row {
		display: flex;
		align-items: center;
		gap: 6px;
		height: 20px;
	}
	.status-dot {
		width: 6px;
		height: 6px;
		border-radius: 3px;
		background: transparent;
		&.active {
			background: #34c759;
			animation: dot-pulse 1s ease-in-out infinite;
		}
		&.error { background: #ff3b30; }
	}
	@keyframes dot-pulse {
		0%, 100% { opacity: 1; }
		50%      { opacity: 0.3; }
	}
	.status-text {
		font-size: 14px;
		color: #8e8e93;
		font-weight: 500;
		&.error { color: #ff3b30; }
	}
</style>
