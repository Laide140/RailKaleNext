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
	parseStationCode,
	getTrainBroadcastUrl,
	getBaiduTtsUrl
}
