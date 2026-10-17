<template>
	<view class="am-mask" v-if="visible" @tap="onMaskTap" @touchmove.stop.prevent="noop">
		<view class="am-box" @tap.stop="noop">
			<!-- 标题 -->
			<text class="am-title" v-if="title">{{ title }}</text>
			<!-- 正文 -->
			<text class="am-content" v-if="content">{{ content }}</text>
			<!-- 输入框（对应 showModal 的 editable） -->
			<input
				v-if="editable"
				class="am-input"
				v-model="inputValue"
				:placeholder="placeholderText"
				placeholder-class="am-placeholder"
				:focus="visible"
				confirm-type="done"
				@confirm="onConfirm"
			/>
			<!-- 按钮 -->
			<view class="am-actions" :class="{ 'am-actions-col': actionsColumnValue }">
				<view
					class="am-btn"
					v-if="showCancel"
					:style="cancelStyle"
					hover-class="am-hover"
					@tap="onCancel"
				>
					<text>{{ cancelText }}</text>
				</view>
				<view
					class="am-btn am-btn-primary"
					:style="confirmStyle"
					hover-class="am-hover"
					@tap="onConfirm"
				>
					<text>{{ confirmText }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	/**
	 * 自绘确认对话框，替代 uni.showModal / plus.nativeUI.alert
	 * 用法（模板内）：
	 *   <app-modal ref="modal" />
	 * 用法（代码内）：
	 *   const ok = await this.$refs.modal.confirm({ title, content })
	 */
	export default {
		name: 'app-modal',
		props: {
			// 单行按钮模式：按钮竖排（每行一个，右对齐）
			actionsColumn: { type: Boolean, default: true }
		},
		data() {
			return {
				visible: false,
				title: '',
				content: '',
				confirmText: '确定',
				cancelText: '取消',
				showCancel: true,
				editable: false,
				placeholderText: '',
				actionsColumnValue: this.actionsColumn,
				inputValue: '',
				_resolve: null
			}
		},
		computed: {
			confirmStyle() {
				return 'color:' + (this.themeColor || '#007aff') + ';'
			},
			cancelStyle() {
				return ''
			}
		},
		methods: {
			noop() {},
			/**
			 * 打开对话框
			 * @returns {Promise<{confirm:boolean, content:string}>}
			 */
			open(opt) {
				const o = opt || {}
				this.title = o.title || ''
				this.content = o.content || ''
				this.confirmText = o.confirmText || '确定'
				this.cancelText = o.cancelText || '取消'
				this.showCancel = o.showCancel !== false
				this.editable = !!o.editable
				this.placeholderText = o.placeholderText || ''
				this.actionsColumnValue = o.actionsColumn === undefined ? true : !!o.actionsColumn
				this.inputValue = o.editable ? (o.content || '') : ''
				this.visible = true
				return new Promise(resolve => { this._resolve = resolve })
			},
			// 只关心「确定/取消」时用这个
			async confirm(opt) {
				const res = await this.open(opt)
				return res.confirm
			},
			close(confirm, content) {
				const r = this._resolve
				this._resolve = null
				this.visible = false
				if (r) r({ confirm: !!confirm, content: content || '' })
			},
			onConfirm() { this.close(true, this.inputValue) },
			onCancel() { this.close(false, '') },
			onMaskTap() {
				// 只有点了取消按钮才算取消，点遮罩不关闭，避免误触丢输入
				if (!this.showCancel) this.close(false, '')
			}
		}
	}
</script>

<style lang="scss">
	.am-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9990;
		padding: 0 32px;
		box-sizing: border-box;
	}
	.am-box {
		width: 100%;
		max-width: 320px;
		background: var(--card, #fff);
		border-radius: 16px;
		padding: 22px 20px 0;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.am-title {
		font-size: 17px;
		font-weight: 600;
		color: var(--label, #111);
		text-align: center;
		line-height: 1.35;
	}
	.am-content {
		font-size: 14px;
		color: var(--secondary, #666);
		text-align: center;
		line-height: 1.5;
		margin-top: 8px;
		white-space: pre-wrap;
		word-break: break-word;
	}
	.am-input {
		width: 100%;
		height: 44px;
		margin-top: 14px;
		padding: 0 12px;
		box-sizing: border-box;
		font-size: 15px;
		color: var(--label, #111);
		background: var(--fill, #f2f2f7);
		border-radius: 10px;
	}
	.am-placeholder { color: var(--secondary, #999); }
	.am-actions {
		width: 100%;
		display: flex;
		align-items: center;
		margin-top: 20px;
		border-top: 1px solid var(--separator, #eee);
	}
	.am-actions-col { flex-direction: column; }
	.am-btn {
		flex: 1;
		width: 100%;
		text-align: center;
		font-size: 17px;
		color: var(--secondary, #666);
		height: 52px;
		line-height: 52px;
		box-sizing: border-box;
	}
	/* 竖排时按钮之间加分隔线，符合 iOS 动作表观感 */
	.am-actions-col .am-btn + .am-btn {
		border-top: 1px solid var(--separator, #eee);
	}
	.am-btn-primary { font-weight: 600; }
	.am-hover { opacity: 0.55; }
</style>
