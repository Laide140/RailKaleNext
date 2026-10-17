<template>
	<view class="ap-mask" v-if="visible" @tap="onCancel" @touchmove.stop.prevent="noop">
		<view class="ap-panel" @tap.stop="noop">
			<view class="ap-head">
				<view class="ap-head-btn" @tap="onCancel"><text :style="cancelTextStyle">{{ cancelText }}</text></view>
				<text class="ap-head-title">{{ title }}</text>
				<view class="ap-head-btn" @tap="onConfirm"><text :style="confirmTextStyle">{{ confirmText }}</text></view>
			</view>

			<!-- 年 / 月 / 日 三列滚轮 -->
			<view class="ap-body">
				<picker-view class="ap-view" :value="indexes" :indicator-style="indicatorStyle" @change="onChange">
					<picker-view-column>
						<view class="ap-cell" v-for="y in years" :key="y"><text class="ap-cell-text">{{ y }}年</text></view>
					</picker-view-column>
					<picker-view-column>
						<view class="ap-cell" v-for="m in months" :key="m"><text class="ap-cell-text">{{ m }}月</text></view>
					</picker-view-column>
					<picker-view-column>
						<view class="ap-cell" v-for="d in days" :key="d"><text class="ap-cell-text">{{ d }}日</text></view>
					</picker-view-column>
				</picker-view>
			</view>
		</view>
	</view>
</template>

<script>
	/**
	 * 自绘日期选择器，替代 <picker mode="date">
	 *   const v = await this.$refs.datePick.open({ value: '2026-08-17' })
	 * 返回 'YYYY-MM-DD'；取消返回 ''。
	 */
	function pad(n) { return String(n).padStart(2, '0') }
	function parse(str) {
		const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(str || ''))
		if (!m) return null
		return { y: +m[1], m: +m[2], d: +m[3] }
	}
	function daysInMonth(y, m) { return new Date(y, m, 0).getDate() }

	export default {
		name: 'app-date-picker',
		data() {
			return {
				visible: false,
				title: '选择日期',
				cancelText: '取消',
				confirmText: '确定',
				years: [],
				months: [],
				indexes: [0, 0, 0],
				start: null,
				end: null,
				_resolve: null
			}
		},
		computed: {
			year() { return this.years[this.indexes[0]] || new Date().getFullYear() },
			month() { return this.months[this.indexes[1]] || 1 },
			days() {
				const total = daysInMonth(this.year, this.month)
				return Array.from({ length: total }, (_, i) => i + 1)
			},
			indicatorStyle() {
				const c = this.themeColor || '#007aff'
				return `height: 44px; border-top: 1px solid ${c}; border-bottom: 1px solid ${c};`
			},
			confirmTextStyle() { return 'color:' + (this.themeColor || '#007aff') + ';font-weight:600;' },
			cancelTextStyle() { return 'color:var(--secondary, #666);' }
		},
		methods: {
			noop() {},
			open(opt) {
				const o = opt || {}
				this.title = o.title || '选择日期'
				this.cancelText = o.cancelText || '取消'
				this.confirmText = o.confirmText || '确定'
				this.start = parse(o.start)
				this.end = parse(o.end)
				const base = parse(o.value) || parse(fmtToday()) || { y: 2026, m: 1, d: 1 }

				// 可选年份范围：由 start/end 决定，未给则前后各 7 年
				const y0 = this.start ? this.start.y : base.y - 7
				const y1 = this.end ? this.end.y : base.y + 7
				const arr = []
				for (let y = y0; y <= y1; y++) arr.push(y)
				this.years = arr

				this.setIndexes(base)
				this.visible = true
				return new Promise(resolve => { this._resolve = resolve })
			},
			setIndexes(base) {
				const yi = Math.max(0, this.years.indexOf(base.y))
				const mi = Math.max(0, base.m - 1)
				const total = daysInMonth(this.years[yi] || base.y, mi + 1)
				const di = Math.min(Math.max(0, base.d - 1), total - 1)
				this.months = Array.from({ length: 12 }, (_, i) => i + 1)
				this.indexes = [yi, mi, di]
			},
			onChange(e) {
				const v = e.detail.value || []
				// 先夹住月，再算当月天数
				const yi = Math.min(Math.max(0, v[0] || 0), this.years.length - 1)
				const mi = Math.min(Math.max(0, v[1] || 0), 11)
				const total = daysInMonth(this.years[yi], mi + 1)
				const di = Math.min(Math.max(0, v[2] || 0), total - 1)
				this.indexes = [yi, mi, di]
			},
			currentValue() {
				return `${this.year}-${pad(this.month)}-${pad(this.indexes[2] + 1)}`
			},
			close(val) {
				const r = this._resolve
				this._resolve = null
				this.visible = false
				if (r) r(val || '')
			},
			// 越界时夹到边界：接口只覆盖近段时间，选到范围外没有意义
			onConfirm() {
				let v = this.currentValue()
				if (this.start && v < this.startStr()) v = this.startStr()
				if (this.end && v > this.endStr()) v = this.endStr()
				this.close(v)
			},
			onCancel() { this.close('') },
			startStr() { const s = this.start; return s ? `${s.y}-${pad(s.m)}-${pad(s.d)}` : '' },
			endStr() { const s = this.end; return s ? `${s.y}-${pad(s.m)}-${pad(s.d)}` : '' }
		}
	}

	function fmtToday() {
		const d = new Date()
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
	}
</script>

<style lang="scss">
	.ap-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		z-index: 9985;
	}
	.ap-panel {
		background: var(--card, #fff);
		border-radius: 16px 16px 0 0;
		padding-bottom: calc(8px + env(safe-area-inset-bottom));
	}
	.ap-head {
		height: 52px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 14px;
		border-bottom: 1px solid var(--separator, #f0f0f0);
	}
	.ap-head-btn {
		min-width: 52px;
		font-size: 16px;
	}
	.ap-head-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--label, #111);
	}
	.ap-body { height: 216px; padding: 0 8px; }
	.ap-view { height: 216px; }
	.ap-cell {
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ap-cell-text {
		font-size: 16px;
		color: var(--label, #111);
		font-variant-numeric: tabular-nums;
	}
</style>
