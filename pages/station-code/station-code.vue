<template>
	<view class="page">
		<!-- 搜索栏 -->
		<view class="search-box">
			<input class="search-input" v-model="keyword" placeholder="搜索车站名称或代码" @input="onSearch" />
			<i class="fas fa-search search-icon"></i>
		</view>

		<view class="count-bar" v-if="filteredList.length > 0">
			共 <text class="count-num">{{ filteredList.length }}</text> 个车站
		</view>

		<!-- 字母索引 -->
		<view class="letter-bar" v-if="!keyword">
			<text class="letter-item" v-for="l in letters" :key="l" @tap="scrollToLetter(l)">{{ l }}</text>
		</view>

		<!-- 车站列表 -->
		<view class="station-list">
			<view class="station-item" v-for="(station, index) in filteredList" :key="index">
				<view class="station-info">
					<text class="station-name">{{ station.name }}</text>
					<text class="station-pinyin">{{ station.pinyin }}</text>
				</view>
				<view class="station-code-box">
					<text class="station-code">{{ station.telecode }}</text>
					<text class="station-abbr">{{ station.abbr }}</text>
				</view>
				<view class="station-city">{{ station.city }}</view>
			</view>
		</view>

		<view class="loading-state" v-if="loading">
			<text>加载中...</text>
		</view>

		<view class="empty-state" v-if="!loading && filteredList.length === 0">
			<text>{{ keyword ? '未找到匹配的车站' : '正在加载车站数据...' }}</text>
		</view>
	</view>
</template>

<script>
	import { getStationCode, parseStationCode } from '@/service/api.js'

	export default {
		data() {
			return {
				keyword: '',
				loading: true,
				allStations: [],
				letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
			}
		},
		computed: {
			filteredList() {
				if (!this.keyword) return this.allStations
				const kw = this.keyword.toLowerCase()
				return this.allStations.filter(s =>
					s.name.includes(kw) ||
					s.pinyin.toLowerCase().includes(kw) ||
					s.telecode.toLowerCase().includes(kw) ||
					s.abbr.toLowerCase().includes(kw) ||
					s.city.includes(kw)
				)
			}
		},
		onLoad() {
			this.fetchData()
		},
		methods: {
			async fetchData() {
				this.loading = true
				try {
					const raw = await getStationCode()
					this.allStations = parseStationCode(raw)
				} catch (err) {
					uni.showToast({ title: '加载失败', icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			onSearch() {
				// computed handles filtering
			},
			scrollToLetter(letter) {
				// Simple scroll to first station matching letter
				const idx = this.allStations.findIndex(s =>
					s.pinyin && s.pinyin.toUpperCase().startsWith(letter)
				)
				if (idx >= 0) {
					uni.pageScrollTo({
						scrollTop: idx * 120,
						duration: 300
					})
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

	.search-box {
		position: relative;
		margin-bottom: 20rpx;
	}

	.search-input {
		background: #fff;
		border-radius: 50rpx;
		padding: 20rpx 40rpx 20rpx 60rpx;
		font-size: 28rpx;
		color: #333;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
	}

	.search-icon {
		position: absolute;
		left: 24rpx;
		top: 50%;
		transform: translateY(-50%);
		font-size: 28rpx;
		color: #999;
	}

	.count-bar {
		font-size: 24rpx;
		color: #999;
		padding: 0 10rpx 16rpx;
	}

	.count-num {
		color: #007aff;
		font-weight: bold;
	}

	.letter-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 6rpx;
		margin-bottom: 16rpx;
		padding: 16rpx;
		background: #fff;
		border-radius: 12rpx;
		justify-content: center;
	}

	.letter-item {
		width: 48rpx;
		height: 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 22rpx;
		color: #007aff;
		font-weight: bold;
	}

	.station-list {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.station-item {
		background: #fff;
		border-radius: 16rpx;
		padding: 24rpx 30rpx;
		display: flex;
		align-items: center;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	}

	.station-info {
		flex: 1;
	}

	.station-name {
		font-size: 30rpx;
		font-weight: bold;
		color: #333;
		display: block;
	}

	.station-pinyin {
		font-size: 22rpx;
		color: #bbb;
		display: block;
		margin-top: 4rpx;
	}

	.station-code-box {
		text-align: center;
		margin: 0 20rpx;
	}

	.station-code {
		font-size: 28rpx;
		font-weight: bold;
		color: #007aff;
		background: #e8f0fe;
		padding: 4rpx 16rpx;
		border-radius: 8rpx;
		display: block;
		font-family: monospace;
	}

	.station-abbr {
		font-size: 20rpx;
		color: #999;
		margin-top: 4rpx;
		display: block;
	}

	.station-city {
		font-size: 24rpx;
		color: #999;
		min-width: 80rpx;
		text-align: right;
	}

	.loading-state, .empty-state {
		text-align: center;
		padding: 80rpx 0;
		color: #999;
		font-size: 28rpx;
	}
</style>
