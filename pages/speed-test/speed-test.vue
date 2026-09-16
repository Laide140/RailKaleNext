<template>
	<view class="page">
		<!-- Header -->
		<view class="header">
			<view class="header-icon-wrap">
				<i class="fas fa-gauge-high header-icon"></i>
			</view>
			<text class="header-title">定位测速</text>
			<text class="header-subtitle">基于高德地图的实时速度与移动轨迹</text>
		</view>

		<!-- 高德地图 + canvas 叠加层 -->
		<view class="map-card">
			<view class="map-wrap">
				<view id="amapContainer" class="map-container"></view>
				<canvas class="map-canvas" canvas-id="trackCanvas" id="trackCanvas"></canvas>
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
						this.mapReady = true
						this.statusText = '点击开始进行定位测速'
						this.drawPlaceholder()
					})
				}).catch(() => {
					this.statusText = '高德地图加载失败'
					this.error = true
				})
			},

			// 在地图容器上方叠加透明 canvas（H5 原生 2D 上下文自绘路径与小圆点，稳定可靠）
			setupOverlayCanvas() {
				const el = document.getElementById('amapContainer')
				if (!el) return
				const cv = document.getElementById('trackCanvas')
				if (!cv) return
				this._canvasEl = cv
				this._g = cv.getContext('2d')
				this._sizeCanvas()

				this.map.on('moveend', () => this.redrawPath())
				this.map.on('zoomend', () => this.redrawPath())
				// 保存引用以便在 cleanup 时移除，避免监听泄漏
				this._onResize = () => {
					this._sizeCanvas()
					this.redrawPath()
				}
				if (typeof window !== 'undefined' && window.addEventListener) {
					window.addEventListener('resize', this._onResize)
				}
			},

			// 让叠加 canvas 与地图容器尺寸一致，并按 DPR 适配，避免模糊/错位
			_sizeCanvas() {
				const el = document.getElementById('amapContainer')
				const cv = this._canvasEl
				if (!el || !cv) return
				const rect = el.getBoundingClientRect()
				const dpr = window.devicePixelRatio || 1
				this._mapRect = { width: rect.width, height: rect.height }
				this._dpr = dpr
				cv.style.width = rect.width + 'px'
				cv.style.height = rect.height + 'px'
				cv.width = Math.round(rect.width * dpr)
				cv.height = Math.round(rect.height * dpr)
				const g = cv.getContext('2d')
				this._g = g
				g.setTransform(dpr, 0, 0, dpr, 0, 0)
			},

			// 无轨迹时的占位提示
			drawPlaceholder() {
				this.redrawPath()
			},

			// 用高德 lngLatToContainer 把轨迹经纬度画到叠加 canvas 上（原生 2D）
			redrawPath() {
				const g = this._g
				if (!g || !this.map || !this._mapRect) return
				g.clearRect(0, 0, this._mapRect.width, this._mapRect.height)
				const pts = this.points
				if (pts.length >= 2) {
					g.lineCap = 'round'
					g.lineJoin = 'round'
					// 路径光晕
					g.beginPath()
					g.strokeStyle = 'rgba(52,199,89,0.25)'
					g.lineWidth = 8
					let started = false
					for (let i = 0; i < pts.length; i++) {
						const px = this.toCanvasXY(pts[i].lng, pts[i].lat)
						if (!px) continue            // 跳过无效点，别整体放弃
						if (!started) { g.moveTo(px.x, px.y); started = true }
						else g.lineTo(px.x, px.y)
					}
					if (started) g.stroke()
					// 路径主色
					g.beginPath()
					g.strokeStyle = '#34c759'
					g.lineWidth = 3.5
					started = false
					for (let i = 0; i < pts.length; i++) {
						const px = this.toCanvasXY(pts[i].lng, pts[i].lat)
						if (!px) continue
						if (!started) { g.moveTo(px.x, px.y); started = true }
						else g.lineTo(px.x, px.y)
					}
					if (started) g.stroke()
				}
				// 当前位置小圆点
				const last = this.points[this.points.length - 1] || this.lastFix
				if (last) {
					const px = this.toCanvasXY(last.lng, last.lat)
					if (px) this.drawDot(px.x, px.y)
				}
			},

			toCanvasXY(lng, lat) {
				try {
					const p = this.map.lngLatToContainer(new window.AMap.LngLat(lng, lat))
					if (!p || !isFinite(p.x) || !isFinite(p.y)) return null
					return { x: p.x, y: p.y }
				} catch (e) { return null }
			},

			drawDot(x, y) {
				const g = this._g
				if (!g) return
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

				if (typeof navigator !== 'undefined' && navigator.geolocation) {
					try {
						this.watchId = navigator.geolocation.watchPosition(
							pos => this.handleFix(pos.coords),
							err => this.handleGeolocationError(err),
							{ enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
						)
						this.statusText = '正在实时定位…'
						return
					} catch (e) { /* 兜底 */ }
				}
				const timer = setInterval(() => {
					if (!this.recording) { clearInterval(timer); return }
					uni.getLocation({
						type: 'gcj02',
						success: res => this.handleFix(res),
						fail: () => {}
					})
				}, 2000)
				this._pollTimer = timer
				this.statusText = '正在实时定位…'
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
				if (this.map) {
					this.map.setCenter([lng, lat])
					this.redrawPath()
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
				// 刷新当前时间戳，驱动"总路程÷总时长"的速度与测试时长实时更新
				this._now = Date.now()
				this.redrawPath()
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

	/* ===== Header ===== */
	.header {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 28px 0 20px;
	}
	.header-icon-wrap {
		width: 52px;
		height: 52px;
		border-radius: 14px;
		background: #007aff;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 14px;
	}
	.header-icon { font-size: 24px; color: #fff; }
	.header-title {
		font-size: 22px;
		font-weight: 700;
		color: #1c1c1e;
		margin-bottom: 3px;
	}
	.header-subtitle {
		font-size: 14px;
		color: #8e8e93;
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
	.map-canvas {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 2;
		pointer-events: none;
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
