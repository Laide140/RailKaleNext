<template>
	<view class="page" :style="themeStyle">
		<view class="search-box">
			<!-- 分段控件：胶囊滑块平滑滑动 -->
			<slide-tabs
				class="mode-seg"
				variant="seg"
				bar-only
				:items="modeItems"
				:value="modeIndex"
				@change="onModeChange"
			/>
			<input
				class="search-input"
				v-model="query"
				:placeholder="mode === 'train' ? '输入车次号，如：G1' : '输入车组号，如：CR400BF-A-5054'"
				@confirm="search"
			/>
			<button class="search-btn" @tap="search">查询</button>
		</view>

		<view class="loading" v-if="loading"><text>查询中...</text></view>
		<!-- 错误提示保持原红色，属于语义色 -->
		<view class="error" v-if="error && !loading"><text>{{ error }}</text></view>

		<!-- 车次 → 担当车组（基于已查询的快照，不受输入框实时编辑影响） -->
		<view class="result" v-if="!loading && searched.mode === 'train' && single">
			<view class="result-title">车次 {{ searched.query }} 的担当车组</view>
			<view class="record" @tap="goTrainsOfSet(single.trainSet)">
				<view class="record-body">
					<text class="record-main">{{ single.trainSet }}</text>
					<text class="record-sub">{{ single.type }} 次 · 点击查看该车组全部车次</text>
				</view>
			</view>
		</view>

		<!-- 车组 → 担当车次 -->
		<view class="result" v-if="!loading && searched.mode === 'emu' && list.length">
			<view class="result-title">车组 {{ searched.query }} 担当 {{ list.length }} 趟车次</view>
			<view class="record" v-for="(r, i) in list" :key="i" @tap="goTrainDetail(r.train)">
				<view class="record-body">
					<text class="record-main">{{ r.train }}</text>
					<text class="record-sub">{{ r.type }} 次</text>
				</view>
				<i class="fas fa-chevron-right record-arrow"></i>
			</view>
		</view>

		<view class="empty" v-if="!loading && !hasResult">
			<text>{{ searched.query ? '未查询到记录' : '输入车次或车组号开始查询' }}</text>
		</view>
	</view>
</template>

<script>
	import { getTrainData } from '@/service/api.js'
	import SlideTabs from '@/components/slide-tabs/slide-tabs.vue'

	export default {
		components: { SlideTabs },
		data() {
			return {
				query: '',      // 输入框内容（实时编辑）
				mode: 'train',  // 当前选中的查询类型（实时）
				// 已执行查询的快照：结果区只依据它渲染，
				// 这样编辑输入框或切换类型时不会让已有结果跟着变
				searched: { query: '', mode: '' },
				loading: false,
				single: null,
				list: [],
				error: ''
			}
		},
		computed: {
			modeItems() {
				return [{ key: 'train', label: '车次' }, { key: 'emu', label: '车组号' }]
			},
			modeIndex() {
				return this.mode === 'emu' ? 1 : 0
			},
			hasResult() {
				if (!this.searched.mode) return false
				return this.searched.mode === 'train' ? !!this.single : this.list.length > 0
			}
		},
		onLoad(options) {
			// 支持从车次详情页跳转（点击车型查询该车组全部车次）
			// /pages/emu-query/emu-query?mode=emu&q=CR400BF-A-5054
			if (options && options.mode === 'emu') this.mode = 'emu'
			if (options && options.q) {
				this.query = decodeURIComponent(options.q)
				this.search()
			}
		},
		methods: {
			onModeChange(i) {
				this.switchMode(i === 1 ? 'emu' : 'train')
			},
			switchMode(m) {
				if (this.mode === m) return
				this.mode = m
				// 注意：这里不清空结果。结果区由 searched 快照驱动，
				// 切类型只影响下一次查询，已有结果保持不动。
			},
			async search() {
				const q = String(this.query || '').trim()
				if (!q) {
					uni.showToast({ title: '请输入查询内容', icon: 'none' })
					return
				}
				// 记录本次查询的类型与关键词，结果区据此渲染
				const mode = this.mode
				this.loading = true
				this.error = ''
				this.single = null
				this.list = []

				const res = await getTrainData(mode, q)
				this.loading = false
				// 查询期间用户可能改了类型/关键词，此时以当前值重新判定
				this.searched = { query: q, mode }
				if (mode === 'train') this.single = res.single
				else this.list = res.list
			},
			goTrainsOfSet(trainSet) {
				if (!trainSet) return
				uni.navigateTo({
					url: `/pages/emu-query/emu-query?mode=emu&q=${encodeURIComponent(trainSet)}`
				})
			},
			goTrainDetail(train) {
				if (!train) return
				uni.navigateTo({
					url: `/pages/train-detail/train-detail?train=${encodeURIComponent(train)}`
				})
			}
		}
	}
</script>

<style>
	page { background: var(--bg); }
	.page { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased; padding: 20rpx; }
	.search-box { background: var(--card); border-radius: 14px; padding: 24rpx; margin-bottom: 20rpx; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
	.toggle-bar { display: flex; margin-bottom: 16rpx; background: var(--fill); border-radius: 12rpx; padding: 4rpx; }
	.toggle-btn { flex: 1; text-align: center; padding: 12rpx 0; border-radius: 10rpx; font-size: 26rpx; color: var(--secondary); }
	.toggle-btn.active { background: #fff; color: var(--theme-text); font-weight: bold; }
	.search-input { width: 100%; height: 80rpx; padding: 0 20rpx; background: var(--fill); border-radius: 12rpx; font-size: 28rpx; margin-bottom: 16rpx; color: var(--label); box-sizing: border-box; }
	.search-btn { width: 100%; background: var(--theme); color: #fff; font-size: 28rpx; height: 80rpx; line-height: 80rpx; text-align: center; border-radius: 12rpx; }
	.loading, .empty { text-align: center; padding: 60rpx 0; color: var(--secondary); font-size: 28rpx; }
	/* 错误提示：保留语义红色 */
	.error { text-align: center; padding: 60rpx 0; color: #e74c3c; font-size: 28rpx; }
	.result-title { font-size: 28rpx; font-weight: bold; color: var(--label); margin-bottom: 16rpx; padding-left: 16rpx; border-left: 6rpx solid var(--theme); }
	.record { display: flex; align-items: center; gap: 16rpx; background: var(--card); border-radius: 12px; padding: 24rpx; margin-bottom: 12rpx; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
	.record-body { flex: 1; display: flex; flex-direction: column; gap: 6rpx; }
	.record-main { font-size: 30rpx; font-weight: bold; color: var(--theme-text); }
	.record-sub { font-size: 22rpx; color: var(--secondary); }
	.record-arrow { font-size: 22rpx; color: var(--secondary); }
</style>
