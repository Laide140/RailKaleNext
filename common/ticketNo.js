/**
 * 纪念车票票号
 *
 * 规则：默认 A000001，每生成一张自增 1；
 *       超过 A999999 后回卷到 A000001。
 *
 * 序号持久化在本地存储，卸载重装或清数据后从 1 重新开始。
 */

const STORAGE_KEY = 'ticket_seq'
const PREFIX = 'A'
const MAX = 999999

/**
 * 读取当前已生成到第几张（不递增）
 * @returns {number} 1 ~ 999999
 */
export function peekTicketSeq() {
	let n = 0
	try {
		const raw = uni.getStorageSync(STORAGE_KEY)
		n = parseInt(raw, 10)
	} catch (e) {
		n = 0
	}
	if (!Number.isFinite(n) || n < 0) n = 0
	return n % MAX + 1
}

/**
 * 取下一张票的序号并持久化
 * @returns {number} 1 ~ 999999
 */
export function nextTicketSeq() {
	const next = peekTicketSeq()
	try {
		uni.setStorageSync(STORAGE_KEY, String(next))
	} catch (e) {}
	return next
}

/**
 * 序号 → 票号字符串
 * @param {number} seq 1 ~ 999999
 * @returns {string} 如 A000001
 */
export function formatTicketNo(seq) {
	let n = parseInt(seq, 10)
	if (!Number.isFinite(n) || n < 1) n = 1
	if (n > MAX) n = ((n - 1) % MAX) + 1
	return PREFIX + String(n).padStart(6, '0')
}

/**
 * 票号字符串 → 序号（用于用户手工填写后继续自增）
 * @param {string} ticketNo 如 A000123
 * @returns {number} 解析失败返回 0
 */
export function parseTicketNo(ticketNo) {
	const m = String(ticketNo || '').trim().match(/^[A-Za-z]?(\d{1,6})$/)
	if (!m) return 0
	const n = parseInt(m[1], 10)
	return Number.isFinite(n) && n >= 1 ? n : 0
}

export default { peekTicketSeq, nextTicketSeq, formatTicketNo, parseTicketNo }
