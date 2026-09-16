/**
 * 密钥管理
 * - 本地配置文件：common/config.js 的 keys（默认密钥真实值）
 * - 设置页可在线覆盖（写入本地存储 app_settings.keys，优先级最高）
 * - 不使用 uni-config-center，不从 static/ 导入
 */

import localConfig from '@/common/config.js'
import { SETTINGS_KEY } from '@/common/settings.js'

// 内建默认值（config.js 缺失时兜底）
// 注意：请勿在此硬编码真实密钥，密钥统一放在 common/config.js（已被 .gitignore 忽略）
const BUILTIN_DEFAULTS = {
	amap: '',
	amap_js: '',
	amap_sec: ''
}

// 密钥元信息，供设置页展示（label 标明平台与用途）
export const KEY_DEFS = [
	{ id: 'amap', label: '高德地图 · Web服务', desc: '车次定位 / 静态地图（REST API）' },
	{ id: 'amap_js', label: '高德地图 · JS API', desc: '路网地图加载（网页端）' },
	{ id: 'amap_sec', label: '高德地图 · JS安全码', desc: '路网地图 JS 安全密钥' }
]

// 从本地配置文件读取
function getFileConfig() {
	try {
		return (localConfig && localConfig.keys) || {}
	} catch (e) {
		return {}
	}
}

// 读取设置页覆盖值（本地存储）
function getOverrides() {
	try {
		const raw = uni.getStorageSync(SETTINGS_KEY)
		if (!raw) return {}
		const s = typeof raw === 'string' ? JSON.parse(raw) : raw
		return (s && s.keys) || {}
	} catch (e) {
		return {}
	}
}

/**
 * 获取指定密钥的有效值
 * 优先级：设置覆盖值 > 本地配置文件 > 内建默认
 * 值为 "default" 或空时，回退到默认真实值
 */
export function getKey(name) {
	const fileConfig = getFileConfig()
	const overrides = getOverrides()
	const raw = overrides[name] !== undefined && overrides[name] !== null
		? overrides[name]
		: (fileConfig[name] !== undefined ? fileConfig[name] : BUILTIN_DEFAULTS[name])

	if (raw === 'default' || raw === '' || !raw) {
		return fileConfig[name] || BUILTIN_DEFAULTS[name] || ''
	}
	return raw
}

/**
 * 校验用户填写的密钥是否有效（简单长度检查）
 */
export function isValidKey(value) {
	const v = String(value || '').trim()
	return v.length >= 8
}
