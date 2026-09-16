/**
 * 本地配置文件（示例模板）
 *
 * 使用方法：
 *   1. 把本文件复制为同目录下的 config.js
 *   2. 填入你自己的密钥
 *
 *   config.js 已在 .gitignore 中忽略，不会被提交，可安全存放密钥。
 *
 * 运行时读取优先级：设置页覆盖值（本地存储）> config.js > keys.js 内建默认值
 */
export default {
	keys: {
		amap: '你自己的key',     // 高德 Web服务（静态地图、定位）
		amap_js: '你自己的key',  // 高德 JS API（路网地图）
		amap_sec: '你自己的key'  // 高德 JS API 安全密钥
	}
}
