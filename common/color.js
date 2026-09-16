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
