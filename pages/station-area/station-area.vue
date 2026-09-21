<template>
	<view class="page">
		<!-- Header -->
		<view class="header">
			<view class="header-icon-wrap">
				<i class="fas fa-stairs header-icon"></i>
			</view>
			<text class="header-title">站台规模</text>
			<text class="header-subtitle">查询车站的站台数与到发线路数</text>
		</view>

		<!-- 搜索 -->
		<view class="search-card">
			<input
				class="search-input"
				v-model="station"
				placeholder="输入车站名，如：广州南"
				@confirm="search"
				@input="onInput"
			/>
			<button class="search-btn" @tap="search" :loading="loading">
				<i class="fas fa-search" style="font-size: 16px;"></i>
				<text>查 询</text>
			</button>
		</view>

		<!-- 常用车站快捷入口 -->
		<view class="quick-section" v-if="!searched">
			<view class="section-title">常用车站</view>
			<view class="station-tags">
				<view class="tag" v-for="(s, i) in quickStations" :key="i" @tap="fillStation(s)">{{ s }}</view>
			</view>
		</view>

		<!-- 结果 -->
		<view class="result-section" v-if="searched">
			<view class="result-card" v-if="info">
				<view class="result-station">
					<view class="station-icon">
						<i class="fas fa-train"></i>
					</view>
					<text class="station-title">{{ info.station }}</text>
				</view>
				<view class="metric-text">
					<text class="metric-prefix">查询到车站规模为</text>
					<text class="metric-plat">{{ platformText }}台</text>
					<text class="metric-line">{{ lineText }}线</text>
				</view>
				<view class="tip" v-if="info.matched">
					<text>「{{ info.matched }}」近似匹配到 {{ info.station }}</text>
				</view>

				<!-- 车站布线图 -->
				<view class="layout-section" v-if="layoutImg">
					<view class="layout-title">
						<i class="fas fa-project-diagram"></i>
						<text>车站布线图</text>
					</view>
					<view class="layout-thumb" @tap="previewLayout">
						<image class="layout-img" :src="layoutImg" mode="widthFix" @error="onLayoutError" />
						<view class="layout-mask">
							<i class="fas fa-expand"></i>
							<text>点击查看大图</text>
						</view>
					</view>
				</view>
			</view>
			<view class="empty-state" v-if="!info && !loading">
				<i class="fas fa-train-subway" style="font-size: 40px; color: #c6c6c8; margin-bottom: 10px;"></i>
				<text>未查询到该车站的站台信息</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { getStationArea } from '@/service/api.js'

	// 车站布线图地址（维基图片库）
	const LAYOUT_IMG_BASE = 'https://next.laide.net.cn/images/station_line_image_wikipedia/'

	export default {
		data() {
			return {
				station: '',
				loading: false,
				searched: false,
				info: null,
				layoutImg: '',        // 布线图地址（404 时清空，不显示）
				quickStations: ['广州南', '北京南', '上海虹桥', '深圳北', '杭州东', '成都东', '武汉', '南京南']
			}
		},
		computed: {
			// 接口未返回数值时显示 --
			platformText() {
				const v = this.info && this.info.platform
				return (v === undefined || v === null || v === '') ? '--' : v
			},
			lineText() {
				const v = this.info && this.info.line
				return (v === undefined || v === null || v === '') ? '--' : v
			}
		},
		methods: {
			onInput() {
				// 输入变化时清除上次结果
				if (this.searched) {
					this.searched = false
					this.info = null
					this.layoutImg = ''
				}
			},
			fillStation(name) {
				this.station = name
				this.search()
			},
			async search() {
				const val = this.station.trim()
				if (!val) {
					uni.showToast({ title: '请输入车站名', icon: 'none' })
					return
				}
				this.loading = true
				this.searched = true
				this.info = null
				this.layoutImg = ''
				try {
					const res = await getStationArea(val)
					// 成功：code === 200 且 data 存在
					if (res && (res.code === 200 || res.success) && res.data && res.data.station) {
						const stationName = res.data.station
						this.info = {
							station: stationName,
							platform: res.data.platform,
							line: res.data.line,
							matched: (res.message && res.message.includes('模糊')) ? val : null
						}
						this.buildLayoutImg(stationName, val)
					} else {
						uni.showToast({ title: '未找到该车站', icon: 'none' })
					}
				} catch (err) {
					console.error('站台规模查询失败', err)
					uni.showToast({ title: '网络异常', icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			// 构造布线图地址：站名（带“站”后缀）
			buildLayoutImg(stationName, fallbackName) {
				const name = this.withStationSuffix(stationName || fallbackName)
				if (!name) { this.layoutImg = ''; return }
				this.layoutImg = LAYOUT_IMG_BASE + encodeURIComponent(name) + '.png'
			},
			// 补上“站”后缀（接口一般已返回，如“北京南站”；兜底处理“北京南”）
			withStationSuffix(name) {
				const n = String(name || '').trim()
				if (!n) return ''
				return n.endsWith('站') ? n : n + '站'
			},
			// 图片 404 / 加载失败 → 不显示
			onLayoutError() {
				this.layoutImg = ''
			},
			// 查看大图
			previewLayout() {
				if (!this.layoutImg) return
				uni.previewImage({
					urls: [this.layoutImg],
					current: this.layoutImg
				})
			}
		}
	}
</script>

<style lang="scss">
	.page {
		padding: 0 16px 40px;
		background: #f2f2f7;
		min-height: 100vh;
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
		background: #5856d6;
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

	/* ===== Search ===== */
	.search-card {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(255,255,255,0.8);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 14px;
		padding: 12px 16px;
		margin-bottom: 16px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.06);
		border: 0.5px solid rgba(60,60,67,0.06);
	}
	.search-input {
		flex: 1;
		font-size: 17px;
		color: #1c1c1e;
		background: #f5f7fa;
		border-radius: 10px;
		padding: 10px 12px;
		border: none;
		outline: none;
		box-sizing: border-box;
	}
	.search-btn {
		flex-shrink: 0;
		background: #5856d6;
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		font-size: 15px;
		font-weight: 600;
		padding: 0 20px;
		height: 42px;
		border-radius: 21px;
		border: none;
		margin: 0;
	}
	.search-btn:active { opacity: 0.8; }

	/* ===== Quick Stations ===== */
	.section-title {
		font-size: 13px;
		font-weight: 600;
		color: #8e8e93;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 10px;
		padding-left: 4px;
	}
	.station-tags { display: flex; flex-wrap: wrap; gap: 8px; }
	.tag {
		padding: 8px 16px;
		background: rgba(255,255,255,0.8);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 20px;
		font-size: 14px;
		color: #1c1c1e;
		font-weight: 500;
		box-shadow: 0 1px 3px rgba(0,0,0,0.04);
		border: 0.5px solid rgba(60,60,67,0.06);
	}
	.tag:active { background: rgba(255,255,255,0.5); }

	/* ===== Result ===== */
	.result-section { margin-top: 8px; }
	.result-card {
		background: rgba(255,255,255,0.8);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-radius: 14px;
		padding: 22px 16px;
		box-shadow: 0 1px 3px rgba(0,0,0,0.06);
		border: 0.5px solid rgba(60,60,67,0.06);
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.result-station { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
	.station-icon {
		width: 42px;
		height: 42px;
		border-radius: 12px;
		background: #5856d6;
		display: flex;
		align-items: center;
		justify-content: center;
		i { font-size: 20px; color: #fff; }
	}
	.station-title { font-size: 24px; font-weight: 700; color: #1c1c1e; }

	.metrics {
		display: flex;
		align-items: center;
		width: 100%;
		background: #f8f8fa;
		border-radius: 12px;
		padding: 16px 0;
	}
	.metric-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
	.metric-value {
		font-size: 40px;
		font-weight: 700;
		color: #5856d6;
		line-height: 1.1;
		font-variant-numeric: tabular-nums;
	}
	.metric-label { font-size: 13px; color: #8e8e93; font-weight: 500; }
	.metric-sep { width: 0.5px; height: 40px; background: rgba(60,60,67,0.1); }

	/* 查询结果文案：查询到车站规模为 X台 Y线 */
	.metric-text {
		display: flex;
		align-items: baseline;
		justify-content: center;
		flex-wrap: wrap;
		gap: 2px;
		width: 100%;
		background: #f8f8fa;
		border-radius: 12px;
		padding: 18px 16px;
	}
	.metric-prefix { font-size: 15px; color: #8e8e93; font-weight: 500; }
	.metric-plat { font-size: 30px; font-weight: 700; color: #5856d6; font-variant-numeric: tabular-nums; }
	.metric-line { font-size: 30px; font-weight: 700; color: #34c759; font-variant-numeric: tabular-nums; }

	.tip { margin-top: 14px; font-size: 12px; color: #c6c6c8; }

	/* ===== 车站布线图 ===== */
	.layout-section { width: 100%; margin-top: 18px; }
	.layout-title {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		color: var(--secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 10px;
		i { color: var(--blue); font-size: 13px; }
	}
	.layout-thumb {
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		background: var(--fill);
		border: 0.5px solid var(--separator);
	}
	.layout-thumb:active { opacity: 0.85; }
	.layout-img { width: 100%; display: block; }
	.layout-mask {
		position: absolute;
		right: 10px;
		bottom: 10px;
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 5px 10px;
		border-radius: 14px;
		background: rgba(0,0,0,0.55);
		color: #fff;
		font-size: 12px;
		font-weight: 500;
		i { font-size: 12px; color: #fff; }
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 60px 0;
		color: #8e8e93;
		font-size: 15px;
	}
</style>
