# Unit 定义

插件的 Library 和 Unit 不写在 `manifest.json` 中，而是在插件后端运行时注册。FlexStudio 会把这些定义合并到资源面板和 Unit 创建流程中。

## Payload 结构

```ts
interface PluginDefinitionsPayload {
  libraries: PluginLibraryDefinition[]
  units: PluginUnitDefinitionRuntime[]
  revision?: string
}
```

插件通常在 `FlexPluginBase.getDefinitions()` 中返回 payload：

```ts
import { FlexPluginBase } from '@flexsdk/runtime'
import type { PluginDefinitionsPayload } from '@flexsdk/types'

export default class DemoPlugin extends FlexPluginBase {
  async getDefinitions(): Promise<PluginDefinitionsPayload> {
    const library = this.createDefaultLibrary({
      libraryUUID: '@acme/demo-plugin/main',
      name: 'Demo Plugin',
      icon: 'mdi-puzzle',
      categoryId: 'plugin',
    })

    return {
      libraries: [library],
      units: [
        this.createUnitTemplate({
          unitId: '@acme/demo-plugin/action-button',
          typeId: 'acme.action-button',
          name: 'Action Button',
          categoryId: 'plugin',
          libraryUUID: library.libraryUUID,
          hasFunctionEditor: true,
          hasAppearanceEditor: true,
          defaultData: {
            action: 'open-url',
            url: 'https://example.com',
          },
        }),
      ],
      revision: '1.0.0',
    }
  }
}
```

`createDefaultLibrary()` 和 `createUnitTemplate()` 会填充常用默认值，包括 `plugin.pluginUUID`、`plugin.pluginVersion` 和 `plugin.unitId`。

## Library Definition

```ts
interface PluginLibraryDefinition {
  libraryUUID: string
  name: string
  icon?: string
  categoryId?: string
}
```

| 字段 | 说明 |
| --- | --- |
| `libraryUUID` | Library 稳定 ID。一个插件可以有多个 Library。 |
| `name` | 在 Unit 浏览器中展示的 Library 名称。 |
| `icon` | 可选图标。通常使用 Material Design Icons 名称。 |
| `categoryId` | 可选分类 ID。 |

如果 payload 中有 Unit 但没有 Library，宿主会为插件生成一个默认 Library。不过为了可读性和可控排序，建议显式声明 Library。

## Unit Definition

```ts
interface PluginUnitDefinitionRuntime {
  unitId: string
  typeId: string
  name: string
  categoryId: string
  plugin: PluginUnit
  icon?: string
  hasFunctionEditor?: boolean
  hasAppearanceEditor?: boolean
  hasView?: boolean
  defaultData?: Record<string, any>
  platforms?: ('win32' | 'darwin' | 'linux')[]
  libraryUUID?: string
}
```

| 字段 | 说明 |
| --- | --- |
| `unitId` | 插件内稳定 Unit ID。必须与 `plugin.unitId` 一致。 |
| `typeId` | FlexStudio 中用于识别 Unit 类型的全局类型 ID。不同插件之间不能重复。 |
| `name` | Unit 显示名称。 |
| `categoryId` | Unit 分类 ID。 |
| `plugin` | 插件元数据，标记该 Unit 由哪个插件提供。 |
| `icon` | 可选图标。 |
| `hasFunctionEditor` | 是否提供功能编辑器页面。 |
| `hasAppearanceEditor` | 是否提供外观编辑器页面。 |
| `hasView` | 是否提供运行视图 iframe。 |
| `defaultData` | 创建 Unit 实例时的默认数据。 |
| `platforms` | Unit 支持的平台，使用 `win32`、`darwin`、`linux`。 |
| `libraryUUID` | Unit 所属 Library。省略时使用 payload 中第一个 Library。 |

## Plugin Unit Metadata

```ts
interface PluginUnit {
  type: 'standard' | 'custom' | 'canvas'
  pluginUUID: string
  pluginVersion: string
  unitId: string
}
```

| 字段 | 说明 |
| --- | --- |
| `type` | Unit 类型：`standard`、`custom` 或 `canvas`。 |
| `pluginUUID` | 注册该 Unit 的插件 UUID，必须与当前插件一致。 |
| `pluginVersion` | 当前插件版本。通常由 `FlexPluginBase` 从加载上下文填充。 |
| `unitId` | 插件内 Unit ID，必须与外层 `unitId` 一致。 |

## Unit 类型

### standard

`standard` 使用宿主默认 Unit 视图，可以选择提供功能编辑器和外观编辑器。

适合：

- 按钮、快捷操作、系统命令、HTTP 请求等逻辑型 Unit。
- 视觉结构可以由宿主默认外观系统表达的 Unit。

示例：

```ts
this.createUnitTemplate({
  unitId: '@acme/demo-plugin/open-url',
  typeId: 'acme.open-url',
  name: 'Open URL',
  categoryId: 'actions',
  hasFunctionEditor: true,
  hasAppearanceEditor: true,
})
```

### custom

`custom` 使用插件提供的 `unitView` iframe 渲染运行视图，必须设置 `hasView: true`。

适合：

- 需要完全自定义运行视图的 Unit。
- 需要在设备区域显示动态 HTML/CSS/Vue UI 的 Unit。

示例：

```ts
this.createUnitTemplate({
  unitId: '@acme/demo-plugin/weather-card',
  typeId: 'acme.weather-card',
  name: 'Weather Card',
  categoryId: 'widgets',
  plugin: {
    type: 'custom',
    pluginUUID: this.pluginUUID,
    pluginVersion: this.pluginVersion,
    unitId: '@acme/demo-plugin/weather-card',
  },
  hasFunctionEditor: true,
  hasView: true,
})
```

### canvas

`canvas` 不使用前端运行视图，也不能提供外观编辑器。插件后端在设备 Unit 加载后，通过 `hostApi.canvas.pushFrame()` 推送 PNG 帧，由宿主编码后发送到设备。

适合：

- 后端生成画面的动态显示。
- 需要精确控制像素输出的 Unit。
- 使用 native 或 Node canvas 渲染的场景。

限制：

- `hasView` 不能为 `true`。
- `hasAppearanceEditor` 不能为 `true`。
- 通常需要监听 Canvas Unit 的 `load` 和 `unload` 事件来启动和停止渲染循环。

示例：

```ts
this.createUnitTemplate({
  unitId: '@acme/demo-plugin/canvas-clock',
  typeId: 'acme.canvas-clock',
  name: 'Canvas Clock',
  categoryId: 'widgets',
  plugin: {
    type: 'canvas',
    pluginUUID: this.pluginUUID,
    pluginVersion: this.pluginVersion,
    unitId: '@acme/demo-plugin/canvas-clock',
  },
  hasFunctionEditor: true,
})
```

## 校验规则

FlexStudio 注册定义时会执行结构校验和一致性校验：

- payload 必须包含 `libraries` 和 `units` 数组。
- `libraryUUID` 不能重复。
- `unitId` 不能重复。
- `typeId` 在当前插件内不能重复，并且不能与其他已启用插件冲突。
- Unit 引用的 `libraryUUID` 必须存在。
- `plugin.pluginUUID` 必须等于当前注册插件 UUID。
- `plugin.unitId` 必须等于外层 `unitId`。
- `custom` Unit 必须设置 `hasView: true`。
- `canvas` Unit 不能设置 `hasView: true`。
- `canvas` Unit 不能设置 `hasAppearanceEditor: true`。

可以在构建或 CI 中使用 CLI 验证定义：

```bash
flexcli plugin-v2 validate --plugin-dir . --definitions ./dist/definitions.json
```

## defaultData

`defaultData` 会作为新建 Unit 实例的初始数据。功能编辑器和外观编辑器通常围绕这份数据读写。

建议：

- 使用可序列化 JSON。
- 为缺省字段提供明确默认值。
- 避免在 `defaultData` 中放入大体积二进制内容。
- 需要外观元素时，保持结构与 FlexStudio 的 Unit appearance 数据一致。

## 修改定义

常规做法是在 `getDefinitions()` 中返回完整定义，宿主会在插件加载后拉取。需要运行时替换定义时，可以调用：

```ts
await this.registerDefinitions(payload)
```

`registerDefinitions()` 会替换该插件此前注册的所有定义，因此传入的 payload 应包含当前插件希望暴露的完整 Library 与 Unit 集合。
