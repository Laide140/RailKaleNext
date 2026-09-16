/**
 * 应用设置管理
 * 首页布局 / 主题色 / API 源 / 自定义卡片 的读写与持久化
 */

export const SETTINGS_KEY = 'app_settings'

export const DEFAULT_SETTINGS = {
	homeLayout: 'card', // 'card' | 'grid' | 'custom'
	themeColor: '#007aff',
	apiSource: 'next', // 'next'（新，推荐） | 'old'（旧） | 'railgo'（RailGo 友商）
	customCards: [], // [{ id, title, color, bgImage, features: ['train-query', ...] }]
	keys: {} // 接口密钥覆盖：{ amap: 'default' | '自定义值', ... }，'default' 表示官方默认
}

/**
 * 读取设置，合并默认值
 */
export function loadSettings() {
	let saved = {}
	try {
		const raw = uni.getStorageSync(SETTINGS_KEY)
		if (raw) saved = typeof raw === 'string' ? JSON.parse(raw) : raw
	} catch (e) {}
	return { ...DEFAULT_SETTINGS, ...saved }
}

/**
 * 保存设置（持久化）
 */
export function saveSettings(settings) {
	try {
		uni.setStorageSync(SETTINGS_KEY, JSON.stringify(settings))
	} catch (e) {}
}

/**
 * 应用主题色到全局 CSS 变量
 * @param {string} color - 十六进制颜色
 */
export function applyTheme(color) {
	try {
		if (typeof document !== 'undefined' && document.documentElement) {
			document.documentElement.style.setProperty('--blue', color)
		}
	} catch (e) {}
}

/**
 * 读取当前 API 源设置
 * @returns {string} 'next' | 'old' | 'railgo'
 */
export function getApiSource() {
	try {
		return loadSettings().apiSource || 'next'
	} catch (e) {
		return 'next'
	}
}

/**
 * 生成唯一 id
 */
export function genId(prefix) {
	return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6)
}
