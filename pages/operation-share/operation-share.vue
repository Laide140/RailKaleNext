<template>
	<view class="page" :style="themeStyle">
		<view class="head">
			<text class="head-title">运转分享</text>
			<text class="head-sub">记录你的每一段旅程</text>
		</view>

		<!-- 行程列表 -->
		<view class="list" v-if="travels.length">
			<travel-card
				v-for="t in travels"
				:key="t.id"
				:item="t"
				@open="openTravel"
				@speed="startSpeed"
				@ticket="makeTicket"
				@share="shareTravel"
				@askRemove="askRemoveTravel"
			/>
		</view>
		<view class="empty" v-else>
			<i class="fas fa-suitcase-rolling empty-icon"></i>
			<text class="empty-text">还没有行程，点击右下角添加</text>
		</view>

		<!-- 添加按钮 -->
		<view class="fab" @tap="openAdd">
			<i class="fas fa-plus"></i>
		</view>

		<!-- ===== 添加行程浮层 ===== -->
		<view class="sheet-mask" v-if="adding" @tap="closeAdd" @touchmove.stop.prevent="noop">
			<view class="sheet" @tap.stop="noop">
				<view class="sheet-head">
					<text class="sheet-cancel" @tap="closeAdd">取消</text>
					<text class="sheet-title">添加行程</text>
					<text class="sheet-done" :class="{ disabled: !canSubmit }" @tap="submit">保存</text>
				</view>

				<scroll-view class="sheet-body" scroll-y>
					<!-- 日期 -->
					<view class="field">
						<text class="field-label">日期</text>
						<view class="field-value" @tap="pickDate">{{ form.date }}</view>
					</view>

					<!-- 始发站 -->
					<view class="field">
						<text class="field-label">始发站</text>
						<input
							class="field-input"
							v-model="form.start"
							placeholder="如：北京南"
							placeholder-class="ph"
						/>
					</view>

					<!-- 到达站 -->
					<view class="field">
						<text class="field-label">到达站</text>
						<input
							class="field-input"
							v-model="form.end"
							placeholder="如：上海虹桥"
							placeholder-class="ph"
						/>
					</view>

					<!-- 车次：调接口给候选，也可自行输入 -->
					<view class="field">
						<text class="field-label">车次</text>
						<input
							class="field-input"
							v-model="form.train"
							placeholder="输入或从候选选择"
							placeholder-class="ph"
							@focus="openSuggest"
							@blur="delayCloseSuggest"
						/>
					</view>

					<!-- 车次候选列表 -->
					<view class="suggest" v-if="suggest && trainList.length">
						<scroll-view class="suggest-scroll" scroll-y>
							<view
								class="suggest-item"
								v-for="tr in trainList"
								:key="tr.trainNo"
								hover-class="suggest-hover"
								@tap="pickTrain(tr)"
							>
								<text class="suggest-train">{{ tr.trainNo }}</text>
								<text class="suggest-time">{{ tr.fromTime }} - {{ tr.toTime }}</text>
							</view>
						</scroll-view>
					</view>
					<view class="suggest-hint" v-if="suggest && loadingTrains">
						<text>正在查询车次…</text>
					</view>
					<view class="suggest-hint" v-if="suggest && !loadingTrains && !trainList.length && cargoError">
						<text>{{ cargoError }}</text>
					</view>

					<!-- 座席 -->
					<view class="field">
						<text class="field-label">座席</text>
						<view class="field-value" @tap="pickSeat">{{ form.seatType || '请选择' }}</view>
					</view>
					<view class="field" v-if="form.seatType === '其他'">
						<text class="field-label">座席名称</text>
						<input class="field-input" v-model="form.seatTypeCustom" placeholder="自行填写" placeholder-class="ph" />
					</view>

					<!-- 车厢号 / 座位号 -->
					<view class="field-row">
						<view class="field half">
							<text class="field-label">车厢号</text>
							<input class="field-input" v-model="form.carNum" placeholder="如：1" placeholder-class="ph" />
						</view>
						<view class="field half">
							<text class="field-label">座位号</text>
							<input class="field-input" v-model="form.seatNum" placeholder="如：1A" placeholder-class="ph" />
						</view>
					</view>

					<!-- 乘车人 -->
					<view class="field">
						<text class="field-label">乘车人</text>
						<input class="field-input" v-model="form.name" placeholder="姓名" placeholder-class="ph" />
					</view>

					<view class="sheet-pad"></view>
				</scroll-view>
			</view>
		</view>

		<app-toast ref="toast" />
		<app-modal ref="modal" />
		<app-action-sheet ref="sheet" />
		<app-date-picker ref="datePick" />
	</view>
</template>

<script>
	import TravelCard from '@/components/travel-card/travel-card.vue'
	import { SEAT_TYPES, loadTravels, addTravel, removeTravel, travelFileContent, shortDate } from '@/common/travel.js'
	import { getTrains, getTrainInfoByDate, carModelOf, todayStr } from '@/service/api.js'

	export default {
		components: { TravelCard },
		data() {
			return {
				travels: [],
				adding: false,
				loadingTrains: false,
				cargoError: '',
				trainList: [],
				suggest: false,
				form: this.blankForm()
			}
		},
		computed: {
			canSubmit() {
				const f = this.form
				return !!(f.train && f.start && f.end && f.seatType && f.name)
			}
		},
		onShow() { this.travels = loadTravels() },
		methods: {
			noop() {},
			blankForm() {
				return {
					date: todayStr(),
					start: '',
					end: '',
					train: '',
					seatType: '',
					seatTypeCustom: '',
					carNum: '',
					seatNum: '',
					name: '',
					departTime: ''
				}
			},
			openAdd() {
				this.form = this.blankForm()
				this.trainList = []
				this.cargoError = ''
				this.suggest = false
				this.adding = true
			},
			closeAdd() {
				this.adding = false
				this.suggest = false
			},
			async pickDate() {
				const v = await this.datePick({ value: this.form.date, title: '乘车日期' })
				if (v) {
					this.form.date = v
					// 日期变了，之前的候选车次作废
					this.trainList = []
				}
			},
			openSuggest() {
				this.suggest = true
				this.loadTrains()
			},
			// 失焦时留出点击时间；点列表外空白也会关闭
			delayCloseSuggest() {
				setTimeout(() => { this.suggest = false }, 180)
			},
			/** 拉当天两站之间的车次，按车次号去重 */
			async loadTrains() {
				const { start, end, date } = this.form
				if (!start || !end) {
					this.cargoError = '先填写始发站和到达站'
					this.trainList = []
					return
				}
				this.loadingTrains = true
				this.cargoError = ''
				try {
					const res = await getTrains(start, end, date)
					const list = (res && res.trains) || []
					const seen = {}
					const out = []
					for (const t of list) {
						const no = t && t.trainNo
						if (!no || seen[no]) continue
						seen[no] = true
						out.push(t)
					}
					this.trainList = out
					if (!out.length) this.cargoError = '当天两站间未查询到车次，可直接手填'
				} catch (e) {
					this.trainList = []
					this.cargoError = '车次查询失败，可直接手填'
				} finally {
					this.loadingTrains = false
				}
			},
			pickTrain(tr) {
				this.form.train = tr.trainNo
				this.form.departTime = tr.fromTime || ''
				this.suggest = false
			},
			async pickSeat() {
				const idx = await this.sheet({ title: '选择座席', itemList: SEAT_TYPES })
				if (idx < 0) return
				this.form.seatType = SEAT_TYPES[idx]
			},
			async submit() {
				if (!this.canSubmit) {
					this.toast('请填写车次、始发到达、座席和乘车人')
					return
				}
				// 车型取该车次当天的担当车组（用于卡片右下角）
				let model = ''
				try {
					const info = await getTrainInfoByDate(this.form.train, this.form.date)
					if (info && info.trainSet) model = carModelOf(info.trainSet)
				} catch (e) {}

				const seatType = this.form.seatType === '其他'
					? (this.form.seatTypeCustom || '其他')
					: this.form.seatType

				addTravel({
					train: String(this.form.train).trim().toUpperCase(),
					start: this.form.start.trim(),
					end: this.form.end.trim(),
					model,
					seatType,
					carNum: String(this.form.carNum || '').trim(),
					seatNum: String(this.form.seatNum || '').trim(),
					name: this.form.name.trim(),
					date: this.form.date,
					departTime: this.form.departTime || '',
					gps: {}
				})
				this.travels = loadTravels()
				this.adding = false
				this.toast('行程已添加', 'success')
			},

			/** 左滑后点删除：在页面里弹确认框（页面才有 app-modal 挂载点） */
			async askRemoveTravel(item) {
				if (!item) return
				const ok = await this.dialog({
					title: '删除行程',
					content: `确定删除 ${item.start} → ${item.end}（${item.train}）吗？`
				})
				if (!ok.confirm) return
				removeTravel(item.id)
				this.travels = loadTravels()
				this.toast('行程已删除')
			},

			/** 点击卡片：进入车次详情（跨天车会自动弹发车日选择） */
			openTravel(item) {
				if (!item || !item.train) return
				uni.navigateTo({
					url: `/pages/train-detail/train-detail?train=${encodeURIComponent(item.train)}&date=${item.date || todayStr()}`
				})
			},
			/** 测速：带上行程 id 进入测速页 */
			startSpeed(item) {
				if (!item) return
				uni.navigateTo({
					url: `/pages/speed-test/speed-test?travelId=${encodeURIComponent(item.id)}&train=${encodeURIComponent(item.train || '')}`
				})
			},
			/** 行程车票：独立页面，只带行程 id */
			makeTicket(item) {
				if (!item) return
				uni.navigateTo({
					url: `/pages/travel-ticket/travel-ticket?travelId=${encodeURIComponent(item.id)}`
				})
			},
			/** 分享：把 .travel 内容存到本机 */
			async shareTravel(item) {
				if (!item) return
				const content = travelFileContent(item)
				const name = `${item.train || 'travel'}_${shortDate(item.date).replace('.', '')}.travel`

				// #ifdef APP-PLUS
				const ok = await this.saveFileApp(name, content)
				if (!ok) this.toast('保存失败')
				return
				// #endif

				// #ifdef H5
				this.downloadH5(name, content)
				return
				// #endif

				uni.setClipboardData({
					data: content,
					success: () => this.toast('行程内容已复制')
				})
			},
			// App 端写文件后用系统对话框选择保存位置
			async saveFileApp(name, content) {
				return new Promise((resolve) => {
					try {
						plus.io.resolveLocalFileSystemURL('_doc/travel/', (entry) => {
							entry.getFile(name, { create: true }, (fileEntry) => {
								fileEntry.createWriter((writer) => {
									writer.onwrite = () => {
										// 交给系统保存面板，让用户选存储位置
										uni.showModal({
											title: '导出完成',
											content: `文件已生成：${fileEntry.fullPath}`,
											showCancel: false
										})
										resolve(true)
									}
									writer.onerror = () => resolve(false)
									writer.write(content)
								}, () => resolve(false))
							}, () => resolve(false))
						}, () => resolve(false))
					} catch (e) {
						resolve(false)
					}
				})
			},
			// H5 端用 Blob 触发下载
			downloadH5(name, content) {
				try {
					const blob = new Blob([content], { type: 'application/json' })
					const url = URL.createObjectURL(blob)
					const a = document.createElement('a')
					a.href = url
					a.download = name
					document.body.appendChild(a)
					a.click()
					document.body.removeChild(a)
					setTimeout(() => URL.revokeObjectURL(url), 2000)
					this.toast('已开始下载')
				} catch (e) {
					this.toast('保存失败')
				}
			}
		}
	}
</script>

<style lang="scss">
	.page {
		min-height: 100vh;
		background: var(--bg);
		padding: 20px 16px 96px;
		box-sizing: border-box;
	}
	.head { margin-bottom: 16px; }
	.head-title { font-size: 22px; font-weight: 700; color: var(--label); }
	.head-sub { display: block; margin-top: 4px; font-size: 13px; color: var(--secondary); }

	.list { display: flex; flex-direction: column; gap: 12px; }

	.empty {
		display: flex; flex-direction: column; align-items: center; gap: 10px;
		padding: 80px 0;
	}
	.empty-icon { font-size: 34px; color: var(--secondary); }
	.empty-text { font-size: 14px; color: var(--secondary); }

	/* 悬浮添加按钮 */
	.fab {
		position: fixed; right: 20px; bottom: 28px;
		width: 54px; height: 54px; border-radius: 50%;
		background: var(--theme);
		display: flex; align-items: center; justify-content: center;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
		z-index: 900;
		i { font-size: 22px; color: #fff; }
	}

	/* ===== 添加行程浮层 ===== */
	.sheet-mask {
		position: fixed; left: 0; top: 0; right: 0; bottom: 0;
		background: rgba(0, 0, 0, 0.35);
		display: flex; flex-direction: column; justify-content: flex-end;
		z-index: 990;
	}
	.sheet {
		background: var(--card);
		border-radius: 18px 18px 0 0;
		max-height: 88vh;
		display: flex;
		flex-direction: column;
	}
	.sheet-head {
		display: flex; align-items: center; justify-content: space-between;
		padding: 14px 16px;
		border-bottom: 1px solid var(--separator);
	}
	.sheet-cancel { font-size: 15px; color: var(--secondary); }
	.sheet-title { font-size: 16px; font-weight: 600; color: var(--label); }
	.sheet-done { font-size: 15px; font-weight: 600; color: var(--theme-text); }
	.sheet-done.disabled { color: var(--secondary); }
	.sheet-body { padding: 6px 16px 0; }
	.sheet-pad { height: 24px; }

	.field {
		padding: 12px 0;
		border-bottom: 1px solid var(--separator);
	}
	.field-row { display: flex; gap: 14px; }
	.field.half { flex: 1; }
	.field-label {
		display: block;
		font-size: 12px;
		color: var(--secondary);
		margin-bottom: 6px;
	}
	.field-input {
		width: 100%;
		height: 26px;
		font-size: 16px;
		color: var(--label);
		box-sizing: border-box;
	}
	.field-value {
		font-size: 16px;
		color: var(--label);
		height: 26px;
		line-height: 26px;
	}
	.ph { color: var(--secondary); }

	/* 车次候选 */
	.suggest {
		border: 1px solid var(--theme-border);
		border-radius: 12px;
		margin-top: 8px;
		overflow: hidden;
	}
	.suggest-scroll { max-height: 190px; }
	.suggest-item {
		display: flex; align-items: center; justify-content: space-between;
		padding: 11px 14px;
		border-bottom: 1px solid var(--separator);
	}
	.suggest-item:last-child { border-bottom: none; }
	.suggest-hover { background: var(--fill); }
	.suggest-train { font-size: 15px; font-weight: 600; color: var(--theme-text); }
	.suggest-time { font-size: 12px; color: var(--secondary); font-variant-numeric: tabular-nums; }
	.suggest-hint {
		margin-top: 8px;
		font-size: 12px;
		color: var(--secondary);
		text-align: center;
	}
</style>
