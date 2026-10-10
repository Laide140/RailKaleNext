import App from './App'
import store from './store'
import { themeStyle } from './common/color.js'

// #ifndef VUE3
import Vue from 'vue'

// 全局注册自定义底栏
import customTabbar from './components/custom-tabbar/custom-tabbar.vue'
Vue.component('custom-tabbar', customTabbar)

Vue.config.productionTip = false
Vue.prototype.$store = store

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
