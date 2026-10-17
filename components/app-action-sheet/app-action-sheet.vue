<template>
	<view class="as-mask" v-if="visible" @tap="onCancel" @touchmove.stop.prevent="noop">
		<view class="as-sheet" @tap.stop="noop">
			<view class="as-head" v-if="title">
				<text class="as-title">{{ title }}</text>
			</view>
			<view
				class="as-item"
				v-for="(it, i) in itemList"
				:key="i"
				hover-class="as-hover"
				@tap="onPick(i)"
			>
				<text class="as-item-text">{{ it }}</text>
			</view>
			<view class="as-gap"></view>
			<view class="as-item as-cancel" hover-class="as-hover" @tap="onCancel">
				<text class="as-item-text">{{ cancelText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	/**
	 * 自绘底部选项表，替代 uni.showActionSheet / plus.nativeUI.actionSheet
	 *   const idx = await this.$refs.sheet.pick({ itemList: ['A', 'B'], title: '选择' })
	 * 返回被点中的下标；取消返回 -1。
	 */
	export default {
		name: 'app-action-sheet',
		data() {
			return {
				visible: false,
				title: '',
				itemList: [],
				cancelText: '取消',
				_resolve: null
			}
		},
		methods: {
			noop() {},
			open(opt) {
				const o = opt || {}
				this.title = o.title || ''
				this.itemList = o.itemList || []
				this.cancelText = o.cancelText || '取消'
				this.visible = true
				return new Promise(resolve => { this._resolve = resolve })
			},
			async pick(opt) {
				return await this.open(opt)
			},
			close(idx) {
				const r = this._resolve
				this._resolve = null
				this.visible = false
				if (r) r(typeof idx === 'number' ? idx : -1)
			},
			onPick(i) { this.close(i) },
			onCancel() { this.close(-1) }
		}
	}
</script>

<style lang="scss">
	.as-mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.35);
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		z-index: 9980;
	}
	.as-sheet {
		background: var(--card, #fff);
		border-radius: 16px 16px 0 0;
		padding: 6px 0 calc(10px + constant(safe-area-inset-bottom));
		padding-bottom: calc(10px + env(safe-area-inset-bottom));
		max-height: 70vh;
		overflow-y: auto;
	}
	.as-head {
		padding: 14px 20px 10px;
	}
	.as-title {
		font-size: 13px;
		color: var(--secondary, #8e8e93);
		text-align: center;
		display: block;
	}
	.as-item {
		height: 54px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 20px;
	}
	.as-item + .as-item {
		border-top: 1px solid var(--separator, #f0f0f0);
	}
	.as-item-text {
		font-size: 17px;
		color: var(--label, #111);
		text-align: center;
	}
	.as-gap {
		height: 8px;
		background: var(--bg, #f2f2f7);
	}
	.as-cancel .as-item-text {
		color: var(--secondary, #666);
		font-weight: 600;
	}
	.as-hover { opacity: 0.55; }
</style>
