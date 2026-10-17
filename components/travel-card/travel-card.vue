<template>
	<view class="card-swipe">
		<!-- 左滑露出的删除按钮 -->
		<view class="swipe-delete" @tap.stop="confirmDelete">
			<i class="fas fa-trash-can"></i>
			<text class="del-text">删除</text>
		</view>

		<!-- 卡片本体：左滑时整体左移 -->
		<view
			class="travel-card"
			:style="cardStyle + swipeStyle"
			@tap="onCardTap"
			@touchstart="onTouchStart"
			@touchmove="onTouchMove"
			@touchend="onTouchEnd"
			@touchcancel="onTouchEnd"
			@mousedown="onMouseDown"
		>
		<!-- 背景粗体车次：浅色绘制，作为水印 -->
		<text class="card-watermark" :style="{ color: pal.border }">{{ item.train }}</text>

		<view class="card-body">
			<view class="card-route">
				<text class="route-station">{{ item.start }}</text>
				<text class="route-arrow">→</text>
				<text class="route-station">{{ item.end }}</text>
				<!-- 座席 / 座位号：与始发终到同一行，靠右 -->
				<text class="seat-text" v-if="seatText">{{ seatText }}</text>
			</view>
			<view class="card-meta">
				<text class="meta-date">{{ dateText }}</text>
				<text class="meta-time" v-if="item.departTime">{{ item.departTime }}开</text>
			</view>
		</view>

		<!-- 右下角车型 -->
		<text class="card-model" v-if="item.model">{{ item.model }}</text>

		<!-- 右侧三个操作按钮：测速 / 车票 / 分享 -->
		<view class="card-actions">
			<view class="act-btn" hover-class="act-hover" @tap.stop="$emit('speed', item)">
				<i class="fas fa-gauge-high"></i>
			</view>
			<view class="act-btn" hover-class="act-hover" @tap.stop="$emit('ticket', item)">
				<i class="fas fa-ticket"></i>
			</view>
			<view class="act-btn" hover-class="act-hover" @tap.stop="$emit('share', item)">
				<i class="fas fa-share-nodes"></i>
			</view>
		</view>
		</view>
	</view>
</template>

<script>
	import { macaronOf, shortDate } from '@/common/travel.js'

	// 左滑露出的删除按钮宽度
	const DEL_W = 76

	export default {
		name: 'travel-card',
		props: {
			item: { type: Object, required: true }
		},
		data() {
			return {
				offset: 0,        // 左滑距离（负值），收起为 0
				_startX: 0,
				_startY: 0,
				_startOffset: 0,
				_dragging: false,
				_moved: false     // 本次触摸是否发生过滑动，滑动后不触发点击
			}
		},
		beforeDestroy() { this.stopMouseDrag() },
		computed: {
			swipeStyle() {
				const t = this._dragging ? 'none' : 'transform .22s ease'
				return `transform:translateX(${this.offset}px);transition:${t};`
			},
			// 颜色按行程 id 固定，不会每次渲染变一次
			pal() { return macaronOf(this.item.id || this.item.train) },
			cardStyle() {
				return `background:${this.pal.bg};border-color:${this.pal.border};`
			},
			dateText() { return shortDate(this.item.date) },
			// 座席与座位号拼成一行：商务座 1车1A
			seatText() {
				const it = this.item
				const seat = it.seatType || ''
				const car = it.carNum ? `${it.carNum}车` : ''
				const no = it.seatNum || ''
				const place = car + no
				if (seat && place) return `${seat} ${place}`
				return seat || place
			}
		},
		methods: {
			// ===== 左滑手势 =====
			beginDrag(x, y) {
				this._startX = x
				this._startY = y
				this._startOffset = this.offset
				this._dragging = true
				this._moved = false
			},
			moveDrag(x, y) {
				if (!this._dragging) return
				const dx = x - this._startX
				const dy = y - this._startY
				// 纵向意图更强时不接管，避免影响页面滚动
				if (Math.abs(dy) > Math.abs(dx) && Math.abs(this.offset) < 4) return
				if (Math.abs(dx) > 6) this._moved = true
				const next = this._startOffset + dx
				// 只能左滑，最多露出删除按钮宽度
				this.offset = Math.min(0, Math.max(-DEL_W, next))
			},
			endDrag() {
				if (!this._dragging) return
				this._dragging = false
				// 超过一半就吸附打开，否则回弹
				this.offset = this.offset < -DEL_W / 2 ? -DEL_W : 0
				// 滑开过就抑制紧随其后的点击，避免误进详情页
				if (this._moved) {
					setTimeout(() => { this._moved = false }, 50)
				}
			},

			onTouchStart(e) {
				const t = e.touches && e.touches[0]
				if (!t) return
				this.beginDrag(t.clientX, t.clientY)
			},
			onTouchMove(e) {
				const t = e.touches && e.touches[0]
				if (!t) return
				this.moveDrag(t.clientX, t.clientY)
			},
			onTouchEnd() { this.endDrag() },

			// ===== 桌面端鼠标拖拽 =====
			onMouseDown(e) {
				if (e.button !== undefined && e.button !== 0) return
				this.beginDrag(e.clientX, e.clientY)
				// 监听到 document，拖动时指针移出卡片也不会丢
				this._mouseMove = (ev) => this.moveDrag(ev.clientX, ev.clientY)
				this._mouseUp = () => this.stopMouseDrag()
				document.addEventListener('mousemove', this._mouseMove)
				document.addEventListener('mouseup', this._mouseUp)
			},
			stopMouseDrag() {
				if (this._mouseMove) document.removeEventListener('mousemove', this._mouseMove)
				if (this._mouseUp) document.removeEventListener('mouseup', this._mouseUp)
				this._mouseMove = null
				this._mouseUp = null
				this.endDrag()
			},
			onCardTap() {
				// 滑动过就不算点击
				if (this._moved) { this._moved = false; return }
				// 已滑开时点击先收起
				if (this.offset !== 0) { this.offset = 0; return }
				this.$emit('open', this.item)
			},
			/**
			 * 删除前确认：交给父页面弹框。
			 * 子组件自身的 $refs 里没有 app-modal（弹框挂载在页面根节点），
			 * 直接调 this.dialog() 会退回原生 uni.showModal，样式与主题不一致。
			 */
			confirmDelete() {
				this.$emit('askRemove', this.item)
			},
			/** 由父页面确认后调用：收起滑开状态 */
			resetSwipe() {
				this.offset = 0
			}
		}
	}
</script>

<style lang="scss">
	/* 左滑容器：删除按钮垫在卡片下方 */
	.card-swipe {
		position: relative;
		overflow: hidden;
		border-radius: 16px;
	}
	.swipe-delete {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 76px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		background: #FF3B30;
		i { font-size: 17px; color: #fff; }
	}
	.del-text { font-size: 12px; font-weight: 600; color: #fff; }

	.travel-card {
		position: relative;
		overflow: hidden;
		border: 1.5px solid;
		border-radius: 16px;
		padding: 16px 14px;
		min-height: 96px;
		display: flex;
		align-items: flex-start;
		box-sizing: border-box;
	}
	/* 背景水印车次 */
	.card-watermark {
		position: absolute;
		left: 0;
		bottom: -16px;
		font-size: 88px;
		font-weight: 900;
		letter-spacing: -3px;
		opacity: 0.5;
		line-height: 1;
		pointer-events: none;
	}
	.card-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
		z-index: 1;
	}
	.card-route {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
	}
	.route-station {
		font-size: 16px;
		font-weight: 700;
		color: var(--label);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 45%;
	}
	.route-arrow { font-size: 14px; color: var(--secondary); flex-shrink: 0; }
	.card-meta {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.meta-date {
		font-size: 15px;
		font-weight: 600;
		color: var(--label);
		font-variant-numeric: tabular-nums;
	}
	.meta-time {
		font-size: 13px;
		color: var(--secondary);
		font-variant-numeric: tabular-nums;
	}
	/* 座席 / 座位号：跟在终点站右侧 */
	.seat-text {
		margin-left: auto;
		flex-shrink: 0;
		font-size: 11px;
		font-weight: 600;
		color: var(--label);
		background: rgba(255, 255, 255, 0.72);
		border-radius: 7px;
		padding: 2px 7px;
		white-space: nowrap;
	}

	.card-model {
		position: absolute;
		right: 50px;
		bottom: 10px;
		font-size: 11px;
		font-weight: 600;
		color: var(--secondary);
		z-index: 1;
	}
	/* 三个操作按钮：竖排在右侧 */
	.card-actions {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-left: 8px;
		z-index: 2;
	}
	.act-btn {
		width: 30px;
		height: 30px;
		border-radius: 9px;
		background: rgba(255, 255, 255, 0.72);
		display: flex;
		align-items: center;
		justify-content: center;
		i { font-size: 13px; color: var(--theme-text); }
	}
	.act-hover { opacity: 0.6; }
</style>
