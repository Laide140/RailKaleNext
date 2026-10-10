/**
 * 颜色工具：HSL <-> HEX 转换，供主题调色器使用
 */

export function hslToHex(h, s, l) {
	s = Math.min(100, Math.max(0, s)) / 100
	l = Math.min(100, Math.max(0, l)) / 100
	const a = s * Math.min(l, 1 - l)
	const f = (n) => {
		const k = (n + h / 30) % 12
		const color = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
		return Math.round(255 * color).toString(16).padStart(2, '0')
	}
	return `#${f(0)}${f(8)}${f(4)}`
}

export function hexToHsl(hex) {
	let h = hex.replace('#', '')
	if (h.length === 3) {
		h = h.split('').map(c => c + c).join('')
	}
	const r = parseInt(h.substring(0, 2), 16) / 255
	const g = parseInt(h.substring(2, 4), 16) / 255
	const b = parseInt(h.substring(4, 6), 16) / 255
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const l = (max + min) / 2
	let hue = 0
	let sat = 0
	if (max !== min) {
		const d = max - min
		sat = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		switch (max) {
			case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break
			case g: hue = (b - r) / d + 2; break
			case b: hue = (r - g) / d + 4; break
		}
		hue *= 60
	}
	return { h: Math.round(hue), s: Math.round(sat * 100), l: Math.round(l * 100) }
}

export function isDarkColor(hex) {
	try {
		const hsl = hexToHsl(hex)
		return hsl.l < 55
	} catch (e) {
		return true
	}
}

const FALLBACK = '#007aff'

/**
 * 规范化十六进制颜色
 * @param {string} hex
 * @returns {string} #rrggbb，非法输入返回兜底色
 */
export function normalizeHex(hex) {
	let s = String(hex || '').trim().replace('#', '')
	if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map(c => c + c).join('')
	return /^[0-9a-fA-F]{6}$/.test(s) ? '#' + s.toLowerCase() : FALLBACK
}

/**
 * 十六进制转 rgba
 */
export function rgba(hex, alpha) {
	const c = normalizeHex(hex).slice(1)
	const int = parseInt(c, 16)
	return `rgba(${(int >> 16) & 255},${(int >> 8) & 255},${int & 255},${alpha})`
}

/**
 * 与白色混合（调浅）
 * @param {number} ratio 0=原色 1=纯白
 */
export function tint(hex, ratio) {
	const c = normalizeHex(hex).slice(1)
	const int = parseInt(c, 16)
	const t = Math.min(1, Math.max(0, ratio))
	const mix = (v) => Math.round(v + (255 - v) * t)
	return '#' + [mix((int >> 16) & 255), mix((int >> 8) & 255), mix(int & 255)]
		.map(v => v.toString(16).padStart(2, '0')).join('')
}

/**
 * 与黑色混合（调深）
 * @param {number} ratio 0=原色 1=纯黑
 */
export function shade(hex, ratio) {
	const c = normalizeHex(hex).slice(1)
	const int = parseInt(c, 16)
	const t = 1 - Math.min(1, Math.max(0, ratio))
	return '#' + [(int >> 16) & 255, (int >> 8) & 255, int & 255]
		.map(v => Math.round(v * t).toString(16).padStart(2, '0')).join('')
}

/**
 * 保证主题色在白底上作为文字可读（过浅时自动加深）
 */
export function readableOnWhite(hex, maxLight = 62) {
	const base = normalizeHex(hex)
	const hsl = hexToHsl(base)
	if (hsl.l <= maxLight) return base
	return hslToHex(hsl.h, hsl.s, maxLight)
}

/**
 * 主题调色板
 *
 * 【重要】这里只定义 UI 装饰用的变量。
 * 车站大屏的 7 种状态色、铁路地图的红/蓝线路、报警红、错误红等
 * 「语义色」一律不在此列，必须保持原样 —— 那些颜色是信息本身，不是配色。
 *
 * @param {string} hex 主题色
 */
export function themePalette(hex) {
	const base = normalizeHex(hex)
	const text = readableOnWhite(base)
	return {
		'--blue': base,          // 兼容历史变量
		'--theme': base,
		'--theme-text': text,    // 白底上可读的主题色（图标/文字）
		'--theme-strong': shade(base, 0.18),
		'--theme-soft': tint(base, 0.82),
		'--theme-softer': tint(base, 0.92),
		'--theme-border': rgba(text, 0.22),
		'--theme-fill': rgba(text, 0.08),
		'--theme-fill-strong': rgba(text, 0.14)
	}
}

/**
 * 把调色板写入全局 CSS 变量（仅 H5 有效；App 端请用 themeStyle）
 */
export function applyThemeVars(hex) {
	const palette = themePalette(hex)
	try {
		if (typeof document !== 'undefined' && document.documentElement) {
			const root = document.documentElement
			Object.keys(palette).forEach(k => root.style.setProperty(k, palette[k]))
		}
	} catch (e) {}
	return palette
}

/**
 * 调色板转可绑定样式对象
 *
 * App 端（nvue/App-vue）没有 document，写 documentElement 不生效，
 * 必须由页面根节点 :style="themeStyle" 响应式绑定。
 */
export function themeStyle(hex) {
	return themePalette(hex)
}

export default {
	hslToHex,
	hexToHsl,
	isDarkColor,
	normalizeHex,
	rgba,
	tint,
	shade,
	readableOnWhite,
	themePalette,
	applyThemeVars,
	themeStyle
}

