<template>
	<view class="page" :style="themeStyle">
		<!-- 行程信息（只读） -->
		<view class="trip-card" v-if="item">
			<view class="trip-head">
				<text class="trip-train">{{ item.train }}</text>
				<text class="trip-date">{{ dateText }}</text>
			</view>
			<view class="trip-route">
				<text class="trip-station">{{ item.start }}</text>
				<text class="trip-arrow">→</text>
				<text class="trip-station">{{ item.end }}</text>
			</view>
			<view class="trip-meta">
				<text class="trip-meta-item" v-if="item.departTime">{{ item.departTime }} 开</text>
				<text class="trip-meta-item" v-if="seatText">{{ seatText }}</text>
				<text class="trip-meta-item" v-if="item.name">{{ item.name }}</text>
			</view>
		</view>

		<view class="empty" v-if="!item">
			<text>未找到该行程</text>
		</view>

		<!-- 打印舞台：出票机吐票动画 -->
		<view class="print-stage" v-if="printing">
			<view class="printer">
				<view class="printer-slot"></view>
				<view class="printer-paper ejecting"></view>
			</view>
			<text class="print-text">正在出票…</text>
		</view>

		<!-- 车票结果 -->
		<view class="ticket-wrap" v-if="ticketSrc && !printing">
			<image
				class="ticket-image"
				:src="ticketSrc"
				mode="widthFix"
				@longpress="saveTicket"
				@longtap="saveTicket"
			></image>
			<view class="ticket-hint">长按图片保存车票</view>
		</view>

		<!-- 底部按钮 -->
		<view class="footer" v-if="item && !printing">
			<button class="main-btn" v-if="!ticketSrc" @tap="printTicket" :loading="loading">
				<i class="fas fa-print icon-inline"></i> 打印车票
			</button>
			<button class="main-btn" v-else @tap="saveTicket" :loading="saving">
				<i class="fas fa-download icon-inline"></i> 保存车票
			</button>
		</view>

		<app-toast ref="toast" />
		<app-modal ref="modal" />
	</view>
</template>

<script>
	import { getTravel } from '@/common/travel.js'
	import { getTicket } from '@/service/api.js'
	import { nextTicketSeq, formatTicketNo, parseTicketNo } from '@/common/ticketNo.js'

	// 身份证掩码：前 10 位原样，中间 4 位打星，末 4 位原样
	function maskIdentity(id) {
		const s = String(id || '').trim()
		if (s.length < 8) return s
		return s.slice(0, 10) + '****' + s.slice(-4)
	}

	export default {
		data() {
			return {
				travelId: '',
				item: null,
				loading: false,
				saving: false,
				printing: false,
				ticketSrc: ''
			}
		},
		computed: {
			dateText() {
				if (!this.item) return ''
				return this.item.date || ''
			},
			// 座席 + 车厢号 + 座位号
			seatText() {
				const it = this.item
				if (!it) return ''
				const seat = it.seatType || ''
				const place = (it.carNum ? `${it.carNum}车` : '') + (it.seatNum || '')
				if (seat && place) return `${seat} ${place}`
				return seat || place
			}
		},
		onLoad(options) {
			const id = options && options.travelId ? decodeURIComponent(options.travelId) : ''
			if (!id) return
			this.travelId = id
			this.item = getTravel(id)
		},
		methods: {
			/** 补齐票面必填信息：上票号 / 下票号 / 身份证 */
			async askTicketInfo() {
				const seq = nextTicketSeq()
				const upperNo = formatTicketNo(seq)
				const lowerNo = formatTicketNo(seq + 1)

				// 1) 上票号（下票号自动为其 +1）
				const r1 = await this.dialog({
					title: '填写票号',
					content: `下票号默认 ${lowerNo}`,
					editable: true,
					placeholderText: upperNo,
					content: upperNo
				})
				if (!r1.confirm) return null
				const up = String(r1.content || '').trim() || upperNo
				const upper = parseTicketNo(up) || seq

				// 2) 身份证
				const r2 = await this.dialog({
					title: '填写身份证号',
					content: '将自动掩码为 0000000000****0000',
					hint: '我们不会收集您的身份信息，此数据仅在本地存储，不会上报云端。',
					editable: true,
					placeholderText: '身份证号（可留空）',
					content: ''
				})
				if (!r2.confirm) return null
				const raw = String(r2.content || '').trim()

				return {
					upperNo: formatTicketNo(upper),
					lowerNo: formatTicketNo(upper + 1),
					identity: raw ? maskIdentity(raw) : ''
				}
			},

			/** 打印车票：调接口出图，成功后播放吐票动画 */
			async printTicket() {
				if (!this.item || this.loading) return
				const info = await this.askTicketInfo()
				if (!info) return

				this.loading = true
				try {
					const it = this.item
					const buf = await getTicket({
						ticketNo: info.upperNo,
						startStation: it.start || '',
						endStation: it.end || '',
						trainNo: it.train || '',
						date: it.date || '',
						time: it.departTime || '00:00',
						carriageNo: Number(it.carNum) || 1,
						seatNo: it.seatNum || '1',
						seatClass: it.seatType || '二等座',
						price: it.price || '0.00',
						identity: info.identity || '000000000000000000',
						name: it.name || '',
						ticketMachineId: 'RAIL-001',
						qrcodeString: 'https://next.laide.net.cn/',
						checkinRoom: '',
						startStationPY: '',
						endStationPY: ''
					})
					const base64 = uni.arrayBufferToBase64(buf)
					this.ticketSrc = 'data:image/png;base64,' + base64
					// 出票动画：先把车票盖住，动画结束再展示
					this.printing = true
					setTimeout(() => { this.printing = false }, 1600)
				} catch (e) {
					this.toast('出票失败，请重试')
				} finally {
					this.loading = false
				}
			},

			/** 保存车票：长按或点按钮 */
			async saveTicket() {
				if (!this.ticketSrc || this.saving) return
				this.saving = true
				try {
					// #ifdef H5
					const a = document.createElement('a')
					a.href = this.ticketSrc
					a.download = `RailKale-${this.item.train || 'travel'}.png`
					document.body.appendChild(a)
					a.click()
					document.body.removeChild(a)
					this.toast('已开始下载')
					// #endif

					// #ifndef H5
					const filePath = await this.writeTempFile()
					await this.saveToAlbum(filePath)
					this.toast('已保存到相册', 'success')
					// #endif
				} catch (e) {
					this.toast('保存失败')
				} finally {
					this.saving = false
				}
			},
			// App / 小程序：先写临时文件，再存相册
			writeTempFile() {
				return new Promise((resolve, reject) => {
					const base64 = String(this.ticketSrc).split(',')[1] || ''
					const fs = uni.getFileSystemManager ? uni.getFileSystemManager() : null
					if (fs && fs.writeFile) {
						const path = `${uni.env.USER_DATA_PATH}/rail-ticket.png`
						fs.writeFile({
							filePath: path,
							data: base64,
							encoding: 'base64',
							success: () => resolve(path),
							fail: reject
						})
						return
					}
					// App 端走 plus.io
					try {
						const bitmap = new plus.nativeObj.Bitmap('ticket')
						bitmap.loadBase64Data(this.ticketSrc, () => {
							const path = '_doc/rail-ticket.png'
							bitmap.save(path, { overwrite: true }, () => {
								bitmap.clear()
								resolve(path)
							}, reject)
						}, reject)
					} catch (e) {
						reject(e)
					}
				})
			},
			saveToAlbum(filePath) {
				return new Promise((resolve, reject) => {
					uni.saveImageToPhotosAlbum({ filePath, success: resolve, fail: reject })
				})
			}
		}
	}
</script>

<style lang="scss">
	.page {
		min-height: 100vh;
		background: var(--bg);
		padding: 20px 16px 40px;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
	}

	/* 行程信息卡 */
	.trip-card {
		background: var(--card);
		border-radius: 16px;
		border: 1px solid var(--theme-border);
		padding: 16px;
		margin-bottom: 18px;
	}
	.trip-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 10px;
	}
	.trip-train { font-size: 20px; font-weight: 800; color: var(--theme-text); }
	.trip-date { font-size: 13px; color: var(--secondary); font-variant-numeric: tabular-nums; }
	.trip-route {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	.trip-station { font-size: 17px; font-weight: 700; color: var(--label); }
	.trip-arrow { font-size: 15px; color: var(--secondary); }
	.trip-meta { display: flex; flex-wrap: wrap; gap: 10px; }
	.trip-meta-item { font-size: 13px; color: var(--secondary); }

	.empty { padding: 60px 0; text-align: center; font-size: 14px; color: var(--secondary); }

	/* 打印舞台：出票机吐票 */
	.print-stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 40px 0;
	}
	.printer {
		position: relative;
		width: 220px;
		height: 110px;
		overflow: hidden;
	}
	.printer-slot {
		position: absolute;
		left: 0; right: 0; top: 0;
		height: 12px;
		border-radius: 6px;
		background: var(--theme);
		z-index: 2;
	}
	.printer-paper {
		position: absolute;
		left: 12px; right: 12px; top: 10px;
		height: 0;
		border-radius: 0 0 6px 6px;
		background: repeating-linear-gradient(
			to bottom,
			var(--card) 0px,
			var(--card) 8px,
			var(--fill) 8px,
			var(--fill) 9px
		);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
	}
	.printer-paper.ejecting {
		animation: eject 1.5s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
	}
	@keyframes eject {
		0%   { height: 0; }
		70%  { height: 92px; }
		100% { height: 96px; }
	}
	.print-text { font-size: 13px; color: var(--secondary); }

	/* 车票结果 */
	.ticket-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}
	.ticket-image {
		width: 100%;
		border-radius: 12px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
	}
	.ticket-hint { font-size: 12px; color: var(--secondary); }

	/* 底部按钮 */
	.footer { margin-top: auto; padding-top: 20px; }
	.main-btn {
		width: 100%;
		height: 48px;
		border-radius: 12px;
		background: var(--theme);
		color: #fff;
		font-size: 16px;
		font-weight: 600;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.main-btn .icon-inline { margin-right: 6px; }
</style>
