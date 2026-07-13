# 后端运行时

插件后端运行在 FlexStudio 启动的独立 Node.js 进程中。后端负责生命周期、定义注册、Host API 调用、设备事件处理、Canvas 推帧和前端 RPC。

## 依赖状态订阅

Dependency State Channel 的 Provider 注册/发布与 Consumer 订阅都应在 `onLoad()` 中、`await super.onLoad(ctx)` 之后尽早完成。Consumer 的 handler 在自身后端进程串行执行；SDK 会在 handler 成功或失败后 ACK。不要把 handler 传给 Host，也不要在 `onLoad()` 中等待 Provider 发布首个 snapshot。Provider 暂不可用时 Consumer 会收到 `unavailable`；Provider 重启后会收到更高 epoch 的 `available`，随后可能收到 replay snapshot。`onUnload()` 会自动 best-effort unsubscribe，本地也可保存并提前调用 unsubscribe。

## Renderer State Channel

同插件 UI 的持续状态在 `onLoad()` 注册并发布完整 snapshot：

```ts
await this.registerRendererStateChannel('runtime-status')
await this.publishRendererState('runtime-status', {
  kind: 'snapshot',
  payload: { status: 'ready', jobs: 0 }
})

// 状态变化时发布 delta；不要用定时轮询制造变化。
await this.publishRendererState('runtime-status', {
  kind: 'delta',
  payload: { jobs: 1 }
})
```

签名为 `registerRendererStateChannel(channel: string): Promise<void>` 与 `publishRendererState(channel: string, update: RendererStateUpdate): Promise<void>`。payload 必须是 JSON object，序列化后最多 **64 KiB**。Host 保留最新状态并为 Provider epoch 内的发布分配递增 revision。Provider 重启产生新 epoch；delta 不能跨 epoch 拼接。

wire 只携带 channel 与 update。插件 UUID 由后端进程身份推导，不能由插件伪造。Provider 沿用当前 `pluginApi` permission rule，必须与 capability registry 和对应测试一致。session 关闭时 Host 自动清理 renderer subscriptions。

## 入口类

推荐后端默认导出继承 `FlexPluginBase` 的类：

```ts
import { FlexPluginBase } from '@flexsdk/runtime'
import type { PluginDefinitionsPayload, PluginLoadContext } from '@flexsdk/types'

export default class DemoPlugin extends FlexPluginBase {
  async onLoad(ctx: PluginLoadContext): Promise<void> {
    await super.onLoad(ctx)
    this.logger.info('Plugin loaded')
  }

  async onUnload(): Promise<void> {
    this.logger.info('Plugin unloaded')
  }

  async getDefinitions(): Promise<PluginDefinitionsPayload> {
    return {
      libraries: [this.createDefaultLibrary({ name: 'Demo Plugin' })],
      units: [],
    }
  }
}
```

`FlexPluginBase` 会在 `onLoad()` 中保存：

- `this.hostApi`
- `this.logger`
- `this.pluginUUID`
- `this.pluginVersion`

如果覆盖 `onLoad()`，应先调用 `await super.onLoad(ctx)`。

## 生命周期

```ts
async onLoad(ctx: PluginLoadContext): Promise<void>
async onUnload(): Promise<void>
abstract getDefinitions(): Promise<PluginDefinitionsPayload>
```

生命周期顺序：

1. FlexStudio 启动插件后端进程。
2. 后端模块被加载并创建插件实例。
3. FlexStudio 调用 `onLoad(ctx)`。
4. FlexStudio 调用 `getDefinitions()` 拉取插件 Library 和 Unit 定义。
5. 插件运行，处理事件、RPC、Host API 调用。
6. 插件禁用、卸载或重载时，FlexStudio 调用 `onUnload()` 并关闭进程。

## 启动阶段建议

`onLoad()` 决定插件能否尽快进入可用状态。建议把它视为“接线和注册阶段”，而不是“把所有外部数据都准备好”的阶段。

建议顺序：

1. 先调用 `await super.onLoad(ctx)`。
2. 尽早注册 Renderer RPC、依赖 API、事件订阅和必要的清理逻辑。
3. 让 `getDefinitions()` 返回稳定的基础定义，或在确实需要时尽早 `registerDefinitions()`。
4. 把远端同步、目录扫描、首轮索引、全量缓存预热等慢任务放到后台。

尤其是带网络访问的插件，不要在 `onLoad()` 里等待远端登录、拉全量资源、扫完整目录或完成全量 provider 同步。更好的模式是：

- 先让插件后端启动成功。
- 先注册 definitions，让 Unit 和配置页尽快可见。
- 再用 `hostApi.jobs` 启动慢同步，并通过进度或 snackbar 告知用户。

如果插件确实需要更长的启动窗口，可以在 manifest 里设置 `runtime.startupTimeoutMs`，但这只是补充元数据，不是把慢任务塞进 `onLoad()` 的理由。

### WebSocket 生命周期

`hostApi.ws.connect()` 返回的 handle 属于当前插件后端进程。插件应尽量在 `onUnload()` 中主动调用 `close()` 关闭自己打开的 WebSocket，并取消已注册的消息监听，避免 reload 或 disable 时仍有业务逻辑继续处理旧连接消息。

如果插件没有主动关闭，FlexStudio 也会在插件进程停止时强制关闭该插件剩余的 sockets，包括插件卸载、禁用、重载、崩溃或进程退出等场景。
## Unit 迁移 Hook

插件更新后，旧项目里已经添加的插件 Unit 不会重新用 `defaultData` 创建。FlexStudio 会扫描当前项目 preset 中的旧版本插件 Unit，并在插件后端启用后调用可选的 `migrateUnit()` 实例方法。插件未实现该方法时视为 no-op，宿主仍会把 Unit 的 `plugin.pluginVersion` 更新到目标版本。

触发场景：

- 用户在插件市场更新插件后，立即迁移当前项目中该插件的旧版本 Unit。
- 打开项目时，preset 的 `pluginDependencies` 快照显示本机已安装插件版本高于项目内 Unit 版本。

建议签名：

```ts
import type {
  PluginUnitMigrationHookResult,
  PluginUnitMigrationRequest,
} from '@flexsdk/types'

export default class DemoPlugin extends FlexPluginBase {
  async migrateUnit(
    request: PluginUnitMigrationRequest,
  ): Promise<PluginUnitMigrationHookResult> {
    if (request.unitId !== '@acme/demo-plugin/action-button') return undefined

    const data = request.originalUnit.data as { schemaVersion?: number; label?: string }
    if ((data.schemaVersion ?? 1) >= 2) return undefined

    return {
      data: {
        ...data,
        schemaVersion: 2,
        label: data.label ?? 'Action',
      },
    }
  }
}
```

`PluginUnitMigrationRequest` 包含：

| 字段 | 说明 |
| --- | --- |
| `itemId` | 宿主生成的迁移项 ID，用于批量结果关联。 |
| `originalUnit` | 旧 Unit 的完整快照。不要直接修改这个对象。 |
| `fromVersion` | Unit 中记录的旧 `plugin.pluginVersion`。 |
| `toVersion` | 当前已安装插件版本，也就是迁移目标版本。 |
| `pluginUUID` | 当前插件 UUID。 |
| `unitId` | 插件内 Unit ID。 |
| `typeId` | FlexStudio 全局 Unit 类型 ID。 |

返回值可以是：

| 返回值 | 含义 |
| --- | --- |
| `undefined` / `null` | 不修改数据；宿主只更新 `plugin.pluginVersion`。 |
| `{ data }` | 只替换 `unit.data`；宿主保留 uuid、typeId、geometry、config、appearance 和插件身份，并更新 `plugin.pluginVersion`。 |
| `{ unit }` | 返回完整 Unit。宿主会校验它不能改变 `uuid`、`typeId`、`plugin.pluginUUID`、`plugin.unitId` 和 `geometry`，并覆盖 `plugin.pluginVersion` 为目标版本。 |

迁移 Hook 按 Unit 调用。单个 Unit 抛错或返回非法结构时，只会让该 Unit 迁移失败，其他 Unit 继续处理；宿主会向用户显示失败摘要，失败的 Unit 保持原数据。迁移逻辑应保持幂等，建议在 `unit.data` 中维护插件自己的 `schemaVersion`，并按 `fromVersion`、`toVersion` 和 `schemaVersion` 分支处理。

## 日志

后端可以使用 `this.logger`：

```ts
this.logger.debug('debug message')
this.logger.info('plugin started')
this.logger.warn('retrying request')
this.logger.error('request failed', { error: err })
```

前端 iframe 中通过 bridge logger 写出的日志会转发到插件后端日志，并带有 `[Web]` 前缀。

CLI 可以查看日志：

```bash
flexcli plugin-v2 logs @acme/demo-plugin
```

## 定义注册

常规做法是在 `getDefinitions()` 中返回完整定义。需要运行时替换定义时，可以调用：

```ts
await this.registerDefinitions(payload)
```

`registerDefinitions()` 需要 `definitions` 权限，并会替换当前插件此前注册的所有定义。

对需要慢同步的插件，推荐先注册一版最小可用定义，再在后台 job 完成后按需刷新。这样用户可以更早看到插件条目和基础编辑器，而不是等待远端同步结束。

辅助方法：

```ts
const library = this.createDefaultLibrary({
  name: 'Demo Plugin',
})

const unit = this.createUnitTemplate({
  unitId: '@acme/demo-plugin/open-url',
  typeId: 'acme.open-url',
  name: 'Open URL',
  categoryId: 'actions',
})
```

## 配置存储

插件可以通过插件级配置文件保存设置：

```ts
const config = await this.loadConfig({
  apiBaseUrl: 'https://example.com',
})

config.apiBaseUrl = 'https://api.example.com'
await this.saveConfig(config)
```

`loadConfig()` 和 `saveConfig()` 需要 `store` 权限。配置保存在插件自己的数据目录中，不需要开发者直接处理文件路径。

## Chart 数据源 Helper

`FlexPluginBase` 提供 Chart 数据源 helper，减少直接拼接 `hostApi.chart` 调用。插件需要在 manifest 中声明 `chart` 权限。

实时数据只保存在 host runtime cache 中；不要写入 `defaultData` 或项目文件。`publishChartEntries()` 每次发布的是整个 data source 快照，插件可以用 `groupPath` 继续细分 entries。

```ts
await this.registerChartDataSource({
  sourceId: 'metrics',
  name: 'Metrics',
  icon: 'mdi-chart-line',
})

await this.publishChartEntries('metrics', [
  {
    key: 'requests-per-second',
    name: 'Requests/s',
    type: 'Throughput',
    rawValue: 128,
    groupPath: ['HTTP'],
    unit: 'req/s',
  },
])

await this.unregisterChartDataSource('metrics')
```

## Renderer RPC

前端 iframe 可以通过 `backendRpc()` 调用后端注册的方法。后端注册 RPC：

```ts
async onLoad(ctx: PluginLoadContext): Promise<void> {
  await super.onLoad(ctx)

  this.registerRendererRpc('lookupUser', async (id: string) => {
    return { id, name: 'Ada' }
  })
}
```

前端调用：

```ts
const user = await bridge.backendRpc('lookupUser', ['42'])
```

取消注册：

```ts
this.unregisterRendererRpc('lookupUser')
```

RPC handler 必须返回可序列化结果。抛出的错误会返回给前端调用方。

## 后台任务模式

对远端 provider 同步、本地资源扫描、系统自动化索引或长时导入任务，推荐使用 `hostApi.jobs`：

- `onLoad()` 只完成快速初始化。
- 把慢任务放到异步函数中启动。
- 用 `jobs.update()` 汇报进度和状态消息。
- 定期轮询 `jobs.isCancellationRequested()`，在清理后调用 `jobs.cancel(jobId)`。

这类任务的数据和自动化业务逻辑仍属于插件自身或其 native helper；FlexStudio core 只负责生命周期、权限、运行时 API 和任务记录。

## 插件依赖 API

后端可以通过 `registerDependencyApi()` 向直接依赖自己的插件暴露 API：

```ts
async onLoad(ctx: PluginLoadContext): Promise<void> {
  await super.onLoad(ctx)

  this.registerDependencyApi('getStatus', async () => {
    return { healthy: true }
  })
}
```

需要调用依赖插件时，使用 `this.hostApi.plugin.callDependency()`：

```ts
const status = await this.hostApi.plugin.callDependency(
  '@acme/base-plugin',
  'getStatus',
)
```

调用方必须在 manifest 中声明目标插件为直接依赖，并声明 `pluginApi` 权限。只暴露 API、不调用其他插件的插件不需要 `pluginApi`。完整说明见 [插件依赖 API](./dependency-api.md)。

## 事件总线

后端可以订阅宿主事件：

```ts
await this.on('device.connection.changed', async (event) => {
  this.logger.info('device changed', event.payload)
})
```

支持通配符，但插件 Unit 运行时事件不要通过原始 `device.plugin.*` wildcard 订阅；这类事件按 Unit owner 隔离，应使用后面的 Unit helper。

```ts
await this.on('device.connection.*', async (event) => {
  this.logger.info('device connection event', event.topic)
})
```

`*` 匹配一个点分段，`**` 匹配一个或多个分段。

订阅时可以请求快照：

```ts
await this.on('device.connection.changed', handler, { snapshot: true })
```

取消订阅需要传入同一个 handler 引用：

```ts
await this.off('device.connection.changed', handler)
```

只触发一次：

```ts
await this.once('device.connection.changed', handler)
```

原始事件总线需要 `bus` 权限。

## Unit 事件

如果只需要 Unit 事件，可以使用 Unit helper。它需要 `unit` 权限，不需要完整 `bus` 权限。

支持的事件：

```ts
type UnitDeviceEventType = 'load' | 'unload' | 'touch' | 'pressed' | 'released' | 'changed'
```

示例：

```ts
const handler = async (event) => {
  this.logger.info('pressed', event.payload)
}

await this.onUnitEvent('acme.open-url', 'pressed', handler)
await this.offUnitEvent('acme.open-url', 'pressed', handler)
```

## Canvas Unit

Canvas Unit 由后端推送 PNG 帧到宿主：

```ts
const cleanupLoad = await this.onCanvasUnitLoad('acme.canvas-clock', async (event) => {
  const { serialNumber, uuid, pixelWidth, pixelHeight } = event
  const pngBuffer = await renderPng(pixelWidth, pixelHeight)
  await this.hostApi.canvas.pushFrame(serialNumber, uuid, pngBuffer)
})

const cleanupUnload = await this.onCanvasUnitUnload('acme.canvas-clock', async (event) => {
  this.logger.info('canvas unit unloaded', event)
})
```

`pushFrame()` 要求传入 PNG Buffer。宿主会在尺寸不一致时自动缩放，再编码为 JPEG 发送到设备。超过每个 Unit 60fps 的帧会被丢弃。

当 `pushFrame()` 抛出 Canvas 终止类错误时，应停止对应 Unit 的渲染循环。SDK 提供：

```ts
import { isCanvasPushTerminalError } from '@flexsdk/runtime'

if (isCanvasPushTerminalError(error)) {
  stopRenderLoop()
}
```

## Host API 访问

后端可以通过 `this.hostApi` 访问宿主能力：

```ts
const platform = await this.hostApi.system.getPlatform()
const exists = await this.hostApi.file.exists('/tmp/demo.txt')
await this.hostApi.ui.showSnackbarMessage({
  message: 'Done',
  type: 'success',
})
```

所有 Host API 都受 manifest 权限控制。未声明权限时调用会失败。

完整方法列表见 [Host API Reference](./host-api-reference.md)。

## 实用导出

`@flexsdk/runtime` 常用导出：

| 导出 | 用途 |
| --- | --- |
| `FlexPluginBase` | 后端基类。 |
| `validatePluginDefinitionsPayload` | 校验 definitions payload。 |
| `PLUGIN_DEFINITIONS_JSON_SCHEMA` | definitions JSON Schema。 |
| `createPluginLogger` | 创建插件 logger。 |
| `matchPluginTopicPattern` | 测试一个 topic 是否匹配通配符 pattern。 |
| `matchPluginTopicAgainstPatterns` | 测试 topic 是否匹配多个 pattern。 |
| `isCanvasPushTerminalError` | 判断 Canvas 推帧错误是否应停止渲染循环。 |

<!-- plugin-cycled-slider:start -->
## Plugin cycled / slider / button-group Runtime Helpers

`FlexPluginBase` 提供 Unit runtime helper，减少直接拼 Host API 调用；Button Group 状态读取/写入直接使用 `this.hostApi.unit` 中的 API。

```ts
await this.onUnitEvent('acme.media.playback', 'pressed', async (event) => {
  const payload = event.payload as any
  await this.setUnitRuntimeStatus(payload.serialNumber, payload.uuid, 'disabled')
  await this.setUnitFunction(payload.serialNumber, payload.uuid, 'pause')
})

await this.onSliderUnitChanged('acme.media.volume', async (payload) => {
  await mediaPlayer.setVolume(payload.value)
  await this.setUnitSliderValue(payload.serialNumber, payload.uuid, payload.value)
})

await this.onUnitEvent('acme.media.source', 'changed', async (event) => {
  const payload = event.payload as {
    serialNumber: string
    uuid: string
    activeButtonIds: string[]
    changedButtonId?: string
  }
  await mediaRouter.selectInputs(payload.activeButtonIds)
})

await this.hostApi.unit.setButtonGroupState(serialNumber, unitUuid, ['hdmi'])
const activeButtonIds = await this.hostApi.unit.getButtonGroupState(serialNumber, unitUuid)
```

`onSliderUnitChanged()` 接收宿主规范化后的 slider payload，包含 `value`、`phase`、`min`、`max`、`step`、`format`、`displayText`、`data` 和 `serialNumber`。

`setUnitRuntimeStatus(serialNumber, unitUuid, status)` 可设置 `enabled`、`disabled`、`warning`、`loading` 四种设备端运行时状态。`disabled` 会在设备端阻断交互，`warning` 只显示告警角标。

- `loading`：设备端显示居中的 loading spinner，并阻断该 Unit 的设备交互；适合短时异步动作。动作完成后插件必须显式恢复为 `enabled`、`warning` 或 `disabled`。

短时异步动作应先进入 `loading`，再使用 `try/finally` 保证状态收敛；显式设备动作的结果可以通过 `hostApi.device.showSnackbarMessage()` 告知发起设备。`cycled` 的建议流程是：监听 `pressed` 或 `touch` -> 执行业务动作 -> 成功后调用 `setUnitFunction(serialNumber, unitUuid, functionId)`。宿主和设备不会自动切换 plugin `cycled` 状态。

```ts
await this.setUnitRuntimeStatus(serialNumber, unitUuid, 'loading')
let finalStatus: 'enabled' | 'warning' = 'warning'
try {
  await runAction()
  finalStatus = 'enabled'
  void this.hostApi.device.showSnackbarMessage(serialNumber, {
    message: 'Action completed',
    type: 'success',
  }).catch(() => undefined)
} catch (error) {
  void this.hostApi.device.showSnackbarMessage(serialNumber, {
    message: 'Action failed',
    type: 'error',
  }).catch(() => undefined)
  throw error
} finally {
  await this.setUnitRuntimeStatus(serialNumber, unitUuid, finalStatus)
}
```

`button-group` 的建议流程是：监听 `changed` -> 根据 `activeButtonIds` 执行业务动作；需要由插件主动恢复或切换状态时，调用 `hostApi.unit.setButtonGroupState(serialNumber, unitUuid, activeButtonIds)`。SDK 会通过 Host API 校验按钮 ID、单选/多选和 mandatory 约束。
<!-- plugin-cycled-slider:end -->
