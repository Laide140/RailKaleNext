<template>
	<view class="page">
		<view class="form-card">
			<view class="form-row">
				<view class="form-group half">
					<text class="form-label">车次号</text>
					<input class="form-input" v-model="form.trainNo" placeholder="如：G1" />
				</view>
				<view class="form-group half">
					<text class="form-label">日期</text>
					<picker mode="date" :value="form.date" @change="e => form.date = e.detail.value">
						<view class="form-input">{{ form.date }}</view>
					</picker>
				</view>
			</view>
			<view class="form-row">
				<view class="form-group half">
					<text class="form-label">始发站</text>
					<input class="form-input" v-model="form.startStation" placeholder="如：北京南" />
				</view>
				<view class="form-group half">
					<text class="form-label">终点站</text>
					<input class="form-input" v-model="form.endStation" placeholder="如：上海虹桥" />
				</view>
			</view>
			<view class="form-row">
				<view class="form-group half">
					<text class="form-label">发车时间</text>
					<input class="form-input" v-model="form.time" placeholder="如：06:30" />
				</view>
				<view class="form-group half">
					<text class="form-label">票价</text>
					<input class="form-input" v-model="form.price" placeholder="如：553.00" />
				</view>
			</view>
			<view class="form-row">
				<view class="form-group half">
					<text class="form-label">车厢号</text>
					<input class="form-input" v-model="form.carriageNo" placeholder="如：05" />
				</view>
				<view class="form-group half">
					<text class="form-label">座位号</text>
					<input class="form-input" v-model="form.seatNo" placeholder="如：12A" />
				</view>
			</view>
			<view class="form-row">
				<view class="form-group half">
					<text class="form-label">座位等级</text>
					<input class="form-input" v-model="form.seatClass" placeholder="如：二等座" />
				</view>
				<view class="form-group half">
					<text class="form-label">检票口</text>
					<input class="form-input" v-model="form.checkinRoom" placeholder="如：10A" />
				</view>
			</view>
			<view class="form-group">
				<text class="form-label">乘客姓名</text>
				<input class="form-input" v-model="form.name" placeholder="请输入姓名" />
			</view>
			<view class="form-group">
				<text class="form-label">身份证号</text>
				<input class="form-input" v-model="form.identity" placeholder="请输入身份证号" />
			</view>
			<view class="form-group">
				<text class="form-label">票号</text>
				<input class="form-input" v-model="form.ticketNo" placeholder="如：TICKET-A1B2C3" />
			</view>

			<button class="generate-btn" @tap="generateTicket" :loading="generating"><i class="fas fa-ticket-alt icon-inline"></i> 生成纪念车票</button>

			<!-- 车票预览 -->
			<view class="ticket-preview" v-if="ticketSrc">
				<view class="preview-title">纪念车票</view>
				<image class="ticket-image" :src="ticketSrc" mode="widthFix"></image>
				<view class="save-hint">长按或点击保存可分享给好友</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { getTicket } from '@/service/api.js'

	export default {
		data() {
			return {
				generating: false,
				ticketSrc: '',
				form: {
					ticketNo: 'TICKET' + Date.now().toString(36).toUpperCase(),
					startStation: '',
					endStation: '',
					trainNo: '',
					date: '',
					time: '',
					carriageNo: '',
					seatNo: '',
					seatClass: '',
					price: '',
					identity: '',
					name: '',
					ticketMachineId: 'RAIL-001',
					qrcodeString: '',
					checkinRoom: '',
					startStationPY: '',
					endStationPY: ''
				}
			}
		},
		onLoad() {
			const d = new Date()
			this.form.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
			this.form.qrcodeString = 'https://next.laide.net.cn/'
		},
		methods: {
			async generateTicket() {
				const f = this.form
				if (!f.startStation || !f.endStation || !f.trainNo || !f.name) {
					uni.showToast({ title: '请填写必要信息（*标注项）', icon: 'none' })
					return
				}
				this.generating = true
				try {
					const result = await getTicket({
						ticketNo: f.ticketNo,
						startStation: f.startStation,
						endStation: f.endStation,
						trainNo: f.trainNo,
						date: f.date,
						time: f.time || '00:00',
						carriageNo: Number(f.carriageNo) || 1,
						seatNo: f.seatNo || '1',
						seatClass: f.seatClass || '二等座',
						price: f.price || '0.00',
						identity: f.identity || '000000000000000000',
						name: f.name,
						ticketMachineId: f.ticketMachineId,
						qrcodeString: f.qrcodeString,
						checkinRoom: f.checkinRoom ? `检票口：${f.checkinRoom}` : '',
						startStationPY: f.startStationPY || '',
						endStationPY: f.endStationPY || ''
					})
					// Convert ArrayBuffer to base64
					const base64 = uni.arrayBufferToBase64(result)
					this.ticketSrc = 'data:image/png;base64,' + base64
				} catch (err) {
					uni.showToast({ title: '生成失败，请重试', icon: 'none' })
				} finally {
					this.generating = false
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

	.form-card {
		background: #fff;
		border-radius: 20rpx;
		padding: 30rpx;
		box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
	}

	.form-row {
		display: flex;
		gap: 20rpx;
	}

	.form-group {
		margin-bottom: 24rpx;
	}

	.form-group.half {
		width: 50%;
	}

	.form-label {
		font-size: 24rpx;
		color: #999;
		display: block;
		margin-bottom: 8rpx;
	}

	.form-input {
		font-size: 28rpx;
		color: #333;
		padding: 14rpx 16rpx;
		background: #f5f7fa;
		border-radius: 10rpx;
		width: 100%;
	}

	.generate-btn {
		width: 100%;
		background: linear-gradient(135deg, #FF6B35, #E74C3C);
		color: #fff;
		font-size: 30rpx;
		height: 88rpx;
		line-height: 88rpx;
		border-radius: 50rpx;
		margin: 20rpx 0;
		font-weight: bold;
	}

		.generate-btn .icon-inline {
		.icon-inline {
			font-size: 28rpx;
			vertical-align: middle;
			margin-right: 8rpx;
		}
			margin-right: 10rpx;
		}

	.ticket-preview {
		margin-top: 30rpx;
		padding: 20rpx;
		background: #fafafa;
		border-radius: 16rpx;
		border: 2rpx dashed #ddd;
	}

	.preview-title {
		text-align: center;
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		margin-bottom: 16rpx;
	}

		.generate-btn .icon-inline {
		.icon-inline {
			font-size: 28rpx;
			vertical-align: middle;
			margin-right: 8rpx;
		}
			margin-right: 10rpx;
		}

	.ticket-image {
		width: 100%;
		border-radius: 12rpx;
	}

	.save-hint {
		text-align: center;
		font-size: 22rpx;
		color: #bbb;
		margin-top: 12rpx;
	}
</style>
