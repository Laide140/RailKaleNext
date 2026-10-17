<template>
	<view class="at-wrap" v-if="visible">
		<view class="at-box">
			<i class="fas at-icon" :class="iconClass" v-if="iconClass"></i>
			<text class="at-text">{{ text }}</text>
		</view>
	</view>
</template>

<script>
	/**
	 * 自绘轻提示，替代 uni.showToast
	 *   this.$refs.toast.show('已保存')
	 *   this.$refs.toast.show('已保存', 'success')
	 * icon: '' | 'success' | 'none'
	 */
	export default {
		name: 'app-toast',
		data() {
			return {
				visible: false,
				text: '',
				icon: '',
				_timer: null
			}
		},
		computed: {
			iconClass() {
				if (this.icon === 'success') return 'fa-circle-check'
				if (this.icon === 'error') return 'fa-circle-exclamation'
				return ''
			}
		},
		beforeDestroy() { this.clear() },
		methods: {
			clear() {
				if (this._timer) { clearTimeout(this._timer); this._timer = null }
			},
			show(text, icon, duration) {
				if (!text) return
				this.clear()
				this.text = String(text)
				this.icon = icon || ''
				this.visible = true
				this._timer = setTimeout(() => { this.visible = false }, duration || 1800)
			},
			hide() { this.clear(); this.visible = false }
		}
	}
</script>

<style lang="scss">
	.at-wrap {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9970;
		/* 轻提示不拦截操作 */
		pointer-events: none;
	}
	.at-box {
		max-width: 70%;
		background: rgba(0, 0, 0, 0.78);
		border-radius: 12px;
		padding: 14px 18px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}
	.at-icon { font-size: 26px; color: #fff; }
	.at-text {
		font-size: 14px;
		color: #fff;
		line-height: 1.4;
		text-align: center;
		word-break: break-word;
	}
</style>
