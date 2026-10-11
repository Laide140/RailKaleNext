/**
 * 铁路万花筒 - API 服务层
 * 统一封装所有铁路信息查询接口
 *
 * 支持三套数据源（可在设置中切换，默认“新”）：
 *   next   ：新（推荐）  https://next.laide.net.cn/api
 *   old    ：旧          https://rail.laide.asia/api
 *   railgo ：RailGo 友商 https://rg-api.zenglingkun.cn/api/v2
 *
 * 说明：RailGo 仅支持部分端点（车站大屏 / 检票口 / 线路图）。
 * 其它端点若选择了 RailGo，会自动回退到「新」数据源。
 */

import { getKey } from '@/common/keys.js'
import { getApiSource } from '@/common/settings.js'
import { getTelecode } from '@/common/station.js'

const NEXT_BASE = 'https://next.laide.net.cn/api'
const OLD_BASE = 'https://rail.laide.asia/api'
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
	return { base: NEXT_BASE, source: 'next' }
}

/**
 * 端点路径（不同源对尾斜杠要求不同）
 * @param {string} endpoint
 * @param {{base:string, source:string}} r
 * @returns {string} 完整 url
 */
function endpointUrl(endpoint, r) {
	// 新/旧的 v2 风格端点需要尾斜杠（避免 301）；RailGo 不能带尾斜杠
	const slashed = ['getStationBigScreen', 'getExit', 'mapLine', 'getStationArea', 'getLineTrains', 'getStationInfo']
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
 * GET /getStationCode/index.php
 * @returns {Promise<Array<string>>} 车站代码列表
 */
export function getStationCode() {
	return requestEndpoint('getStationCode/index.php')
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
 * GET /getTrainTimeTable/index.php
 */
export function getTrainTimeTable(train, date) {
	return requestEndpoint('getTrainTimeTable/index.php', { train, date })
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
 * GET /getStationArea/
 */
export function getStationArea(station) {
	return requestEndpoint('getStationArea', { station })
}

/**
 * 4. 查询列车实时位置
 * GET /getTrainLocate/index.php
 */
export function getTrainLocate(train) {
	return requestEndpoint('getTrainLocate/index.php', { train })
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
 * GET /getLineTrains/?station=站1&station=站2
 * @param {string[]} stations - 车站名列表
 */
export function getLineTrains(stations) {
	const list = stations || []
	return requestEndpoint('getLineTrains', { station: list })
}

/**
 * 8.2 车站交通接驳信息（交通查询）
 * GET /getStationInfo/?stationCode=IZQ
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
 * 车组运用数据（车次 ↔ 车组号 担当关系）— 自有数据源
 * GET /getTrainData/?train={车次或车组号}
 *
 * 服务端按入参自动判断返回形态：
 *   传车次（G1）              → data 为对象 { train, trainSet, type }
 *   传车组（CR400BF-A-5054）  → data 为数组 [{ train, trainSet, type }, ...]
 *
 * @param {'train'|'emu'} mode
 * @param {string} value 车次号或车组号
 * @returns {Promise<{list: Array, single: Object|null}>}
 */
export function getTrainData(mode, value) {
	return new Promise((resolve) => {
		uni.request({
			url: NEXT_BASE + '/getTrainData/?train=' + encodeURIComponent(value),
			responseType: 'text',
			timeout: 15000,
			success: (r) => {
				try {
					const res = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
					if (!res || res.code !== 200) return resolve({ list: [], single: null })
					const data = res.data
					if (Array.isArray(data)) return resolve({ list: data.filter(Boolean), single: null })
					return resolve({ list: data ? [data] : [], single: data || null })
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
export async function getTrainSetOfTrain(train) {
	const res = await getTrainData('train', train)
	if (res.single && res.single.trainSet) return res.single.trainSet
	return (res.list[0] && res.list[0].trainSet) || ''
}

/**
 * 查询某车组担当的全部车次
 * @param {string} trainSet 车组号，如 CR400BF-A-5054
 * @returns {Promise<Array>}
 */
export async function getTrainsOfTrainSet(trainSet) {
	const res = await getTrainData('emu', trainSet)
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
export function carDiagramUrl(trainSet, index) {
	return `${RAILWAY_ASSET_BASE}/${encodeURIComponent(String(trainSet).trim())}/${index}.png`
}

/** 车厢图可选标号 */
export const CAR_DIAGRAM_INDEXES = [0, 1, 2, 3, 4, 5, 6, 7]

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
	if (!set) return { info: [], diagrams: [], carPic: '' }

	const [info, diagrams] = await Promise.all([
		new Promise((resolve) => {
			uni.request({
				url: carInfoUrl(set),
				timeout: 15000,
				success: (r) => {
					try {
						const d = typeof r.data === 'string' ? JSON.parse(r.data) : r.data
						resolve(Array.isArray(d) ? d.sort((a, b) => (a.picOrder || 0) - (b.picOrder || 0)) : [])
					} catch (e) { resolve([]) }
				},
				fail: () => resolve([])
			})
		}),
		// 车厢图：按约定直接给 0~7 的地址，不做探测
		Promise.resolve(CAR_DIAGRAM_INDEXES.map(i => carDiagramUrl(set, i)))
	])

	return { info, diagrams, carPic: carPicUrl(set) }
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
		getTrainData('train', trainNo).then(r => {
			const v = (r.single && r.single.trainSet) || (r.list[0] && r.list[0].trainSet) || ''
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
	return NEXT_BASE + '/getXiaoYanTTS/?context=' + encodeURIComponent(text) + speed + pitch + '&_t=' + _t
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
	getTrainData,
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
	CAR_DIAGRAM_INDEXES,
	parseStationCode,
	getTrainBroadcastUrl,
	getBaiduTtsUrl
}
