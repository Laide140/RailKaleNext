/**
 * 车站代码工具 - 在电报码和中文名之间互相转换
 * 数据来自 /api/getStationCode/index.php
 */

import { getStationCode, parseStationCode } from '@/service/api.js'

let cache = null
let nameToTelecode = null
let telecodeToName = null
let loadingPromise = null   // 并发去重：避免同时多个请求重复拉取车站表

/**
 * 加载并缓存车站数据
 * @returns {Promise<Array<Object>>} 车站列表
 */
async function loadStations() {
  if (cache) return cache
  if (loadingPromise) return loadingPromise
  loadingPromise = (async () => {
    const raw = await getStationCode()
    cache = parseStationCode(raw)

    // 构建双向映射
    nameToTelecode = {}
    telecodeToName = {}
    for (const s of cache) {
      if (s.name) nameToTelecode[s.name.trim()] = s.telecode
      if (s.telecode) telecodeToName[s.telecode.trim().toUpperCase()] = s.name
    }
    return cache
  })()
  try {
    return await loadingPromise
  } catch (e) {
    loadingPromise = null   // 失败后允许重试
    throw e
  } finally {
    if (cache) loadingPromise = null
  }
}

/**
 * 根据中文名获取电报码
 * @param {string} name - 中文站名（如 "北京南"）
 * @returns {Promise<string|null>} 电报码或 null
 */
export async function getTelecode(name) {
  if (!name) return null
  await loadStations()
  return nameToTelecode[name.trim()] || null
}

/**
 * 根据电报码获取中文名
 * @param {string} telecode - 电报码（如 "VNP"）
 * @returns {Promise<string|null>} 中文名或 null
 */
export async function getName(telecode) {
  if (!telecode) return null
  await loadStations()
  return telecodeToName[telecode.trim().toUpperCase()] || null
}

/**
 * 判断输入是中文名还是电报码，返回电报码
 * 中文名 → 查表转电报码；电报码 → 原样返回
 * @param {string} input - 用户输入
 * @returns {Promise<{telecode: string, name: string|null}>}
 */
export async function resolveTelecode(input) {
  if (!input) return { telecode: '', name: null }
  const val = input.trim()

  // 全是字母/数字 → 可能是电报码
  if (/^[A-Za-z0-9]+$/.test(val)) {
    const name = await getName(val.toUpperCase())
    return { telecode: val.toUpperCase(), name }
  }

  // 含中文 → 当作车站名处理
  const telecode = await getTelecode(val)
  if (telecode) {
    return { telecode, name: val }
  }

  // 找不到匹配，原样返回
  return { telecode: val, name: null }
}

/**
 * 获取完整车站列表（用于搜索/补全）
 */
export async function getStationList() {
  await loadStations()
  return cache
}

export default {
  getTelecode,
  getName,
  resolveTelecode,
  getStationList
}
