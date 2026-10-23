<template>
	<view class="page" :style="themeStyle">
		<!-- 输入区 -->
		<view class="form-card">
			<view class="form-row">
				<view class="form-item">
					<text class="form-label">起点站</text>
					<input
						class="form-input"
						v-model="from"
						placeholder="如：广州南"
						placeholder-class="ph"
						@confirm="searchRoute"
					/>
				</view>
				<view class="swap-btn" @tap="swapStation">
					<text>⇄</text>
				</view>
				<view class="form-item">
					<text class="form-label">终点站</text>
					<input
						class="form-input"
						v-model="to"
						placeholder="如：北京西"
						placeholder-class="ph"
						@confirm="searchRoute"
					/>
				</view>
			</view>
			<view class="form-row">
				<view class="form-item">
					<text class="form-label">目标里程（可选）</text>
					<input
						class="form-input"
						v-model="km"
						type="number"
						placeholder="留空 = 最短路径"
						placeholder-class="ph"
					/>
				</view>
				<button class="search-btn" @tap="searchRoute" :loading="loading">算 路</button>
			</view>
			<!-- 指定里程模式：大概里程（快）/ 精确里程（慢） -->
			<view class="form-row ver-row" v-if="km">
				<text class="form-label ver-label">里程精度</text>
				<view class="ver-opts">
					<view
						class="ver-opt"
						:class="{ active: ver === 1 }"
						@tap="ver = 1"
					>
						<text class="ver-name">大概里程</text>
						<text class="ver-desc">快，约 2.5 秒</text>
					</view>
					<view
						class="ver-opt"
						:class="{ active: ver === 2 }"
						@tap="ver = 2"
					>
						<text class="ver-name">精确里程</text>
						<text class="ver-desc">慢，约 6.5 秒起</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 结果摘要 -->
		<view class="summary" v-if="result && result.ok">
			<view class="summary-row">
				<text class="summary-km">{{ result.distance.kilometers.toFixed(1) }}</text>
				<text class="summary-unit">km</text>
			</view>
			<view class="summary-meta">
				<text class="meta-item">途经 {{ result.stationCount }} 站</text>
				<text class="meta-item" v-if="result.nodeCount">{{ result.nodeCount }} 个走行节点</text>
				<text class="meta-item" v-if="result.ferry && result.ferry.hasFerry">
					⛴ 轮渡 {{ result.ferry.km.toFixed(1) }} km
				</text>
			</view>
			<view class="km-plan" v-if="result.kmPlan">
				<text class="km-plan-text">
					目标 {{ result.kmPlan.requestedKm }} km · 实际 {{ result.kmPlan.actualKm.toFixed(1) }} km
					（偏差 {{ result.kmPlan.diffKm > 0 ? '+' : '' }}{{ result.kmPlan.diffKm.toFixed(1) }}）
				</text>
				<text class="km-plan-tag">
					{{ result.kmPlan.mode || (result.kmPlan.ver === 2 ? '微调' : '整段') }}
					· {{ result.kmPlan.reached ? '已达成' : '未达成，已返回最短路' }}
				</text>
			</view>
			<view class="warnings" v-if="result.warnings && result.warnings.length">
				<text class="warn-item" v-for="(w, i) in result.warnings" :key="i">{{ w }}</text>
			</view>
		</view>

		<!-- 线路走向全图 -->
		<view class="card" v-if="result && result.ok && fullMapUrl">
			<view class="card-head">
				<i class="fas fa-route card-icon"></i>
				<text class="card-title">全线走向</text>
			</view>
			<image class="route-map" :src="fullMapUrl" mode="widthFix"></image>
		</view>

		<!-- 途经车站 -->
		<view class="card" v-if="result && result.ok && stations.length">
			<view class="card-head">
				<i class="fas fa-train-subway card-icon"></i>
				<text class="card-title">途经车站</text>
				<text class="card-live">{{ stations.length }} 站</text>
			</view>
			<view class="station-list">
				<view class="station-row" v-for="(s, i) in stations" :key="s.code + i">
					<view class="station-rail">
						<view class="station-dot" :class="{ edge: i === 0 || i === stations.length - 1 }"></view>
						<view class="station-line" v-if="i < stations.length - 1"></view>
					</view>
					<view class="station-body">
						<view class="station-main">
							<text class="station-name">{{ cleanName(s.name) }}</text>
							<text class="station-code">{{ s.code }}</text>
						</view>
						<text class="station-km">{{ s.km.toFixed(1) }} km</text>
					</view>
				</view>
			</view>
		</view>

		<view class="empty" v-if="errorText && !loading">
			<i class="fas fa-circle-exclamation empty-icon"></i>
			<text class="empty-text">{{ errorText }}</text>
			<text class="empty-hint" v-if="errorHint">{{ errorHint }}</text>
		</view>

		<!-- 加载态：指定里程模式要跑几十秒，给出明确说明 -->
		<view class="empty" v-if="loading">
			<view class="spinner"></view>
			<text class="empty-text">{{ km ? '正在规划指定里程线路…' : '正在计算最短路径…' }}</text>
			<text class="empty-hint" v-if="km">{{ ver === 2 ? '精确里程需反复微调，耗时较长' : '大概里程会遍历大量绕行方案' }}</text>
		</view>

		<view class="empty" v-if="!result && !loading && !errorText">
			<i class="fas fa-route empty-icon"></i>
			<text class="empty-text">输入起终点站，计算最短走行线路</text>
		</view>

		<app-toast ref="toast" />
	</view>
</template>

<script>
	import { getStationRoute, getAmapStaticMap } from '@/service/api.js'

	export default {
		data() {
			return {
				from: '',
				to: '',
				km: '',
				ver: 1,          // 1=大概里程（默认，快）；2=精确里程（慢）
				loading: false,
				result: null,
				errorText: '',
				errorHint: ''
			}
		},
		computed: {
			stations() { return (this.result && this.result.stations) || [] },
			coords() {
				const g = this.result && this.result.geometry
				return (g && g.coordinates) || []
			},
			/**
			 * 全线走向静态图。
			 *
			 * 高德静态图对路径点数与 URL 长度都有上限，这里沿线路等距抽稀，
			 * 并把坐标保留到 4 位小数（约 10m 精度），足以表现走向。
			 */
			fullMapUrl() {
				const pts = this.simplify(this.coords, 60)
				if (pts.length < 2) return ''
				const path = pts.map(c => `${Number(c[0]).toFixed(4)},${Number(c[1]).toFixed(4)}`).join(';')
				return getAmapStaticMap('750*500', null, '7,0x007AFF,1,,:' + path)
			}
		},
		onLoad(options) {
			if (options && options.from) this.from = decodeURIComponent(options.from)
			if (options && options.to) this.to = decodeURIComponent(options.to)
			if (this.from && this.to) this.searchRoute()
		},
		methods: {
			swapStation() {
				const t = this.from
				this.from = this.to
				this.to = t
			},
			// 接口返回的站名常带「站」字，界面上去掉更清爽
			cleanName(name) {
				return String(name || '').replace(/站$/, '')
			},
			/**
			 * 等距抽稀：把上万个几何点压到 maxN 个，
			 * 既满足静态图限制，又能保持线路整体形状。
			 */
			simplify(coords, maxN) {
				const n = coords.length
				if (n <= maxN) return coords
				const step = Math.ceil(n / maxN)
				const out = []
				for (let i = 0; i < n; i += step) out.push(coords[i])
				// 末点必留，否则线路会缺一截
				if (out[out.length - 1] !== coords[n - 1]) out.push(coords[n - 1])
				return out
			},
			async searchRoute() {
				const f = String(this.from || '').trim()
				const t = String(this.to || '').trim()
				if (!f || !t) {
					this.toast('请输入起点站和终点站')
					return
				}
				const km = String(this.km || '').trim()
				if (km && !(Number(km) > 0)) {
					this.toast('目标里程需为正数')
					return
				}
				this.loading = true
				this.errorText = ''
				this.errorHint = ''
				this.result = null
				try {
					const res = await getStationRoute(f, t, km ? Number(km) : 0, km ? this.ver : 0)
					if (!res) {
						this.errorText = '网络异常，请稍后重试'
						return
					}
					if (res.ok === false) {
						this.errorText = res.error || '算路失败'
						this.errorHint = res.hint || ''
						return
					}
					this.result = res
				} catch (e) {
					this.errorText = '网络异常，请稍后重试'
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
		background: var(--bg);
		padding: 16px 16px 40px;
		box-sizing: border-box;
	}

	/* 输入区 */
	.form-card {
		background: var(--card);
		border-radius: 14px;
		padding: 14px;
		margin-bottom: 14px;
		border: 1px solid var(--theme-border);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}
	.form-row { display: flex; align-items: flex-end; gap: 10px; }
	.form-row + .form-row { margin-top: 12px; }
	.form-item { flex: 1; min-width: 0; }
	.form-label {
		display: block;
		font-size: 12px;
		color: var(--secondary);
		margin-bottom: 6px;
	}
	.form-input {
		width: 100%;
		height: 44px;
		padding: 0 12px;
		background: var(--fill);
		border-radius: 10px;
		font-size: 16px;
		color: var(--label);
		box-sizing: border-box;
	}
	.ph { color: var(--secondary); }
	.swap-btn {
		width: 34px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--theme-text);
		font-size: 18px;
	}
	.search-btn {
		flex-shrink: 0;
		height: 44px;
		line-height: 44px;
		padding: 0 22px;
		background: var(--theme);
		color: #fff;
		font-size: 16px;
		font-weight: 600;
		border-radius: 10px;
		border: none;
	}

	/* 里程精度选择 */
	.ver-row { align-items: center; }
	.ver-label { margin-bottom: 0; }
	.ver-opts { flex: 1; display: flex; gap: 8px; }
	.ver-opt {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px 10px;
		border-radius: 10px;
		border: 1px solid var(--theme-border);
		background: var(--fill);
	}
	.ver-opt.active {
		border-color: var(--theme);
		background: var(--theme-soft);
	}
	.ver-name { font-size: 14px; font-weight: 600; color: var(--label); }
	.ver-desc { font-size: 11px; color: var(--secondary); }

	/* 结果摘要 */
	.summary {
		background: var(--theme);
		border-radius: 14px;
		padding: 18px 16px;
		margin-bottom: 14px;
		color: #fff;
	}
	.summary-row { display: flex; align-items: baseline; gap: 4px; }
	.summary-km { font-size: 34px; font-weight: 800; font-variant-numeric: tabular-nums; }
	.summary-unit { font-size: 15px; opacity: 0.9; }
	.summary-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
	.meta-item { font-size: 13px; opacity: 0.92; }
	.km-plan {
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid rgba(255, 255, 255, 0.24);
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.km-plan-text { font-size: 13px; }
	.km-plan-tag { font-size: 12px; opacity: 0.85; }
	.warnings { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
	.warn-item { font-size: 12px; opacity: 0.85; }

	/* 卡片 */
	.card {
		background: var(--card);
		border-radius: 14px;
		padding: 14px;
		margin-bottom: 14px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
	}
	.card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
	.card-icon { font-size: 15px; color: var(--theme-text); }
	.card-title { font-size: 15px; font-weight: 600; color: var(--label); }
	.card-live { margin-left: auto; font-size: 12px; color: var(--secondary); }

	.route-map { width: 100%; border-radius: 10px; display: block; }

	/* 途经车站列表 */
	.station-list { display: flex; flex-direction: column; }
	.station-row { display: flex; gap: 12px; }
	.station-rail {
		width: 12px;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 6px;
	}
	.station-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--theme);
		flex-shrink: 0;
	}
	.station-dot.edge { width: 10px; height: 10px; }
	.station-line {
		flex: 1;
		width: 2px;
		background: var(--theme-border);
		margin: 2px 0;
	}
	.station-body {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 4px 0 14px;
	}
	.station-main { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
	.station-name { font-size: 15px; font-weight: 600; color: var(--label); }
	.station-code { font-size: 11px; color: var(--secondary); }
	.station-km { font-size: 12px; color: var(--secondary); font-variant-numeric: tabular-nums; flex-shrink: 0; }

	/* 空态 / 错误 */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 50px 0;
	}
	.empty-icon { font-size: 30px; color: var(--secondary); }
	.empty-text { font-size: 14px; color: var(--secondary); text-align: center; }
	.empty-hint { font-size: 12px; color: var(--secondary); opacity: 0.8; text-align: center; }

	.spinner {
		width: 26px;
		height: 26px;
		border: 3px solid var(--theme-border);
		border-top-color: var(--theme);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin { to { transform: rotate(360deg); } }
</style>
