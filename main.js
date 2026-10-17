import App from './App'
import store from './store'
import { themeStyle } from './common/color.js'

// #ifndef VUE3
import Vue from 'vue'

// 全局注册自定义底栏
import customTabbar from './components/custom-tabbar/custom-tabbar.vue'
Vue.component('custom-tabbar', customTabbar)

// 全局注册自绘交互组件（替代系统弹框/选择器，保证主题色与浅色风格统一）
import appModal from './components/app-modal/app-modal.vue'
import appActionSheet from './components/app-action-sheet/app-action-sheet.vue'
import appToast from './components/app-toast/app-toast.vue'
import appDatePicker from './components/app-date-picker/app-date-picker.vue'
Vue.component('app-modal', appModal)
Vue.component('app-action-sheet', appActionSheet)
Vue.component('app-toast', appToast)
Vue.component('app-date-picker', appDatePicker)

Vue.config.productionTip = false
Vue.prototype.$store = store

// 统一提示：自绘组件优先，未挂载时退回原生 uni API。
// 用普通方法而不是 computed，页面里 this.toast('...') 直接可用。
Vue.prototype.toast = function (text, icon, duration) {
	const t = this.$refs && this.$refs.toast
	if (t) return t.show(text, icon, duration)
	uni.showToast({ title: String(text || ''), icon: icon || 'none', duration: duration || 1800 })
}
Vue.prototype.dialog = function (opt) {
	const m = this.$refs && this.$refs.modal
	if (m) return m.open(opt)
	const o = opt || {}
	return new Promise(resolve => {
		uni.showModal({
			title: o.title || '',
			content: o.content || '',
			editable: !!o.editable,
			placeholderText: o.placeholderText || '',
			showCancel: o.showCancel !== false,
			confirmText: o.confirmText || '确定',
			cancelText: o.cancelText || '取消',
			success: r => resolve({ confirm: !!r.confirm, content: r.content || '' }),
			fail: () => resolve({ confirm: false, content: '' })
		})
	})
}
Vue.prototype.alert = function (opt) {
	const o = typeof opt === 'string' ? { content: opt } : (opt || {})
	return this.dialog(Object.assign({ showCancel: false }, o))
}
Vue.prototype.sheet = function (opt) {
	const s = this.$refs && this.$refs.sheet
	if (s) return s.pick(opt)
	const o = opt || {}
	return new Promise(resolve => {
		uni.showActionSheet({
			itemList: o.itemList || [],
			success: r => resolve(r.tapIndex),
			fail: () => resolve(-1)
		})
	})
}
Vue.prototype.datePick = function (opt) {
	const p = this.$refs && this.$refs.datePick
	if (p) return p.open(opt)
	return Promise.resolve((opt && opt.value) || '')
}

// 全局混入：提供 themeColor 等设置供页面内联样式绑定
Vue.mixin({
	computed: {
		themeColor() {
			return (this.$store && this.$store.state.settings && this.$store.state.settings.themeColor) || '#007aff'
		},
		// 主题调色板：页面根节点绑定 :style="themeStyle" 即可让整页主题生效。
		// 必须走内联响应式绑定 —— App 端没有 document，
		// 只写 document.documentElement 在 App 上不会生效。
		themeStyle() {
			return themeStyle(this.themeColor)
		},
		homeLayout() {
			return (this.$store && this.$store.state.settings && this.$store.state.settings.homeLayout) || 'card'
		},
		customCards() {
			return (this.$store && this.$store.state.settings && this.$store.state.settings.customCards) || []
		}
	}
})

App.mpType = 'app'
const app = new Vue({
	store,
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
import * as Pinia from 'pinia';
import Vuex from "vuex";
export function createApp() {
	const app = createSSRApp(App)
	app.use(store)
	app.use(Pinia.createPinia());
	return {
		app,
		Vuex,
		Pinia
	}
}
// #endif
