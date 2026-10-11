<template>
	<view class="page" :style="themeStyle">
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
				<image
					class="ticket-image"
					:src="ticketSrc"
					mode="widthFix"
					@longpress="saveTicket"
					@longtap="saveTicket"
					@tap="saveTicket"
				></image>
				<view class="save-hint" @tap="saveTicket">长按或点击保存可分享给好友</view>
				<button class="save-btn" @tap="saveTicket" :loading="saving">
					<i class="fas fa-download icon-inline"></i> 保存到相册
				</button>
			</view>
		</view>
	</view>
</template>

<script>
	import { getTicket } from '@/service/api.js'
	import { nextTicketSeq, formatTicketNo, peekTicketSeq } from '@/common/ticketNo.js'

	export default {
		data() {
			return {
				generating: false,
				saving: false,
				ticketSrc: '',
				form: {
					// 票号默认 A000001，每生成一张自动 +1，超过 A999999 回到 A000001
					ticketNo: formatTicketNo(nextTicketSeq()),
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
					// 生成成功后再把票号推进到下一张，避免失败也占用序号
					this.form.ticketNo = formatTicketNo(nextTicketSeq())
				} catch (err) {
					uni.showToast({ title: '生成失败，请重试', icon: 'none' })
				} finally {
					this.generating = false
				}
			},

			/**
			 * 保存车票到相册（长按 / 点击图片均可触发）
			 *
			 * 图片是 data:base64 URL，各端处理方式不同：
			 *  - App：写临时文件后调 uni.saveImageToPhotosAlbum
			 *  - H5 ：download 属性触发浏览器下载
			 *  - 小程序：需用户授权相册
			 */
			async saveTicket() {
				if (!this.ticketSrc || this.saving) return
				this.saving = true
				try {
					// #ifdef H5
					const a = document.createElement('a')
					a.href = this.ticketSrc
					a.download = `RailKale-Ticket-${this.form.ticketNo}.png`
					document.body.appendChild(a)
					a.click()
					document.body.removeChild(a)
					uni.showToast({ title: '已开始下载', icon: 'none' })
					// #endif

					// #ifndef H5
					const filePath = await this.writeTempFile()
					await this.saveToAlbum(filePath)
					uni.showToast({ title: '已保存到相册', icon: 'success' })
					// #endif
				} catch (err) {
					const msg = (err && (err.errMsg || err.message)) || ''
					if (msg.indexOf('auth deny') >= 0 || msg.indexOf('authorize') >= 0) {
						this.promptAuth()
					} else if (msg.indexOf('cancel') < 0) {
						uni.showToast({ title: '保存失败，请重试', icon: 'none' })
					}
				} finally {
					this.saving = false
				}
			},

			// base64 车票 → 本地临时文件路径（供 saveImageToPhotosAlbum 使用）
			// App 端用 plus.io 写入 _doc，小程序端用 FileSystemManager
			writeTempFile() {
				return new Promise((resolve, reject) => {
					const base64 = String(this.ticketSrc).split(',')[1] || ''
					if (!base64) return reject(new Error('车票数据为空'))

					// #ifdef APP-PLUS
					plus.io.resolveLocalFileSystemURL('_doc/', (root) => {
						root.getDirectory('RailKale', { create: true }, (dir) => {
							const fname = `ticket_${Date.now()}.png`
							dir.getFile(fname, { create: true }, (fileEntry) => {
								fileEntry.createWriter((writer) => {
									writer.onwrite = () => resolve(fileEntry.toLocalURL())
									writer.onerror = reject
									const binary = atob(base64)
									const buf = new ArrayBuffer(binary.length)
									const view = new Uint8Array(buf)
									for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
									writer.write(buf)
								}, reject)
							}, reject)
						}, reject)
					}, reject)
					// #endif

					// #ifdef MP
					uni.getFileSystemManager().writeFile({
						filePath: `${uni.env.USER_DATA_PATH}/ticket_${Date.now()}.png`,
						data: base64,
						encoding: 'base64',
						success: (res) => resolve(res.filePath || `${uni.env.USER_DATA_PATH}/ticket.png`),
						fail: reject
					})
					// #endif
				})
			},

			saveToAlbum(filePath) {
				return new Promise((resolve, reject) => {
					uni.saveImageToPhotosAlbum({ filePath, success: resolve, fail: reject })
				})
			},

			// 被拒绝授权时引导去设置页开启
			promptAuth() {
				uni.showModal({
					title: '需要相册权限',
					content: '保存车票需要访问相册，请在设置中开启权限',
					confirmText: '去设置',
					success: (res) => {
						if (res.confirm) uni.openSetting({})
					}
				})
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
		padding: 0 16rpx;
		background: #f5f7fa;
		border-radius: 10rpx;
		width: 100%;
		/* uni-app 的 input 需显式高度 */
		height: 80rpx;
		line-height: 80rpx;
		box-sizing: border-box;
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
	.save-btn {
		margin-top: 16rpx;
		background: var(--theme);
		color: #fff;
		font-size: 28rpx;
		font-weight: 600;
		height: 80rpx;
		line-height: 80rpx;
		border-radius: 12rpx;
		border: none;
	}
</style>
