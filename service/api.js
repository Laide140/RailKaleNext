/**
 * 铁路万花筒 - API 服务层
 * 统一封装所有铁路信息查询接口
 *
 * 支持三套数据源（可在设置中切换，默认“新”）：
 *   next   ：新（推荐）  https://next.laide.net.cn/api/v3
 *   old    ：旧          https://rail.laide.asia/api
 *   railgo ：RailGo 友商 https://rg-api.zenglingkun.cn/api/v2
 *
 * 说明：RailGo 仅支持部分端点（车站大屏 / 检票口 / 线路图）。
 * 其它端点若选择了 RailGo，会自动回退到「新」数据源。
 */

import { getKey } from '@/common/keys.js'
import { getApiSource } from '@/common/settings.js'
import { getTelecode } from '@/common/station.js'

// 「新」数据源 V3：/api/v3，路径为短名、不带 .php 与尾斜杠
const NEXT_BASE = 'https://next.laide.net.cn/api/v3'
// 「新」数据源 V2：/api，基于 Node，车次 / 余票等端点在此
const NEXT_V2_BASE = 'https://next.laide.net.cn/api'
const OLD_BASE = 'https://rail.laide.asia/api'
// /api/v3 下的端点名。旧名 /api/getXxx 在 v3 下都是 404，
// 车次 / 余票 / 路网索引等未进 v3 的端点仍留在 /api。
const V3_PATH = {
	getStationCode: 'stationCode',
	getStationBigScreen: 'stationBigScreen',
	getExit: 'stationExit',
	getStationArea: 'stationArea',
	getLineTrains: 'lineTrains',
	getStationInfo: 'stationInfo',
	getStationSaleTimeInfo: 'stationSaleTimeInfo',
	getTrainTimeTable: 'trainTimeTable',
	getTrainLocate: 'trainLocate',
	getTrainData: 'emu',
	bureauMap: 'bureauMap',
	mapLine: 'mapLine'
}
const RAILGO_BASE = 'https://rg-api.zenglingkun.cn/api/v2'

// RailGo 支持的端点集合（其余端点自动回退到新源）
const RAILGO_SUPPORTED = ['getStationBigScreen', 'getExit', 'mapLine']

/**
 * 当前源的基础地址（供需要拼接自定义路径的场景使用）
 * @param {string} [endpoint] - 可选端点名，用于判断该端点是否回退
 * @returns {string} 形如 https://next.laide.net.cn/api
 */
export function getApiBase(endpoint) {
	return resolveBase(endpoint || '').base
}

/**
 * 当前选中的数据源
 * @returns {'next'|'old'|'railgo'}
 */
export function currentSource() {
	const s = getApiSource()
	return (s === 'old' || s === 'railgo' || s === 'next') ? s : 'next'
}

/**
 * 解析某端点实际使用的 base url
 * @param {string} endpoint - 端点名，如 'getStationBigScreen'
 * @returns {{ base: string, source: string }}
 */
export function resolveBase(endpoint) {
	const src = currentSource()
	if (src === 'railgo' && RAILGO_SUPPORTED.indexOf(endpoint) >= 0) {
		return { base: RAILGO_BASE, source: 'railgo' }
	}
	if (src === 'old') {
		return { base: OLD_BASE, source: 'old' }
	}
	// 已进 v3 的端点走 /api/v3；其余（车次 / 余票等）仍走 /api
	if (V3_PATH[endpoint]) {
		return { base: NEXT_BASE, source: 'next' }
	}
	return { base: NEXT_V2_BASE, source: 'next-v2' }
}

/**
 * 取某端点的完整 URL（供页面自己拼查询串的场景，如路网地图、雷达）
 * @param {string} endpoint 端点名，如 'getLineTrains'
 * @returns {string}
 */
export function endpointHref(endpoint) {
	return endpointUrl(endpoint, resolveBase(endpoint))
}

/**
 * 端点路径（不同源对尾斜杠要求不同）
 * @param {string} endpoint
 * @param {{base:string, source:string}} r
 * @returns {string} 完整 url
 */
function endpointUrl(endpoint, r) {
	// v3：短名、不带 .php 与尾斜杠
	if (r.source === 'next') {
		return r.base + '/' + V3_PATH[endpoint]
	}
	// 旧源：v2 风格的部分端点需要尾斜杠（避免 301）；RailGo 不能带尾斜杠
	const slashed = ['getStationBigScreen', 'getExit', 'mapLine', 'getStationArea', 'getLineTrains', 'getStationInfo', 'getStationSaleTimeInfo']
	if (r.source === 'railgo') {
		return r.base + '/' + endpoint
	}
	if (slashed.indexOf(endpoint) >= 0) {
		return r.base + '/' + endpoint + '/'
	}
	return r.base + '/' + endpoint
}

/**
 * 通用请求封装
 */
async function request(url, options = {}) {
	return new Promise((resolve, reject) => {
		uni.request({
			url,
			method: options.method || 'GET',
			data: options.data || {},
			header: options.header || {},
			timeout: options.timeout || 15000,
			success: (res) => {
				resolve(res.data)
			},
			fail: (err) => {
				console.error('请求失败:', url, err)
				reject(err)
			}
		})
	})
}

/**
 * 按端点名请求（自动解析 base / 路径 / 回退）
 * @param {string} endpoint
 * @param {Object} [data]
 * @param {Object} [opts]
 */
function requestEndpoint(endpoint, data = {}, opts = {}) {
	const r = resolveBase(endpoint)
	return request(endpointUrl(endpoint, r), { data, timeout: opts.timeout })
}

/**
 * 1. 获取车站代码映射
 * GET /api/v3/stationCode
 * @returns {Promise<Array<string>>} 车站代码列表
 */
export function getStationCode() {
	return requestEndpoint('getStationCode')
}

/**
 * 2. 查询车次
 * GET /getTrains
 */
export function getTrains(from, to, date) {
	const data = { from, to }
	if (date) data.date = date
	return requestEndpoint('getTrains', data)
}

/**
 * 3. 获取车次时刻表
 * GET /api/v3/trainTimeTable
 */
export function getTrainTimeTable(train, date) {
	return requestEndpoint('getTrainTimeTable', { train, date })
}

/**
 * 3.1 余票查询
 * GET /getLeftTicket
 */
export function getLeftTickets(from, to, date) {
	const data = { from, to }
	if (date) data.date = date
	return requestEndpoint('getLeftTicket', data)
}

/**
 * 3.2 站台规模查询
 * GET /api/v3/stationArea
 */
export function getStationArea(station) {
	return requestEndpoint('getStationArea', { station })
}

/**
 * 4. 查询列车实时位置
 * GET /api/v3/trainLocate
 */
export function getTrainLocate(train) {
	return requestEndpoint('getTrainLocate', { train })
}

/**
 * 5. 生成纪念车票
 * GET /getTicket
 * @returns {Promise<ArrayBuffer>} 图片二进制数据
 */
export function getTicket(params) {
	const r = resolveBase('getTicket')
	return new Promise((resolve, reject) => {
		uni.request({
			url: endpointUrl('getTicket', r),
			data: params,
			method: 'GET',
			responseType: 'arraybuffer',
			timeout: 30000,
			success: (res) => resolve(res.data),
			fail: (err) => reject(err)
		})
	})
}

/**
 * 6. 车站大屏
 * GET /getStationBigScreen
 */
export function getStationBigScreen(stationTelecode) {
	return requestEndpoint('getStationBigScreen', { stationTelecode })
}

/**
 * 7. 检票口/站台查询
 * GET /getExit
 */
export function getExit(trainNum, stationTelecode) {
	return requestEndpoint('getExit', { trainNum, stationTelecode })
}

/**
 * 8. 铁路线路图数据
 * GET /mapLine
 */
export function getMapLine(train) {
	return requestEndpoint('mapLine', { train })
}

/**
 * 8.1 按车站查询线路上运行的车次（列车雷达）
 * GET /api/v3/lineTrains?station=站1&station=站2
 * @param {string[]} stations - 车站名列表
 */
export function getLineTrains(stations) {
	const list = stations || []
	return requestEndpoint('getLineTrains', { station: list })
}

/**
 * 8.2 车站交通接驳信息（交通查询）
 * GET /api/v3/stationInfo?stationCode=IZQ
 * @param {string} stationCode - 车站电报码
 */
export function getStationInfo(stationCode) {
	return requestEndpoint('getStationInfo', { stationCode })
}

/**
 * 9. 检票口查询（12306官方）
 */
export function queryTicketCheck(trainDate, station_train_code, from_station_telecode) {
	return new Promise((resolve, reject) => {
		uni.request({
			url: 'https://www.12306.cn/index/otn/index12306/queryTicketCheck',
			method: 'POST',
			header: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			data: {
				trainDate,
				station_train_code,
				from_station_telecode
			},
			success: (res) => resolve(res.data),
			fail: (err) => reject(err)
		})
	})
}

/**
 * 10. 获取铁路 GeoJSON 文件列表
 * GET /getTrainTimeTable/railway/index.php
 */
export function getRailwayIndex() {
	return requestEndpoint('getTrainTimeTable/railway/index.php')
}

/**
 * 11. 获取铁路 GeoJSON 数据
 * GET /getTrainTimeTable/railway/{filename}
 */
export function getRailwayGeoJSON(filename) {
	return requestEndpoint('getTrainTimeTable/railway/' + filename, {}, { timeout: 30000 })
}

/**
 * 12. 高德地图静态图（含路线路径和标记）
 */
export function getAmapStaticMap(size, markers, paths) {
	const key = getKey('amap')
	let url = `https://restapi.amap.com/v3/staticmap?size=${size}&key=${key}`
	if (markers) url += `&markers=${encodeURIComponent(markers)}`
	if (paths) url += `&paths=${encodeURIComponent(paths)}`
	return url
}


/**
 * WGS-84 → GCJ-02 坐标转换（高德坐标拾取接口）
 *
 * 系统定位与 .travel 文件里的坐标都是 WGS-84，
 * 而高德地图、静态图与路径绘制都要求 GCJ-02，必须在前端转一次。
 * 一次最多 40 个点（接口限制），批量按批请求。
 *
 * @param {Array<{lng:number, lat:number}>} points
 * @returns {Promise<Array<{lng:number, lat:number}>>} 与入参等长、同序；失败返回原坐标
 */
export function wgs84ToGcj02(points) {
	const pts = Array.isArray(points) ? points : []
	if (!pts.length) return Promise.resolve([])

	const key = getKey('amap')
	// 没配密钥时不做转换：返回原坐标，避免整条路径消失
	if (!key) return Promise.resolve(pts.map(p => ({ lng: p.lng, lat: p.lat })))

	const CHUNK = 40
	const chunks = []
	for (let i = 0; i < pts.length; i += CHUNK) chunks.push(pts.slice(i, i + CHUNK))

	const convertOne = (list) => new Promise((resolve) => {
		const locations = list.map(p => `${p.lng},${p.lat}`).join('|')
		uni.request({
			url: 'https://restapi.amap.com/v3/assistant/coordinate/convert'
				+ `?locations=${encodeURIComponent(locations)}&coordsys=gps&output=json&key=${key}`,
			responseType: 'text',
			dataType: 'text',
			timeout: 10000,
			success: (r) => {
				try {
					const res = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
					if (!res || res.status !== '1' || !res.locations) return resolve(null)
					const out = String(res.locations).split(';').map(s => {
						const [lng, lat] = s.split(',').map(Number)
						return { lng, lat }
					})
					// 接口可能只回一个点（批量不识别时），此时不可用
					if (out.length !== list.length) return resolve(null)
					resolve(out)
				} catch (e) {
					resolve(null)
				}
			},
			fail: () => resolve(null)
		})
	})

	return Promise.all(chunks.map(convertOne)).then(parts => {
		const out = []
		parts.forEach((part, i) => {
			if (part && part.length === chunks[i].length) out.push(...part)
			// 某批失败就保留该批原始坐标，不至于整条轨迹丢失
			else out.push(...chunks[i].map(p => ({ lng: p.lng, lat: p.lat })))
		})
		return out
	})
}

/**
 * 算路器 —— 任意两站之间的最短走行线路（CRTrainRoute）
 * GET /api/v3/stationRoute?from={站名或电报码}&to={...}&km={可选目标里程}
 *
 * 响应要点：
 *   distance.meters / kilometers  走行距离
 *   stations[]                    途经车站（按沿线里程升序，含 km / offsetM）
 *   geometry.coordinates          LineString [lng, lat] 数组（GCJ-02，可直接上高德地图）
 *   ferry                         跨海轮渡信息
 *   kmPlan                        指定里程规划详情，未指定为 null
 *
 * 注：该端点冷启动较慢（实测首个请求 10s+），故超时放宽到 60s。
 *
 * @param {string} from 起点站名或电报码
 * @param {string} to   终点站名或电报码
 * @param {number} [km] 目标里程（公里），留空走最短路
 * @param {number} [ver] 指定里程模式：1=整段（大概里程，默认，快）；2=微调（精确里程，慢）
 * @returns {Promise<Object|null>}
 */
export function getStationRoute(from, to, km, ver) {
	let url = 'https://next.laide.net.cn/api/v3/stationRoute'
		+ '?from=' + encodeURIComponent(from)
		+ '&to=' + encodeURIComponent(to)
	if (km) url += '&km=' + encodeURIComponent(km)
	if (ver) url += '&ver=' + encodeURIComponent(ver)
	return new Promise((resolve) => {
		uni.request({
			url,
			responseType: 'text',
			dataType: 'text',
			// 指定里程模式在服务端要跑 45s+，最慢见过 62s，
			// 超时给到 120s 以免正常请求被提前掐断
			timeout: 120000,
			success: (r) => {
				try {
					const res = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
					if (!res) {
						// 504/502 时服务端返回的是 HTML 错误页，提示更明确
						if (r.statusCode === 504) return resolve({ ok: false, error: '算路超时，请稍后重试', hint: '指定里程模式计算较慢' })
						if (r.statusCode === 502) return resolve({ ok: false, error: '算路服务暂不可用' })
						return resolve(null)
					}
					// 接口用 ok 字段表示成功，失败时带 error / hint
					if (res.ok === false) {
						return resolve({ ok: false, error: res.error || '', hint: res.hint || '', statusCode: r.statusCode })
					}
					resolve(res)
				} catch (e) {
					resolve(null)
				}
			},
			fail: () => resolve(null)
		})
	})
}

/**
 * 车站开售时间 —— 自有数据源
 * GET /api/v3/stationSaleTimeInfo   （返回全部车站，约 3149 条 / 800KB，忽略入参）
 *
 * 返回项：{ bureau_code, station_name, station_telecode, sale_time, ... }
 * sale_time 为 4 位字符串，如 "1630" 表示每日 16:30 起售。
 */
export function getStationSaleTimeInfo() {
	return requestEndpoint('getStationSaleTimeInfo')
}

/** 铁路局代码 → 名称 */
export const BUREAU_NAMES = {
	B: '哈尔滨局', C: '呼和浩特局', F: '郑州局', G: '南昌局', H: '上海局',
	I: '边境口岸', J: '兰州局', K: '济南局', M: '昆明局', N: '武汉局',
	O: '青藏铁路公司', P: '北京局', Q: '广铁集团', R: '乌鲁木齐局', T: '沈阳局',
	U: '广东城际铁路公司', V: '太原局', W: '成都局', X: '香港铁路公司',
	Y: '西安局', Z: '南宁局'
}

/** 路局简码 → 简称（如 B → 哈局） */
export const BUREAU_SHORT_NAMES = {
	B: '哈局', C: '呼局', F: '郑局', G: '南局', H: '上局',
	I: '口岸', J: '兰局', K: '济局', M: '昆局', N: '武局',
	O: '青藏', P: '京局', Q: '广铁', R: '乌局', T: '沈局',
	U: '广东城际', V: '太局', W: '成局', X: '港铁',
	Y: '西局', Z: '宁局'
}

/**
 * 路局备注（号段来历等，供设置页/文档展示）
 * 「-」（国际联运）实际不使用，故不列入上表。
 */
export const BUREAU_NOTES = {
	I: '实际作为转义字符，不作常规使用',
	U: '原归属上海局徐州分局，铁路分局建制撤销后号段清空，后由广东城际接手使用',
	X: '原归属齐齐哈尔局，并入哈尔滨局后号段清空，后由港铁接手使用'
}

/**
 * 是否为已改名的车站
 *
 * 数据源中 bureau_code 为空即表示该站已改名：原站名对应的记录不再
 * 归属任何路局，station_telecode 也一并为空（电报码随旧站名作废）。
 */
export function isRenamedStation(item) {
	return !String((item && item.bureau_code) || '').trim()
}

/** 取路局全称；未收录的代码返回空串 */
export function bureauName(code) {
	return BUREAU_NAMES[String(code || '').trim().toUpperCase()] || ''
}

/** 取路局简称；未收录时回退为全称 */
export function bureauShortName(code) {
	const c = String(code || '').trim().toUpperCase()
	return BUREAU_SHORT_NAMES[c] || BUREAU_NAMES[c] || ''
}

/** "1630" → "16:30" */
export function formatSaleTime(t) {
	const s = String(t || '').trim()
	if (!/^\d{4}$/.test(s)) return s || '—'
	return s.slice(0, 2) + ':' + s.slice(2)
}


/**
 * 按日期查询车次担当车组 —— 自有数据源
 * GET /api/v3/emu?train={车次}&date={YYYYMMDD}
 *
 * 与 getTrainData 的区别：本端点支持日期，同一车次在不同日期的担当
 * 车组可能不同（例：G1 在 20261016 为 CR400BF-A-5057，20261017 为
 * CR400BF-A-5059）。getTrainData 不接受 date，只返回当前记录。
 *
 * 注意：日期格式必须是 8 位 YYYYMMDD；服务端数据只覆盖近期，
 * 超出范围的日期会回退到最近可用日期（见返回的 metadata.date_used）。
 *
 * @param {string} train 车次号
 * @param {string} [date] 日期，'YYYY-MM-DD' 或 'YYYYMMDD'
 * @returns {Promise<{trainSet: string, date: string, dateUsed: string}>}
 */
export function getTrainInfoByDate(train, date) {
	const day = String(date || '').replace(/-/g, '')
	let url = NEXT_BASE + '/emu?train=' + encodeURIComponent(train)
	if (/^\d{8}$/.test(day)) url += '&date=' + day
	return new Promise((resolve) => {
		uni.request({
			url,
			responseType: 'text',
			timeout: 15000,
			success: (r) => {
				try {
					const res = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
					if (!res || !res.success || !res.data) return resolve(null)
					resolve({
						trainSet: res.data.carGroup || '',
						date: res.data.date || '',
						dateUsed: (res.metadata && res.metadata.date_used) || res.data.date || ''
					})
				} catch (e) {
					resolve(null)
				}
			},
			fail: () => resolve(null)
		})
	})
}

/** 'YYYY-MM-DD' → 'YYYYMMDD' */
export function compactDate(d) {
	return String(d || '').replace(/-/g, '')
}

/** 今天，'YYYY-MM-DD' */
export function todayStr() {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 车组运用数据（车次 ↔ 车组号 担当关系）— 自有数据源
 * GET /api/v3/emu?train={车次}&date={YYYYMMDD}   按车次查
 * GET /api/v3/emu?tn={车组号}&date={YYYYMMDD}    按车组查
 *
 * 注意参数名不同：按车次查用 train，按车组查必须用 tn。
 * 传错参数会报「未找到车次」/「缺少 train 参数」，不会自动识别。
 *
 * 返回形态：
 *   传车次 → data 为对象 { train, carGroup, date }
 *   传车组 → data 为数组 [{ train, carGroup, date }, ...]
 *
 * @param {'train'|'emu'} mode
 * @param {string} value 车次号或车组号
 * @param {string} date  可选，'YYYY-MM-DD' 或 'YYYYMMDD'
 * @returns {Promise<{list: Array, single: Object|null}>}
 */
export function getTrainData(mode, value, date) {
	const key = mode === 'emu' ? 'tn' : 'train'
	const day = String(date || '').replace(/-/g, '')
	let url = NEXT_BASE + '/emu?' + key + '=' + encodeURIComponent(value)
	if (/^\d{8}$/.test(day)) url += '&date=' + day
	return new Promise((resolve) => {
		uni.request({
			url,
			responseType: 'text',
			timeout: 15000,
			success: (r) => {
				try {
					const res = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
					if (!res || !res.success) return resolve({ list: [], single: null })
					// 字段名统一为 trainSet，方便页面复用
					const norm = (o) => (o ? { train: o.train, trainSet: o.carGroup || '', date: o.date || '' } : null)
					const data = res.data
					if (Array.isArray(data)) return resolve({ list: data.map(norm).filter(Boolean), single: null })
					return resolve({ list: data ? [norm(data)] : [], single: norm(data) })
				} catch (e) {
					resolve({ list: [], single: null })
				}
			},
			fail: () => resolve({ list: [], single: null })
		})
	})
}

/**
 * 查询某车次的担当车组号
 * @param {string} train
 * @returns {Promise<string>}
 */
export async function getTrainSetOfTrain(train, date) {
	const res = await getTrainData('train', train, date)
	if (res.single && res.single.trainSet) return res.single.trainSet
	return (res.list[0] && res.list[0].trainSet) || ''
}

/**
 * 查询某车组担当的全部车次
 * @param {string} trainSet 车组号，如 CR400BF-A-5054
 * @returns {Promise<Array>}
 */
export async function getTrainsOfTrainSet(trainSet, date) {
	const res = await getTrainData('emu', trainSet, date)
	return res.list
}


/**
 * 列车（车组）资料 —— 自有数据源 /12306/train/
 *
 * 目录约定：
 *   /12306/train/{车型}/carInfo.json   列车信息（编组/长度/定员/时速/餐车…）
 *   /12306/train/{车型}/carPic.png     列车大图
 *   /12306/train/{车组号}/{0-7}.png    车厢图（按标号取，缺图时跳过）
 *
 * 其中 carInfo.json 的 pictureUrl 为 MD5 文件名，实际图片地址是
 *   https://wifi.12306.cn/resourcecenter/cateringimages/{md5}.png
 */

const RAILWAY_ASSET_BASE = 'https://next.laide.net.cn/12306/train'
const CATERING_BASE = 'https://wifi.12306.cn/resourcecenter/cateringimages'

/** 车型（去掉车组序号与短横线）：CR400BF-A-5061 → CR400BF-A */
export function carModelOf(trainSet) {
	const s = String(trainSet || '').trim()
	const m = s.match(/^(.*?)-?\d+$/)
	return m ? m[1] : s
}

/** 列车信息 JSON 地址 */
export function carInfoUrl(trainSet) {
	return `${RAILWAY_ASSET_BASE}/${encodeURIComponent(carModelOf(trainSet))}/carInfo.json`
}

/** 列车大图地址 */
export function carPicUrl(trainSet) {
	return `${RAILWAY_ASSET_BASE}/${encodeURIComponent(carModelOf(trainSet))}/carPic.png`
}

/** 车厢图地址：index 0~7 */
/** 车厢图地址：按车型取，index 为车厢序号（从 0 开始） */
export function carDiagramUrl(trainSet, index) {
	return `${RAILWAY_ASSET_BASE}/${encodeURIComponent(carModelOf(trainSet))}/${index}.png`
}

/** 车型 → 编组节数 的内存缓存（本次会话内有效） */
const formationCache = {}

/**
 * 编组车厢数探测
 *
 * 首选 carInfo.json 里的「列车编组」字段（pictureValue 形如 "16辆"）——
 * 该文件与 API 同域，跨域可读，且一次请求就能拿到全部资料。
 *
 * 拿不到时退回图片探测，图片按序号命名、序号从 0 开始，N 编组共 N 张图：
 *   8 编组  → 0.png ~ 7.png
 *   16 编组 → 0.png ~ 15.png
 *   17 编组 → 0.png ~ 16.png
 * 即 16.png 存在 → 17 编组，15.png 存在 → 16 编组，都不存在 → 8 编组。
 *
 * 注意：图片目录不带 CORS 头，浏览器端跨域时探测会失败，
 * 因此正常路径必须走 carInfo.json；探测仅作非浏览器端的兜底。
 *
 * @param {string} trainSet 车组号
 * @returns {Promise<number>} 编组节数（8 | 16 | 17）
 */
export async function detectFormation(trainSet) {
	const model = carModelOf(trainSet)
	if (!model) return 8
	// 同一车型的编组固定，探测结果按车型缓存，避免每个车组重复请求
	if (formationCache[model] !== undefined) return formationCache[model]

	// 首选：carInfo.json 的「列车编组」
	const fromInfo = await formationFromCarInfo(model)
	if (fromInfo) {
		formationCache[model] = fromInfo
		return fromInfo
	}

	// 兜底：探测末张图是否存在
	const exists = (n) => new Promise((resolve) => {
		uni.request({
			url: `${RAILWAY_ASSET_BASE}/${encodeURIComponent(model)}/${n}.png`,
			method: 'HEAD',
			responseType: 'text',   // 避免 404 响应体被当 JSON 解析
			dataType: 'text',
			timeout: 8000,
			success: (r) => resolve(r.statusCode === 200),
			fail: () => resolve(false)
		})
	})

	let n = 8
	if (await exists(16)) n = 17
	else if (await exists(15)) n = 16

	formationCache[model] = n
	return n
}

/**
 * 从 carInfo.json 读取编组节数
 * 「列车编组」条目的 pictureValue 形如 "16辆"，取其中的数字即可。
 * @returns {Promise<number>} 读不到时返回 0
 */
function formationFromCarInfo(model) {
	return new Promise((resolve) => {
		uni.request({
			url: `${RAILWAY_ASSET_BASE}/${encodeURIComponent(model)}/carInfo.json`,
			responseType: 'text',
			dataType: 'text',
			timeout: 10000,
			success: (r) => {
				try {
					const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
					if (!Array.isArray(d)) return resolve(0)
					const row = d.find(x => x && x.pictureName === '列车编组')
					const m = /(\d+)/.exec(String((row && row.pictureValue) || ''))
					resolve(m ? Number(m[1]) : 0)
				} catch (e) {
					resolve(0)
				}
			},
			fail: () => resolve(0)
		})
	})
}

/**
 * 生成某车型全部车厢图地址
 * @param {string} trainSet
 * @param {number} count 编组节数
 */
export function carDiagramUrls(trainSet, count) {
	const out = []
	for (let i = 0; i < count; i++) out.push(carDiagramUrl(trainSet, i))
	return out
}

/** carInfo 的 pictureUrl（MD5 文件名）→ 12306 实际图片地址 */
export function cateringImageUrl(pictureUrl) {
	const md5 = String(pictureUrl || '').trim()
	if (!md5) return ''
	if (/^https?:\/\//.test(md5)) return md5
	return `${CATERING_BASE}/${md5.replace(/\.png$/i, '')}.png`
}

/**
 * 拉取车组资料：carInfo.json + 车厢图地址
 *
 * 车厢图按约定直接生成 0~7 的地址，不做存在性探测
 * （HEAD 请求在 App/小程序端支持不稳定，且会带来 8 个多余请求；
 *   个别标号缺图时交由 <image> 的 error 事件处理）。
 *
 * @param {string} trainSet 车组号，如 CR400BF-A-5061
 * @returns {Promise<{info: Array, diagrams: string[], carPic: string}>}
 */
export async function getTrainSetInfo(trainSet) {
	const set = String(trainSet || '').trim()
	if (!set) return { info: [], diagrams: [], carPic: '', formation: 0 }

	// carInfo.json 同时提供资料与编组节数，只请求一次
	const info = await fetchCarInfo(set)
	let count = formationOfInfo(info)
	if (!count) {
		// carInfo 里没有编组字段时才退回探测（按车型缓存）
		count = await detectFormation(set)
	} else {
		formationCache[carModelOf(set)] = count
	}

	return {
		info,
		diagrams: carDiagramUrls(set, count || 8),
		carPic: carPicUrl(set),
		formation: count || 0
	}
}

/** 拉 carInfo.json，按 picOrder 排序；失败返回空数组 */
function fetchCarInfo(trainSet) {
	return new Promise((resolve) => {
		uni.request({
			url: carInfoUrl(trainSet),
			responseType: 'text',
			dataType: 'text',
			timeout: 15000,
			success: (r) => {
				try {
					const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
					resolve(Array.isArray(d) ? d.slice().sort((a, b) => (a.picOrder || 0) - (b.picOrder || 0)) : [])
				} catch (e) { resolve([]) }
			},
			fail: () => resolve([])
		})
	})
}

/** 从已拉到的 carInfo 数组里取编组节数，读不到返回 0 */
function formationOfInfo(info) {
	if (!Array.isArray(info)) return 0
	const row = info.find(x => x && x.pictureName === '列车编组')
	const m = /(\d+)/.exec(String((row && row.pictureValue) || ''))
	return m ? Number(m[1]) : 0
}

/**
 * 车次综合信息（时刻表 + 停台 + 线路 + 实时位置 + 担当车组）
 *
 * 全部为自有数据源，各子项互不阻塞：任一失败只影响对应区块。
 *
 * @param {string} train 车次号，如 G1
 * @param {string} [date] 日期 YYYY-MM-DD，默认今天
 */
export async function getTrainDetail(train, date, onPartial) {
	const trainNo = String(train || '').trim().toUpperCase()
	const d = date ? new Date(date) : new Date()
	const day = date || `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

	const result = {
		train: trainNo,
		date: day,
		timetable: null,
		platformMap: {},
		line: null,
		locate: null,
		trainSet: '',
		trainSetTrains: []
	}

	// 四个接口互相独立，各自返回后立刻通过 onPartial 回传，
	// 让页面能分步渲染，而不是等最慢的一个（实测冷缓存下可达 10s+）
	const emit = (patch) => {
		if (!onPartial) return
		try { onPartial(patch) } catch (e) {}
	}

	const [tt, line, loc, td] = await Promise.all([
		getTrainTimeTable(trainNo, day).catch(() => null).then(r => {
			const v = (r && r.code === 0 && r.data) ? r.data : null
			if (v) emit({ timetable: v })
			return v
		}),
		getMapLine(trainNo).catch(() => null).then(r => {
			const v = (r && r.success && r.data) ? r.data : null
			if (v) emit({ line: v })
			return v
		}),
		getTrainLocate(trainNo).catch(() => null).then(r => {
			const v = (r && r.code === 0) ? (r.data || null) : null
			if (v) emit({ locate: v })
			return v
		}),
		// 担当车组按日期查询：getTrainData 不支持 date，
		// 同一车次不同日期的车组可能不同，必须走 getTrainInfo
		getTrainInfoByDate(trainNo, day).then(r => {
			const v = (r && r.trainSet) || ''
			if (v) emit({ trainSet: v })
			return v
		})
	])

	result.timetable = tt
	result.line = line
	result.locate = loc
	result.trainSet = td

	// 停台查询需要先下载整张车站表（约 167KB），耗时可观，
	// 不在主流程里做，由页面单独调用 getPlatformMap() 异步补充。

	// 该车组担当的全部车次（独立补充，不阻塞主体）
	if (result.trainSet) {
		result.trainSetTrains = await getTrainsOfTrainSet(result.trainSet)
	}

	return result
}

/**
 * 停台查询（独立于主流程）
 *
 * 需要车站中文名 → 电报码，而电报码来自整张车站表（约 167KB）。
 * 因此这里单独调用，让页面主体先渲染，停台后到后填。
 *
 * @param {string} trainNo
 * @param {Array} stops 时刻表站点列表
 * @returns {Promise<Object>} { 站名: { platform, entrance, exit } }
 */
export async function getPlatformMap(trainNo, stops) {
	if (!trainNo || !stops || !stops.length) return {}
	return fetchPlatforms(trainNo, stops)
}

/**
 * 批量查询某车次在各站的停靠站台
 */
async function fetchPlatforms(trainNo, stops) {
	const map = {}
	await Promise.all(stops.map(async (stop) => {
		const name = stop && stop.station_name
		if (!name || map[name]) return
		try {
			const telecode = await getTelecode(name)
			if (!telecode) return
			const res = await getExit(trainNo, telecode)
			if (res && res.success && res.data) {
				map[name] = {
					platform: res.data.platform || '',
					entrance: res.data.entrance || [],
					exit: res.data.exit || []
				}
			}
		} catch (e) {}
	}))
	return map
}

/**
 * 解析车站代码数据
 */
export function parseStationCode(rawData) {
	if (!Array.isArray(rawData)) return []
	return rawData.map(item => {
		const parts = item.split('|')
		return {
			code: parts[0] ? parts[0].replace('@', '') : '',
			name: parts[1] || '',
			telecode: parts[2] || '',
			pinyin: parts[3] || '',
			abbr: parts[4] || '',
			cityCode: parts[6] || '',
			city: parts[7] || ''
		}
	})
}

/**
 * 13. 列车广播 TTS 语音合成 - 讯飞（自有接口，始终走新源）
 */
export function getTrainBroadcastUrl(text, opts = {}) {
	const _t = Date.now()
	const speed = opts.speed ? '&speed=' + opts.speed : ''
	const pitch = opts.pitch ? '&pitch=' + opts.pitch : ''
	return NEXT_BASE + '/xiaoyanTTS?context=' + encodeURIComponent(text) + speed + pitch + '&_t=' + _t
}

/**
 * 14. 列车广播 TTS 语音合成 - 百度
 */
export function getBaiduTtsUrl(text, speed = 5) {
	const _t = Date.now()
	return 'https://fanyi.baidu.com/gettts?lan=zh&text=' + encodeURIComponent(text) + '&spd=' + speed + '&source=web&_t=' + _t
}

export default {
	currentSource,
	resolveBase,
	getApiBase,
	getStationCode,
	getTrains,
	getTrainTimeTable,
	getLeftTickets,
	getStationArea,
	getTrainLocate,
	getTicket,
	getStationBigScreen,
	getExit,
	getMapLine,
	getLineTrains,
	getStationInfo,
	queryTicketCheck,
	getRailwayIndex,
	getRailwayGeoJSON,
	getAmapStaticMap,
	wgs84ToGcj02,
	getStationRoute,
	getStationSaleTimeInfo,
	formatSaleTime,
	BUREAU_NAMES,
	BUREAU_SHORT_NAMES,
	BUREAU_NOTES,
	bureauName,
	isRenamedStation,
	bureauShortName,
	getTrainData,
	getTrainInfoByDate,
	compactDate,
	todayStr,
	getTrainSetOfTrain,
	getTrainsOfTrainSet,
	getTrainDetail,
	getPlatformMap,
	getTrainSetInfo,
	carInfoUrl,
	carPicUrl,
	carDiagramUrl,
	carModelOf,
	cateringImageUrl,
	detectFormation,
	carDiagramUrls,
	parseStationCode,
	getTrainBroadcastUrl,
	getBaiduTtsUrl
}
