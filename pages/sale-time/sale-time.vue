<template>
	<view class="page" :style="themeStyle">
		<!-- 搜索框 -->
		<view class="search-section">
			<i class="fas fa-search search-icon"></i>
			<input
				class="search-input"
				v-model="keyword"
				placeholder="输入车站名 / 电报码，如：北京南"
				placeholder-class="search-placeholder"
				confirm-type="search"
				@confirm="onSearch"
				@input="onInput"
			/>
			<text class="search-cancel" v-if="keyword" @tap="clearKeyword">✕</text>
		</view>

		<!-- 加载中 -->
		<view class="loading-state" v-if="loading && !list.length">
			<view class="spinner"></view>
			<text>正在获取车站开售时间…</text>
		</view>

		<view class="error-state" v-else-if="error">
			<text>{{ error }}</text>
			<text class="retry" @tap="load(true)">点击重试</text>
		</view>

		<template v-else>
			<!-- 结果统计 -->
			<view class="hint" v-if="keyword">
				找到 <text class="hint-num">{{ filtered.length }}</text> 个车站
			</view>
			<view class="hint" v-else>
				共收录 <text class="hint-num">{{ list.length }}</text> 个车站 · 输入站名可快速筛选
			</view>

			<!-- 车站列表 -->
			<view class="list">
				<view class="row" v-for="(s, i) in filtered" :key="i">
					<view class="row-main">
						<text class="row-name">{{ s.station_name }}</text>
						<text class="row-code">{{ s.station_telecode }}</text>
					</view>
					<view class="row-right">
						<text class="row-time">{{ fmt(s.sale_time) }}</text>
						<!-- 无路局归属 = 已撤销车站，给出明确标注而非留空 -->
						<text class="row-bureau" v-if="bureau(s.bureau_code)">{{ bureau(s.bureau_code) }}</text>
						<text class="row-closed" v-else>已停办</text>
					</view>
				</view>
			</view>

			<!-- 空结果 -->
			<view class="empty-state" v-if="keyword && !filtered.length">
				<i class="fas fa-search empty-icon"></i>
				<text>没有匹配「{{ keyword }}」的车站</text>
			</view>

			<!-- 列表过长时提示 -->
			<view class="limit-hint" v-if="filtered.length > showLimit">
				<text>仅显示前 {{ showLimit }} 条，请继续输入以缩小范围</text>
			</view>

			<!-- 名词说明 -->
			<view class="footnote" v-if="list.length">
				<text>「已停办」指该站所属路局建制已撤销，不再有开售时间。</text>
			</view>
		</template>
	</view>
</template>

<script>
	import { getStationSaleTimeInfo, formatSaleTime, bureauName } from '@/service/api.js'

	const CACHE_KEY = 'station_sale_time_v1'
	const CACHE_TTL = 7 * 24 * 3600 * 1000   // 开售时间变动不频繁，缓存一周

	export default {
		data() {
			return {
				list: [],
				keyword: '',
				loading: false,
				error: '',
				showLimit: 200
			}
		},
		computed: {
			// 按站名 / 电报码 / 拼音首字母模糊筛选
			filtered() {
				const kw = this.keyword.trim().toUpperCase()
				if (!kw) return this.list.slice(0, this.showLimit)
				const out = []
				for (const s of this.list) {
					const name = String(s.station_name || '')
					const code = String(s.station_telecode || '').toUpperCase()
					if (name.indexOf(this.keyword.trim()) >= 0 || code.indexOf(kw) >= 0) {
						out.push(s)
						if (out.length >= this.showLimit) break
					}
				}
				return out
			}
		},
		onLoad() {
			this.load()
		},
		methods: {
			fmt(t) {
				return formatSaleTime(t)
			},
			bureau(code) {
				return bureauName(code)
			},
			async load(force) {
				// 先读本地缓存，避免每次进入都下载 800KB
				if (!force) {
					const cached = this.readCache()
					if (cached) {
						this.list = cached
						return
					}
				}
				this.loading = true
				this.error = ''
				try {
					const res = await getStationSaleTimeInfo()
					const arr = Array.isArray(res) ? res : []
					if (!arr.length) {
						this.error = '未获取到开售时间数据'
					} else {
						this.list = arr
						this.writeCache(arr)
					}
				} catch (e) {
					this.error = '网络异常，请稍后重试'
				} finally {
					this.loading = false
				}
			},
			readCache() {
				try {
					const raw = uni.getStorageSync(CACHE_KEY)
					if (!raw) return null
					const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
					if (!obj || !Array.isArray(obj.list) || !obj.list.length) return null
					if (obj.ts && Date.now() - obj.ts > CACHE_TTL) return null
					return obj.list
				} catch (e) {
					return null
				}
			},
			writeCache(list) {
				try {
					uni.setStorageSync(CACHE_KEY, JSON.stringify({ ts: Date.now(), list }))
				} catch (e) {}
			},
			onInput() {
				// 输入即筛选，无需额外处理（computed 负责）
			},
			onSearch() {},
			clearKeyword() {
				this.keyword = ''
			}
		}
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
		margin-bottom: 12px;
		border: 1px solid var(--theme-border);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}
	.search-icon { font-size: 17px; color: var(--theme-text); }
	.search-input {
		flex: 1;
		font-size: 17px;
		color: var(--label);
		background: transparent;
		border: none;
		outline: none;
		height: 44px;
		line-height: 44px;
	}
	.search-placeholder { color: var(--secondary); }
	.search-cancel { font-size: 15px; color: var(--secondary); padding: 0 6px; }

	.hint {
		font-size: 12px;
		color: var(--secondary);
		padding: 0 4px 10px;
	}
	.hint-num { color: var(--theme-text); font-weight: 700; }

	/* ===== 加载 / 错误 ===== */
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
	.error-state {
		display: flex; flex-direction: column; align-items: center; gap: 10px;
		padding: 60px 0; color: var(--secondary); font-size: 14px;
	}
	.retry { color: var(--theme-text); font-weight: 600; }

	/* ===== 列表 ===== */
	.list { background: var(--card); border-radius: 14px; overflow: hidden; }
	.row {
		display: flex; align-items: center; justify-content: space-between;
		gap: 10px;
		padding: 13px 16px;
		border-bottom: 0.5px solid var(--separator);
	}
	.row:last-child { border-bottom: none; }
	.row-main { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
	.row-name {
		font-size: 16px; font-weight: 600; color: var(--label);
		overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	}
	.row-code {
		font-size: 11px; color: var(--secondary);
		background: var(--fill);
		border-radius: 4px; padding: 1px 5px;
		flex-shrink: 0;
	}
	.row-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
	.row-time {
		font-size: 16px; font-weight: 700; color: var(--theme-text);
		font-variant-numeric: tabular-nums;
	}
	.row-bureau { font-size: 11px; color: var(--secondary); }
	/* 已停办车站：中性描边标记，不用彩色以免与语义色混淆 */
	.row-closed {
		font-size: 11px;
		color: var(--secondary);
		border: 0.5px solid var(--separator);
		border-radius: 4px;
		padding: 0 5px;
	}

	/* ===== 空态 ===== */
	.empty-state {
		display: flex; flex-direction: column; align-items: center; gap: 12px;
		padding: 70px 24px; color: var(--secondary); font-size: 14px; text-align: center;
	}
	.empty-icon { font-size: 34px; color: var(--theme-text); opacity: 0.5; }
	.limit-hint {
		text-align: center; padding: 16px 0; font-size: 12px; color: var(--secondary);
	}
	.footnote {
		text-align: center; padding: 14px 20px 0;
		font-size: 11px; line-height: 1.6; color: var(--secondary);
	}
</style>
