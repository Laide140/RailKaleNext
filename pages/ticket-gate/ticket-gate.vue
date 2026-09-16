<template>
	<view class="page">
		<view class="form-card">
			<view class="form-group">
				<text class="form-label">车次号</text>
				<input class="form-input" v-model="trainNum" placeholder="如：G1" />
			</view>
			<view class="form-group">
				<text class="form-label">车站</text>
				<input class="form-input" v-model="telecode" placeholder="请输入车站名称，如：北京南" />
			</view>
			<button class="submit-btn" @tap="fetchGate" :loading="loading">查 询</button>
		</view>

		<!-- 结果 -->
		<view class="result-card" v-if="gateData">
			<view class="result-title">{{ trainNum }} 检票信息</view>
			<view class="gate-info">
				<view class="gate-section">
					<text class="gate-label">检票口</text>
					<view class="gate-value-list">
						<text class="gate-tag" v-for="(e, i) in gateData.entrance" :key="'e'+i">{{ e }}</text>
						<text v-if="!gateData.entrance || gateData.entrance.length === 0" class="no-data">暂无数据</text>
					</view>
				</view>
				<view class="gate-section">
					<text class="gate-label">出站口</text>
					<view class="gate-value-list">
						<text class="gate-tag exit-tag" v-for="(e, i) in gateData.exit" :key="'x'+i">{{ e }}</text>
						<text v-if="!gateData.exit || gateData.exit.length === 0" class="no-data">暂无数据</text>
					</view>
				</view>
				<view class="gate-section">
					<text class="gate-label">站台</text>
					<text class="gate-platform">{{ gateData.platform || '暂无' }}</text>
				</view>
			</view>
		</view>

		<!-- 12306官方查询 -->
		<view class="official-section">
			<view class="official-title"><i class="fas fa-clipboard-list icon-inline"></i> 12306 官方检票口</view>
			<view class="form-group">
				<text class="form-label">日期</text>
				<picker mode="date" :value="officialDate" @change="e => officialDate = e.detail.value">
					<view class="form-input date-input">{{ officialDate }}</view>
				</picker>
			</view>
			<button class="submit-btn btn-official" @tap="fetchOfficialGate" :loading="officialLoading">查询12306</button>
			<view class="official-result" v-if="officialResult !== null">
				<text class="official-result-text">结果: {{ officialResult }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { getExit, queryTicketCheck } from '@/service/api.js'
import { resolveTelecode } from '@/common/station.js'

	export default {
		data() {
			return {
				trainNum: '',
				telecode: '',
				loading: false,
				gateData: null,
				officialDate: '',
				officialLoading: false,
				officialResult: null
			}
		},
		onLoad() {
			const d = new Date()
			this.officialDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
		},
		methods: {
			async fetchGate() {
				if (!this.trainNum.trim()) {
					uni.showToast({ title: '请输入车次号', icon: 'none' })
					return
				}
				if (!this.telecode.trim()) {
					uni.showToast({ title: '请输入车站', icon: 'none' })
					return
				}
				this.loading = true
				this.gateData = null
				try {
					const { telecode } = await resolveTelecode(this.telecode)
					const res = await getExit(this.trainNum.trim(), telecode)
					if (res.success && res.data) {
						this.gateData = res.data
					} else {
						uni.showToast({ title: res.msg || '查询失败', icon: 'none' })
					}
				} catch (err) {
					uni.showToast({ title: '网络异常', icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			async fetchOfficialGate() {
				if (!this.trainNum.trim() || !this.telecode.trim()) {
					uni.showToast({ title: '请先填写车次和车站', icon: 'none' })
					return
				}
				this.officialLoading = true
				this.officialResult = null
				try {
					const { telecode } = await resolveTelecode(this.telecode)
					const res = await queryTicketCheck(this.officialDate, this.trainNum.trim(), telecode)
					if (res.status && res.data) {
						this.officialResult = res.data.trainPlatform || '暂无数据'
					} else {
						this.officialResult = '查询失败'
					}
				} catch (err) {
					this.officialResult = '网络异常'
				} finally {
					this.officialLoading = false
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

	.form-card, .official-section {
		background: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
	}

	.form-group {
		margin-bottom: 20rpx;
	}

		.official-title .icon-inline {
		.icon-inline {
			font-size: 28rpx;
			vertical-align: middle;
			margin-right: 8rpx;
		}
			margin-right: 10rpx;
		}

	.form-label {
		font-size: 26rpx;
		color: #666;
		display: block;
		margin-bottom: 8rpx;
	}

	.form-input {
		font-size: 30rpx;
		color: #333;
		padding: 16rpx 20rpx;
		background: #f5f7fa;
		border-radius: 12rpx;
	}

	.date-input {
		color: #333;
	}

	.submit-btn {
		width: 100%;
		background: #007aff;
		color: #fff;
		font-size: 28rpx;
		height: 80rpx;
		line-height: 80rpx;
		border-radius: 50rpx;
		margin-top: 10rpx;
	}

	.btn-official {
		background: #E74C3C;
	}

	.result-card {
		background: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		margin-bottom: 24rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
	}

	.result-title {
		font-size: 30rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 20rpx;
		padding-bottom: 16rpx;
		border-bottom: 2rpx solid #007aff;
	}

		.official-title .icon-inline {
		.icon-inline {
			font-size: 28rpx;
			vertical-align: middle;
			margin-right: 8rpx;
		}
			margin-right: 10rpx;
		}

	.gate-section {
		margin-bottom: 20rpx;
	}

		.official-title .icon-inline {
		.icon-inline {
			font-size: 28rpx;
			vertical-align: middle;
			margin-right: 8rpx;
		}
			margin-right: 10rpx;
		}

	.gate-label {
		font-size: 24rpx;
		color: #999;
		display: block;
		margin-bottom: 8rpx;
	}

	.gate-value-list {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
	}

	.gate-tag {
		padding: 8rpx 20rpx;
		background: #e8f0fe;
		color: #007aff;
		border-radius: 20rpx;
		font-size: 26rpx;
	}

	.gate-tag.exit-tag {
		background: #fef0e8;
		color: #e67e22;
	}

	.no-data {
		font-size: 24rpx;
		color: #ccc;
	}

	.gate-platform {
		font-size: 36rpx;
		color: #ff6b35;
		font-weight: bold;
	}

	.official-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 20rpx;
	}

		.official-title .icon-inline {
		.icon-inline {
			font-size: 28rpx;
			vertical-align: middle;
			margin-right: 8rpx;
		}
			margin-right: 10rpx;
		}

	.official-result {
		margin-top: 16rpx;
		padding: 16rpx 20rpx;
		background: #f0f8f0;
		border-radius: 12rpx;
	}

	.official-result-text {
		font-size: 28rpx;
		color: #2ECC71;
		font-weight: bold;
	}
</style>
