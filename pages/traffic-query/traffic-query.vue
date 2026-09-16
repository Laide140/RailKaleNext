<template>
	<view class="page">
		<view class="search-box">
			<input class="search-input" v-model="station" placeholder="请输入车站名称，如：上海虹桥" @confirm="search" />
			<button class="search-btn" @tap="search" :loading="loading">查询</button>
		</view>

		<view class="loading-state" v-if="loading"><text>正在查询...</text></view>
		<view class="error-state" v-if="error"><text>{{ error }}</text></view>

		<view class="result" v-if="result">
			<view class="tabs">
				<view class="tab" v-for="(tab, idx) in tabList" :key="idx" :class="{ active: activeTab === idx }" @tap="activeTab = idx">
					<text>{{ tab.tabName }}</text>
				</view>
			</view>
			<view class="tab-content">
				<view class="node-card" v-for="(node, ni) in filteredNodes" :key="ni">
					<view class="node-header">
						<text class="node-name">{{ node.nodeName }}</text>
						<text class="node-desc">{{ node.des }}</text>
					</view>
					<view class="line-list" v-if="node.nodeList && node.nodeList.length">
						<view class="line-item" v-for="(line, li) in node.nodeList" :key="li">
							<view class="line-color" v-if="line.color" :style="{ backgroundColor: line.color }"></view>
							<text class="line-name" :class="{ 'has-color': line.color }">{{ line.nodeName }}</text>
						</view>
					</view>
					<view class="line-list empty" v-else><text class="line-name empty-text">暂无线路信息</text></view>
				</view>
				<view class="empty-tab" v-if="!filteredNodes.length"><text>该分类下暂无信息</text></view>
			</view>
		</view>

		<view class="empty-state" v-if="!loading && !result && !error">
			<i class="fas fa-subway empty-icon"></i>
			<text class="empty-text">输入车站名称查询交通接驳信息</text>
		</view>
	</view>
</template>

<script>
	import { getStationCode, getStationInfo } from '@/service/api.js'
	export default {
		data() {
			return { station: '', loading: false, result: null, error: '', activeTab: 0 }
		},
		computed: {
			tabList() {
				if (!this.result || !this.result.tabList) return []
				return this.result.tabList
			},
			filteredNodes() {
				if (!this.result || !this.result.nodeList) return []
				var tab = this.tabList[this.activeTab]
				if (!tab) return []
				return this.result.nodeList.filter(function(n) {
					if (tab.tabType) return n.typeName === tab.tabName || n.nodeType === tab.tabType
					return n.typeName === tab.tabName
				})
			}
		},
		methods: {
			async search() {
				var s = this.station.trim()
				if (!s) { uni.showToast({ title: '请输入车站名称', icon: 'none' }); return }
				this.loading = true; this.error = ''; this.result = null; this.activeTab = 0
				try {
					var code = await this.findCode(s)
					if (!code) { this.error = '未找到该车站'; this.loading = false; return }
					var res = await this.queryInfo(code)
					if (res && res.content && res.content.data) this.result = res.content.data
					else this.error = '未查询到交通接驳信息'
				} catch(e) { this.error = '查询失败' }
				this.loading = false
			},

			findCode(name) {
				return new Promise(function(resolve, reject) {
					getStationCode().then(function(list) {
						if (!Array.isArray(list)) { resolve(null); return }
						for (var i = 0; i < list.length; i++) {
							var parts = list[i].split('|')
							if (parts.length >= 3 && parts[1] === name) { resolve(parts[2]); return }
						}
						resolve(null)
					}).catch(function(e) { console.warn('[交通] 代码查询失败:', e); reject(e) })
				})
			},

			queryInfo(code) {
				return getStationInfo(code)
			}
		}
	}
</script>

<style lang="scss">
	.page { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; background: #f2f2f7; padding: 20rpx; }
	.search-box { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 14px; padding: 24rpx; display: flex; align-items: center; gap: 16rpx; box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06); margin-bottom: 20rpx; }
	.search-input { flex: 1; padding: 14rpx 20rpx; background: #f5f7fa; border-radius: 12rpx; font-size: 28rpx; }
	.search-btn { background: #007aff; color: #fff; font-size: 26rpx; padding: 0 28rpx; height: 60rpx; line-height: 60rpx; border-radius: 50rpx; flex-shrink: 0; }
	.loading-state, .error-state { text-align: center; padding: 80rpx 0; color: #999; font-size: 28rpx; }
	.error-state { color: #e74c3c; }
	.tabs { display: flex; background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 14px; padding: 10rpx; margin-bottom: 20rpx; gap: 8rpx; }
	.tab { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 12rpx; font-size: 26rpx; color: #666; }
	.tab.active { background: #007aff; color: #fff; font-weight: bold; }
	.node-card { background: rgba(255,255,255,0.8); backdrop-filter: blur(20px); border-radius: 14px; padding: 24rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.04); }
	.node-header { margin-bottom: 16rpx; }
	.node-name { font-size: 30rpx; font-weight: bold; color: #333; display: block; }
	.node-desc { font-size: 24rpx; color: #999; margin-top: 6rpx; display: block; }
	.line-list { display: flex; flex-wrap: wrap; gap: 12rpx; }
	.line-item { display: flex; align-items: center; gap: 8rpx; padding: 8rpx 16rpx; background: #f5f7fa; border-radius: 8rpx; }
	.line-color { width: 16rpx; height: 16rpx; border-radius: 50%; flex-shrink: 0; }
	.line-name { font-size: 24rpx; color: #333; }
	.has-color { font-weight: bold; }
	.empty-text { color: #bbb; }
	.empty-tab { text-align: center; padding: 60rpx 0; color: #999; font-size: 26rpx; }
	.empty-state { text-align: center; padding: 120rpx 0; }
	.empty-icon { font-size: 80rpx; display: block; margin-bottom: 20rpx; color: #ccc; }
	.empty-state .empty-text { font-size: 28rpx; color: #999; }
</style>
