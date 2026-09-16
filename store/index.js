import { loadSettings, saveSettings, applyTheme } from '@/common/settings.js'

// #ifndef VUE3
import Vue from 'vue'
import Vuex from 'vuex'
Vue.use(Vuex)
const store = new Vuex.Store({
// #endif

// #ifdef VUE3
import { createStore } from 'vuex'
const store = createStore({
// #endif
	state: {
		searchHistory: [],
		favoriteTrains: [],
		settings: loadSettings()
	},
	mutations: {
		addSearchHistory(state, record) {
			state.searchHistory.unshift(record)
			if (state.searchHistory.length > 20) {
				state.searchHistory.pop()
			}
		},
		toggleFavorite(state, trainNo) {
			const idx = state.favoriteTrains.indexOf(trainNo)
			if (idx >= 0) {
				state.favoriteTrains.splice(idx, 1)
			} else {
				state.favoriteTrains.push(trainNo)
			}
		},
		clearHistory(state) {
			state.searchHistory = []
		},
		setSettings(state, payload) {
			state.settings = { ...state.settings, ...payload }
			saveSettings(state.settings)
			applyTheme(state.settings.themeColor)
		}
	},
	getters: {
		isFavorite: (state) => (trainNo) => {
			return state.favoriteTrains.includes(trainNo)
		}
	},
	actions: {}
})

export default store
