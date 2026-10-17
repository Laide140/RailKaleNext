/**
 * 运转分享 —— 行程数据层
 *
 * 行程持久化在本地缓存（uni.setStorageSync）里，键名约定的
 * 存储名为 travel，内容是一个数组，每项即一条行程记录：
 * {
 *   id, train, start, end, model, seatType, carNum, seatNum, name,
 *   gps: { "1": [lng, lat], "2": [lng, lat], ... },
 *   date, departTime, createdAt
 * }
 *
 * 导出/分享时写成 .travel 文件，内容就是这批 JSON。
 */

const STORAGE_KEY = 'travel_v1'

/** 座席类型：最后一项「其他」由用户自行填写 */
export const SEAT_TYPES = [
	'无座', '二等座', '一等座', '特等座', '优选一等座',
	'商务座', '硬座', '硬卧', '软卧', '其他'
]

/** 马卡龙配色：卡片背景取浅色，边框取同色系深一档 */
export const MACARON = [
	{ bg: '#FFE3EC', border: '#F5A8C2' },
	{ bg: '#E4F1FF', border: '#9CC7F0' },
	{ bg: '#E8F8EC', border: '#A5D9B6' },
	{ bg: '#FFF3DC', border: '#F0CB86' },
	{ bg: '#F0E9FF', border: '#C0AEE8' },
	{ bg: '#E3F7F7', border: '#9BD6D6' },
	{ bg: '#FFECE3', border: '#F3B69A' },
	{ bg: '#EDF3E4', border: '#BFD3A3' },
	{ bg: '#FCE8F5', border: '#E6A9D3' },
	{ bg: '#E9EEFB', border: '#AAB9E4' }
]

export function macaronOf(seed) {
	const s = String(seed || '')
	let h = 0
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
	return MACARON[h % MACARON.length]
}

function genId() {
	return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

/** 读取全部行程（按创建时间倒序，最新的在前） */
export function loadTravels() {
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		if (!raw) return []
		const list = typeof raw === 'string' ? JSON.parse(raw) : raw
		if (!Array.isArray(list)) return []
		return list.filter(Boolean).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
	} catch (e) {
		return []
	}
}

/** 覆盖写入 */
export function saveTravels(list) {
	try {
		uni.setStorageSync(STORAGE_KEY, JSON.stringify(list || []))
		return true
	} catch (e) {
		return false
	}
}

/** 新增一条行程 */
export function addTravel(item) {
	const list = loadTravels()
	const record = Object.assign({
		id: genId(),
		gps: {},
		createdAt: Date.now()
	}, item)
	// 新行程放在最前，列表即按时间倒序
	list.unshift(record)
	saveTravels(list)
	return record
}

/** 按 id 取一条 */
export function getTravel(id) {
	return loadTravels().find(t => t.id === id) || null
}

/** 按 id 更新 */
export function updateTravel(id, patch) {
	const list = loadTravels()
	const i = list.findIndex(t => t.id === id)
	if (i < 0) return null
	list[i] = Object.assign({}, list[i], patch)
	saveTravels(list)
	return list[i]
}

/** 删除一条 */
export function removeTravel(id) {
	const list = loadTravels().filter(t => t.id !== id)
	saveTravels(list)
	return list
}

/**
 * 追加一个测速点（序号从 1 起）
 * @param {string} id 行程 id
 * @param {number} lng 经度
 * @param {number} lat 纬度
 */
export function addGpsPoint(id, lng, lat) {
	const list = loadTravels()
	const t = list.find(x => x.id === id)
	if (!t) return null
	if (!t.gps) t.gps = {}
	const n = Object.keys(t.gps).length + 1
	t.gps[String(n)] = [Number(lng), Number(lat)]
	saveTravels(list)
	return n
}

/** 转成 .travel 文件内容（单条行程） */
export function travelFileContent(item) {
	const t = item || {}
	const gps = t.gps && Object.keys(t.gps).length ? { gps: t.gps } : {}
	return JSON.stringify(Object.assign({
		train: t.train || '',
		start: t.start || '',
		end: t.end || '',
		model: t.model || '',
		seatType: t.seatType || '',
		carNum: t.carNum || '',
		seatNum: t.seatNum || '',
		name: t.name || '',
		date: t.date || '',
		departTime: t.departTime || ''
	}, gps), null, 2)
}

/** 'YYYY-MM-DD' → 'MM.DD' */
export function shortDate(d) {
	const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(d || ''))
	return m ? `${m[1]}.${m[2]}` : (d || '')
}
