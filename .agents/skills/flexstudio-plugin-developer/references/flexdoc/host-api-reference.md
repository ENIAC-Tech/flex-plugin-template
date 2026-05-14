# Host API Reference

Host API 是 FlexStudio 暴露给插件后端进程的受权限控制能力集合。插件通过 `this.hostApi` 访问这些能力。

```ts
const platform = await this.hostApi.system.getPlatform()
await this.hostApi.ui.showSnackbarMessage({ message: 'Done', type: 'success' })
```

插件必须在 `manifest.json` 的 `permissions` 中声明对应权限。未声明权限时调用会失败。

## 权限与命名空间

| 命名空间 | 权限 | 说明 |
| --- | --- | --- |
| `hostApi.file` | `file` | 文件系统读写。 |
| `hostApi.system` | `system` | 系统和应用信息。 |
| `hostApi.store` | `store` | 插件作用域 key-value 存储。 |
| `hostApi.http` | `http` | HTTP 请求。 |
| `hostApi.logger` | `logger` | 低层日志写入。通常优先使用 `this.logger`。 |
| `hostApi.plugin` | `definitions` / `store` / `pluginApi` | 插件定义注册、配置读写和直接依赖 API 调用。 |
| `hostApi.bus` | `bus` | 宿主事件总线。 |
| `hostApi.unit` | `unit` | Unit 设备事件。 |
| `hostApi.canvas` | `unit` | Canvas Unit 推帧。 |
| `hostApi.ui` | `ui` | FlexStudio 主 UI 消息。 |
| `hostApi.device` | `device` | 连接设备配置和能力查询。 |
| `hostApi.electron.*` | 对应 `electron.*` | 受限 Electron 能力。 |

## File API

权限：`file`

```ts
interface PluginFileApi {
  readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer>
  writeFile(filePath: string, data: any, encoding?: BufferEncoding): Promise<void>
  exists(filePath: string): Promise<boolean>
  readDir(dirPath: string): Promise<string[]>
  mkdir(dirPath: string): Promise<void>
  unlink(filePath: string): Promise<void>
}
```

示例：

```ts
if (await this.hostApi.file.exists(path)) {
  const text = await this.hostApi.file.readFile(path, 'utf8')
  this.logger.info(String(text))
}
```

## System API

权限：`system`

```ts
interface PluginSystemApi {
  getPlatform(): Promise<string>
  getArch(): Promise<string>
  getCpuInfo(): Promise<any>
  getMemInfo(): Promise<any>
  getAppVersion(): Promise<string>
}
```

示例：

```ts
const [platform, arch, version] = await Promise.all([
  this.hostApi.system.getPlatform(),
  this.hostApi.system.getArch(),
  this.hostApi.system.getAppVersion(),
])
```

## Store API

权限：`store`

```ts
interface PluginStoreApi {
  get<T = any>(key: string, defaultValue?: T): Promise<T>
  set(key: string, value: any): Promise<void>
  delete(key: string): Promise<void>
  has(key: string): Promise<boolean>
}
```

示例：

```ts
const count = await this.hostApi.store.get('count', 0)
await this.hostApi.store.set('count', count + 1)
```

如果要保存插件配置，优先使用 `this.loadConfig()` 和 `this.saveConfig()`。

## HTTP API

权限：`http`

```ts
interface PluginHttpApi {
  get(url: string, options?: any): Promise<{
    statusCode: number
    headers: any
    body: string
  }>
}
```

示例：

```ts
const response = await this.hostApi.http.get('https://api.example.com/status')
if (response.statusCode === 200) {
  const data = JSON.parse(response.body)
}
```

## Logger API

权限：`logger`

```ts
interface PluginLoggerHostApi {
  log(level: string, message: string, data?: any): Promise<void>
}
```

通常优先使用 `this.logger.debug/info/warn/error()`。只有在需要直接访问 host logger proxy 时再使用 `hostApi.logger.log()`。

## Plugin API

权限：`definitions`、`store` 或 `pluginApi`

```ts
interface PluginHostApi {
  registerDefinitions(payload: PluginDefinitionsPayload): Promise<void>
  loadConfig<T extends Record<string, any> = Record<string, any>>(defaults?: T): Promise<T>
  saveConfig(config: Record<string, any>): Promise<void>
  callDependency<T = any>(
    dependencyUUID: string,
    method: string,
    params?: any[],
  ): Promise<T>
}
```

权限要求：

| 方法 | 权限 | 说明 |
| --- | --- | --- |
| `registerDefinitions` | `definitions` | 替换当前插件注册的 Library 与 Unit 定义。 |
| `loadConfig` | `store` | 读取插件配置。不存在时返回默认值或空对象。 |
| `saveConfig` | `store` | 原子写入插件配置。 |
| `callDependency` | `pluginApi` | 调用 manifest 中声明的直接依赖插件暴露的后端 API。 |

`FlexPluginBase` 提供了同名便捷方法：

```ts
const config = await this.loadConfig({ enabled: true })
await this.saveConfig(config)
await this.registerDefinitions(payload)
```

`callDependency()` 用于插件后端之间的请求/响应式调用。调用方必须声明 `pluginApi` 权限，并且目标插件必须是 manifest 中声明的直接依赖：

```ts
const result = await this.hostApi.plugin.callDependency(
  '@acme/base-plugin',
  'getStatus',
  ['device'],
)
```

更多设计约束、暴露方式和错误语义见 [插件依赖 API](./dependency-api.md)。

## Bus API

权限：`bus`

```ts
interface PluginBusApi {
  on(topic: string, options?: RegisterEventOptions): Promise<void>
  off(topic: string, handler: PluginEventHandler): Promise<void>
}

interface RegisterEventOptions {
  snapshot?: boolean
}
```

建议通过 `FlexPluginBase.on()`、`off()`、`once()` 使用，因为基类会保存本地 handler 并处理事件分发。

Topic 约定：

| Topic | 说明 |
| --- | --- |
| `device.connection.changed` | 设备连接状态变化。 |
| `device.connection.snapshot` | 当前设备连接状态快照。 |
| `device.plugin.<typeId>.pressed` | 插件 Unit 被按下。 |
| `device.plugin.<typeId>.released` | 插件 Unit 被释放。 |
| `device.plugin.<typeId>.touch` | 插件 Unit 触摸事件。 |
| `device.plugin.<typeId>.load` | 插件 Unit 在设备上加载或可见。 |
| `device.plugin.<typeId>.unload` | 插件 Unit 在设备上卸载或隐藏。 |

## Unit API

权限：`unit`

```ts
type UnitDeviceEventType = 'load' | 'unload' | 'touch' | 'pressed' | 'released'

interface PluginUnitApi {
  on(typeId: string, event: UnitDeviceEventType, options?: RegisterEventOptions): Promise<void>
  off(typeId: string, event: UnitDeviceEventType, handler: PluginEventHandler): Promise<void>
}
```

建议使用 `FlexPluginBase.onUnitEvent()` 和 `offUnitEvent()`：

```ts
await this.onUnitEvent('acme.open-url', 'pressed', async (event) => {
  this.logger.info('pressed', event.payload)
})
```

## Canvas API

权限：`unit`

```ts
interface PluginCanvasApi {
  pushFrame(serialNumber: string, uuid: string, pngBuffer: Buffer): Promise<void>
}
```

`pushFrame()` 用于 Canvas Unit。参数：

| 参数 | 说明 |
| --- | --- |
| `serialNumber` | 目标设备序列号，来自 `load` 事件。 |
| `uuid` | Unit 实例 UUID，来自 `load` 事件。 |
| `pngBuffer` | PNG 编码图像 Buffer。 |

宿主会自动缩放尺寸并编码为 JPEG 发送到设备。超过每个 Unit 60fps 的帧会被丢弃。

## UI API

权限：`ui`

```ts
type SnackbarMessageType = 'success' | 'error' | 'warning' | 'info'

interface SnackbarMessageOptions {
  message: string
  type?: SnackbarMessageType
  duration?: number
}

interface PluginUiApi {
  showSnackbarMessage(options: SnackbarMessageOptions): Promise<void>
}
```

示例：

```ts
await this.hostApi.ui.showSnackbarMessage({
  message: 'Export complete',
  type: 'success',
  duration: 3000,
})
```

## Device API

权限：`device`

```ts
interface PluginDeviceConfig {
  deviceName: string
  color: number
  sleepTimeout: number
  brightness: number
  screenFlip: boolean
  vibrate: number
  autoSleep: boolean
}

interface PluginDeviceApi {
  getDeviceConfig(serialNumber: string): Promise<PluginDeviceConfig>
  setDeviceConfig(serialNumber: string, patch: Partial<PluginDeviceConfig>): Promise<void>
  showSnackbarMessage(serialNumber: string, options: DeviceSnackbarMessageOptions): Promise<void>
  getModel(serialNumber: string): Promise<string>
  getScreenSize(serialNumber: string): Promise<{ width: number; height: number }>
  getCapabilities(serialNumber: string): Promise<DeviceCapability[]>
  hasCapability(serialNumber: string, capability: DeviceCapability): Promise<boolean>
}
```

设备 snackbar 参数：

```ts
interface DeviceSnackbarMessageOptions {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  iconUnicode?: string
}
```

示例：

```ts
const size = await this.hostApi.device.getScreenSize(serialNumber)
const hasTouch = await this.hostApi.device.hasCapability(serialNumber, 'touchscreen')
await this.hostApi.device.showSnackbarMessage(serialNumber, {
  message: 'Updated',
  type: 'success',
})
```

## Electron API

Electron API 通过 `hostApi.electron.*` 暴露。每个子模块需要单独权限。

### electron.app

权限：`electron.app`

```ts
interface PluginElectronAppApi {
  getPath(name: string): Promise<string>
  getAppPath(): Promise<string>
  getName(): Promise<string>
  getVersion(): Promise<string>
  getLocale(): Promise<string>
  isPackaged(): Promise<boolean>
}
```

### electron.browserWindow

权限：`electron.browserWindow`

```ts
interface PluginElectronBrowserWindowApi {
  getBounds(): Promise<ElectronRectangle>
  setBounds(bounds: Partial<ElectronRectangle>): Promise<void>
  minimize(): Promise<void>
  maximize(): Promise<void>
  unmaximize(): Promise<void>
  restore(): Promise<void>
  show(): Promise<void>
  hide(): Promise<void>
  focus(): Promise<void>
  isVisible(): Promise<boolean>
  isFocused(): Promise<boolean>
  isMinimized(): Promise<boolean>
  isMaximized(): Promise<boolean>
}
```

### electron.clipboard

权限：`electron.clipboard`

```ts
interface PluginElectronClipboardApi {
  readText(type?: 'selection' | 'clipboard'): Promise<string>
  writeText(text: string, type?: 'selection' | 'clipboard'): Promise<void>
  readHTML(type?: 'selection' | 'clipboard'): Promise<string>
  writeHTML(markup: string, type?: 'selection' | 'clipboard'): Promise<void>
  readImage(): Promise<ElectronNativeImagePng | null>
  writeImage(image: ElectronNativeImagePng): Promise<void>
  clear(): Promise<void>
}
```

### electron.globalShortcut

权限：`electron.globalShortcut`

```ts
interface PluginElectronGlobalShortcutApi {
  register(accelerator: string): Promise<void>
  unregister(accelerator: string): Promise<void>
  isRegistered(accelerator: string): Promise<boolean>
}
```

### electron.powerMonitor

权限：`electron.powerMonitor`

```ts
interface PluginElectronPowerMonitorApi {
  getSystemIdleTime(): Promise<number>
  getSystemIdleState(idleThreshold: number): Promise<'active' | 'idle' | 'locked' | 'unknown'>
}
```

### electron.dialog

权限：`electron.dialog`

```ts
interface PluginElectronDialogApi {
  showOpenDialog(options?: ElectronOpenDialogOptionsDto): Promise<ElectronOpenDialogResultDto>
  showSaveDialog(options?: ElectronSaveDialogOptionsDto): Promise<ElectronSaveDialogResultDto>
  showMessageBox(options: ElectronMessageBoxOptionsDto): Promise<ElectronMessageBoxResultDto>
}
```

### electron.pushNotifications

权限：`electron.pushNotifications`

```ts
interface PluginElectronPushNotificationsApi {
  registerForAPNSNotifications(): Promise<{ success: boolean; error?: string }>
  unregisterForAPNSNotifications(): Promise<void>
}
```

### electron.screen

权限：`electron.screen`

```ts
interface PluginElectronScreenApi {
  getCursorScreenPoint(): Promise<{ x: number; y: number }>
  getPrimaryDisplay(): Promise<ElectronDisplayDto>
  getAllDisplays(): Promise<ElectronDisplayDto[]>
  getDisplayNearestPoint(point: { x: number; y: number }): Promise<ElectronDisplayDto>
}
```

## 最小权限建议

常见插件类型的起始权限：

| 插件类型 | 建议权限 |
| --- | --- |
| 只注册 Unit，无额外逻辑 | `definitions` |
| 有编辑器并保存插件配置 | `definitions`, `store`, `ui` |
| 监听 Unit 按键或触摸事件 | `definitions`, `unit`, `logger` |
| Canvas Unit | `definitions`, `unit`, `logger` |
| 调用网络 API | `definitions`, `http`, `store`, `logger` |
| 读写本地文件 | `definitions`, `file`, `logger` |
| 访问剪贴板 | `definitions`, `electron.clipboard`, `ui` |
