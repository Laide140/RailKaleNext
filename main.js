import App from './App'
import store from './store'

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
