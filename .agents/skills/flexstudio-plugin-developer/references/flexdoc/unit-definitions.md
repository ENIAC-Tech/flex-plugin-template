# Unit 定义

插件的 Library 和 Unit 不写在 `manifest.json` 中，而是在插件后端运行时注册。FlexStudio 会把这些定义合并到资源面板和 Unit 创建流程中。

## Payload 结构

```ts
interface PluginDefinitionsPayload {
  libraries: PluginLibraryDefinition[]
  units: PluginUnitDefinitionRuntime[]
  builtinUnits?: PluginBuiltinUnitTemplate[]
  revision?: string
}
```

`libraries` 和 `units` 注册插件自有 Unit；`builtinUnits` 用来把预配置的普通内置 Unit 模板放进同一个 Unit 浏览器分组。`builtinUnits` 里的条目不是新的插件 Unit 类型，也不会让宿主把该 `typeId` 标记为插件所有。

插件通常在 `FlexPluginBase.getDefinitions()` 中返回 payload：

```ts
import { FlexPluginBase, unitTemplate } from '@flexsdk/runtime'
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
          hasAppearanceEditor: false,
          defaultData: {
            action: 'open-url',
            url: 'https://example.com',
          },
        }),
      ],
      builtinUnits: [
        this.createBuiltinUnitTemplate(unitTemplate, {
          uuid: '@acme/demo-plugin/media-play-template',
          typeId: '@eniacelec/media:media-key',
          name: 'Play/Pause Key',
          icon: 'mdi-play-pause',
          data: {
            keyId: 'play-pause',
            hidCode: 0x00CD,
          },
        }),
      ],
      revision: '1.0.0',
    }
  }
}
```

`createDefaultLibrary()` 和 `createUnitTemplate()` 会填充常用默认值，包括 `plugin.pluginUUID`、`plugin.pluginVersion` 和 `plugin.unitId`。helper 会保留 `interactionMode` 与 `defaultActivation`；`standard` 使用宿主外观编辑器，只有 `custom` 可以声明 `hasAppearanceEditor: true`。

`builtinUnits` 的根节点必须是普通内置 Unit，不允许 `plugin`。容器子节点可以是插件 Unit，其 `pluginUUID`、`pluginVersion`、`unitId` 与 `type` 必须匹配同一 payload 中注册的 definition；`createBuiltinUnitTemplate()` 仅移除根节点元数据，保留子节点的插件归属。整棵 builtin 模板树的 UUID 必须唯一。

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

## Built-in Unit Templates

`builtinUnits` 提供的是完整的普通内置 Unit 模板。它适合插件把常用的宿主内置 Unit 预设暴露给用户，例如预配置的媒体键、快捷键、执行命令或布局容器。用户把模板拖入项目后，得到的是普通内置 Unit，不会调用插件后端，也不会写入 `Unit.plugin` 依赖元数据。

规则：

- `typeId` 必须指向宿主已经注册的内置 Unit 类型，例如 `@eniacelec/media:media-key`。
- 模板必须是完整 Unit 结构，至少包含 `uuid`、`typeId`、`name`、`icon`、`config`、`geometry`、`appearance` 和 `data`。
- 顶层和 `data.layoutData` 嵌套 Unit 都不能包含 `plugin` 字段；SDK 的 `createBuiltinUnitTemplate()` 会递归移除插件元数据。
- `uuid` 必须稳定且在当前 payload 内唯一，不能与插件自有 Unit 生成的 `plugin-template-${typeId}` 冲突。
- 同一个 payload 可以同时包含插件自有 `units` 和普通内置 `builtinUnits`；渲染进程仍通过同一个 active units 查询接口读取，内置模板行会标记为 `kind: 'builtin'`。
- 已放入项目的内置模板不依赖插件运行时。插件被禁用或卸载后，已创建的普通内置 Unit 仍按宿主内置逻辑工作。

## Unit Definition

```ts
interface PluginUnitDefinitionRuntime {
  unitId: string
  typeId: string
  name: string
  categoryId: string
  plugin: PluginUnit
  interactionMode?: 'click' | 'continuous' | 'display'
  defaultActivation?: PluginUnitDefaultActivationConfig
  icon?: string
  hasFunctionEditor?: boolean
  hasAppearanceEditor?: boolean
  hasView?: boolean
  appearanceOverride?: PluginAppearanceOverride
  functions?: PluginUnitDefinitionCycledFunction[]
  slider?: PluginUnitDefinitionSliderConfig
  valueLabel?: PluginUnitDefinitionValueLabelConfig
  label?: PluginUnitDefinitionLabelConfig
  buttonGroup?: PluginButtonGroupDefinition
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
| `interactionMode` | Unit 的宿主交互模式：`click`、`continuous` 或 `display`。 |
| `defaultActivation` | 新建 click-capable Unit 的默认激活方式；用户之后仍可在宿主中覆盖。 |
| `icon` | 可选图标。 |
| `hasFunctionEditor` | 是否提供功能编辑器页面。 |
| `hasAppearanceEditor` | 是否提供外观编辑器页面。 |
| `hasView` | 是否提供运行视图 iframe。 |
| `appearanceOverride` | 可选宿主默认外观覆盖。 |
| `functions` | `cycled` Unit 的固定函数列表。 |
| `slider` | `slider` Unit 的数值范围、步进和显示格式。 |
| `valueLabel` | `value-label` Unit 的 format/custom 模式配置。 |
| `label` | `label` Unit 的设备端 TTF 字体配置。 |
| `buttonGroup` | `button-group` Unit 的按钮列表、选择模式、默认激活项和统一外观配置。 |
| `defaultData` | 创建 Unit 实例时的默认数据。 |
| `platforms` | Unit 支持的平台，使用 `win32`、`darwin`、`linux`。 |
| `libraryUUID` | Unit 所属 Library。省略时使用 payload 中第一个 Library。 |

`defaultActivation` 的结构如下：

```ts
interface PluginUnitDefaultActivationConfig {
  mode: 'tap' | 'hold'
  holdDurationMs?: number
}
```

接受的默认激活形式为 tap 的 `{ mode: 'tap' }`，以及 hold 的 `{ mode: 'hold' }` 或 `{ mode: 'hold', holdDurationMs }`。省略 `holdDurationMs` 时，宿主使用 800 毫秒；显式提供时，值必须在 300–3000 毫秒之间，并使用 100 毫秒步进。`defaultActivation` 只能用于可点击的 Unit；`standard` 和 `custom` Unit 需要同时声明 `interactionMode: 'click'`，`display` 和 `continuous` Unit 不能声明它。

下面的定义让新建的 Start Commercial Unit 默认需要按住 800 毫秒确认：

```ts
{
  unitId: 'start-commercial',
  typeId: '@aspen/plugin/start-commercial',
  name: { default: 'Start Commercial', translations: { zh: '开始广告' } },
  categoryId: 'streaming',
  icon: 'mdi-advertisements',
  hasFunctionEditor: true,
  hasAppearanceEditor: false,
  hasView: false,
  visibleInLibrary: true,
  libraryUUID: '@aspen/plugin-twitch-creator-tools/creator-tools',
  platforms: ['win32', 'darwin', 'linux'],
  plugin: {
    type: 'standard',
    pluginUUID: '@aspen/plugin-twitch-creator-tools',
    pluginVersion: '1.0.0',
    unitId: 'start-commercial',
  },
  interactionMode: 'click',
  defaultActivation: { mode: 'hold', holdDurationMs: 800 },
  defaultData: { schemaVersion: 1, durationSeconds: 30 },
}
```

这个默认值只在用户从 Library 新建 Unit 时写入 `unit.config.activation`，不会改写已有 Unit。创建后，用户可以在宿主的交互设置中改成 tap、调整长按时长或恢复其他受支持配置。插件必须只响应宿主发出的 canonical activation 事件；不要监听 raw pressed/released 并自行实现计时器，也不要把 activation 配置塞进 `defaultData`。

## Plugin Unit Metadata

```ts
interface PluginUnit {
  type: 'standard' | 'custom' | 'canvas' | 'cycled' | 'slider' | 'value-label' | 'label' | 'button-group' | 'panel'
  pluginUUID: string
  pluginVersion: string
  unitId: string
}
```

| 字段 | 说明 |
| --- | --- |
| `type` | Unit 类型：`standard`、`custom`、`canvas`、`cycled`、`slider`、`value-label`、`label`、`button-group` 或 `panel`。 |
| `pluginUUID` | 注册该 Unit 的插件 UUID，必须与当前插件一致。 |
| `pluginVersion` | 当前插件版本。通常由 `FlexPluginBase` 从加载上下文填充。 |
| `unitId` | 插件内 Unit ID，必须与外层 `unitId` 一致。 |

## Unit 数据版本与迁移

`defaultData` 只影响新建 Unit，不会自动改写项目里已经存在的 Unit。插件发布新版本时，如果 `unit.data` 的结构发生破坏性变化，应在数据中维护插件自己的 schema 版本，并在后端实现 `migrateUnit()`。

推荐写法：

```ts
this.createUnitTemplate({
  unitId: '@acme/demo-plugin/action-button',
  typeId: 'acme.action-button',
  name: 'Action Button',
  categoryId: 'actions',
  defaultData: {
    schemaVersion: 2,
    label: 'Action',
    action: 'open-url',
  },
})
```

宿主不会推断旧数据结构，也不会根据新的 `defaultData` 自动补字段。迁移由插件自己的 `migrateUnit(request)` 决定：常见场景返回 `{ data }`，只替换 `unit.data`；只有确实需要改 `name`、`icon`、`config` 或 `appearance` 时才返回完整 `{ unit }`。

迁移结果必须保持 Unit 身份和布局稳定：不能改变 `uuid`、`typeId`、`plugin.pluginUUID`、`plugin.unitId` 或 `geometry`。迁移成功后，宿主会把 `unit.plugin.pluginVersion` 更新到当前插件版本，并刷新 preset 的 `pluginDependencies` 快照。

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
- `value-label` Unit 必须设置 `valueLabel`，不能设置 `functions`、`slider`、`label`、`buttonGroup` 或 `hasView: true`。
- `label` Unit 必须设置 `label`，不能设置 `functions`、`slider`、`valueLabel`、`buttonGroup` 或 `hasView: true`。
- `button-group` Unit 必须设置 `buttonGroup`，不能设置 `functions`、`slider`、`valueLabel`、`label`、顶层 `appearanceOverride` 或 `hasView: true`。
- 其它 Unit 类型不能携带不属于自身类型的 `functions`、`slider`、`valueLabel`、`label` 或 `buttonGroup` 配置。

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

<!-- plugin-cycled-slider:start -->
## Plugin cycled、slider、value-label、label 与 button-group Unit

`PluginUnit.type` 支持：

```ts
type PluginUnitType =
  | 'standard'
  | 'custom'
  | 'canvas'
  | 'cycled'
  | 'slider'
  | 'value-label'
  | 'label'
  | 'button-group'
```

`PluginUnitDefinitionRuntime` 额外支持：

```ts
interface PluginUnitDefinitionRuntime {
  appearanceOverride?: PluginAppearanceOverride
  functions?: PluginUnitDefinitionCycledFunction[]
  slider?: PluginUnitDefinitionSliderConfig
  valueLabel?: PluginUnitDefinitionValueLabelConfig
  label?: PluginUnitDefinitionLabelConfig
  buttonGroup?: PluginButtonGroupDefinition
}

interface PluginUnitDefinitionCycledFunction {
  functionId: string
  name?: string
  data?: Record<string, any>
  appearanceOverride?: PluginAppearanceOverride
}

interface PluginUnitDefinitionSliderConfig {
  format: string
  min: number
  max: number
  step?: number
}

type PluginUnitDefinitionValueLabelConfig =
  | { mode: 'format'; format: string; customCharacters?: string }
  | { mode: 'custom'; customCharacters?: string }

interface PluginUnitDefinitionLabelConfig {
  fontFamily: 'puhuiti' | 'consola'
}

interface PluginButtonGroupDefinition {
  buttons: PluginButtonGroupButtonDefinition[]
  selectionMode?: 'single' | 'multiple'
  mandatory?: boolean
  displayMode?: 'text' | 'icon' | 'icon-text'
  defaultActiveButtonIds?: string[]
  inactiveBackgroundColor?: string
  foregroundColor?: string
  activeColor?: string
}

interface PluginButtonGroupButtonDefinition {
  buttonId: string
  name?: string
  data?: Record<string, any>
  appearanceOverride?: PluginAppearanceOverride
}
```

### appearanceOverride

`appearanceOverride` 是对宿主默认外观的字段覆盖，不需要提供完整 `baseAppearance`。宿主在构建默认 Unit 时先创建默认外观，再应用插件提供的 override。

`elements` 是数组，覆盖规则不同于普通对象：

- override element 带 `identifier` 时，必须匹配默认外观中已有的 element，并只覆盖提供的字段。
- override element 不带 `identifier` 时，表示追加一个完整新 element。
- 带未知 `identifier` 的覆盖会被定义校验拒绝。

该机制适用于 `standard`、`slider`、`value-label`、`label`，以及 `cycled.functions[].appearanceOverride` 和 `buttonGroup.buttons[].appearanceOverride`。`button-group` 不接受顶层 `appearanceOverride`，因为每个按钮需要单独绑定外观；统一布局、配色和显示模式由 Button Group 编辑器和 `buttonGroup` 配置维护。`value-label` 和 `label` 的 primary text / primary icon 是设备端运行时元素；外观覆盖可以调整它们的位置、字号、颜色等样式，但设备预渲染 PNG 不会把这两个元素画进去。

### cycled

`cycled` 是插件控制的多状态按键，适合播放/暂停、模式切换等场景。

```ts
this.createUnitTemplate({
  unitId: '@acme/media/playback',
  typeId: 'acme.media.playback',
  name: 'Playback',
  categoryId: 'media',
  plugin: {
    type: 'cycled',
    pluginUUID: this.pluginUUID,
    pluginVersion: this.pluginVersion,
    unitId: '@acme/media/playback',
  },
  hasFunctionEditor: true,
  functions: [
    {
      functionId: 'play',
      name: 'Play',
      data: { command: 'play' },
      appearanceOverride: {
        elements: [
          { identifier: 'title', text: 'Play' },
        ],
      },
    },
    {
      functionId: 'pause',
      name: 'Pause',
      data: { command: 'pause' },
      appearanceOverride: {
        elements: [
          { identifier: 'title', text: 'Pause' },
        ],
      },
    },
  ],
})
```

规则：

- `functions` 必填，且至少包含两个函数。
- 每个函数必须有稳定且唯一的 `functionId`。
- 前端不能新增、删除或排序函数。
- 用户可以通过宿主已有外观编辑器修改每个函数的外观。
- 函数外观不是 `data` 的一部分；运行时结构与内置 `cycled-key` 保持一致。
- 插件函数编辑器通过 bridge 读取和写入当前选中函数的 `data`。

设备点击 plugin `cycled` Unit 时，宿主不会自行切换状态。插件业务处理成功后调用 `hostApi.unit.setFunction(serialNumber, unitUuid, functionId)` 更新设备状态；失败时应使用通知 API 报错。

### button-group

`button-group` 是插件控制的按键组，适合输入源、模式、配置项、过滤条件等单选或多选状态切换。它复用内置 Button Group 的外观和状态结构，不需要插件提供 iframe 运行视图。

```ts
this.createUnitTemplate({
  unitId: '@acme/media/source',
  typeId: 'acme.media.source',
  name: 'Input Source',
  categoryId: 'media',
  plugin: {
    type: 'button-group',
    pluginUUID: this.pluginUUID,
    pluginVersion: this.pluginVersion,
    unitId: '@acme/media/source',
  },
  hasFunctionEditor: true,
  buttonGroup: {
    selectionMode: 'single',
    mandatory: true,
    displayMode: 'icon-text',
    inactiveBackgroundColor: '#111827',
    foregroundColor: '#e5e7eb',
    activeColor: '#22c55e',
    defaultActiveButtonIds: ['hdmi'],
    buttons: [
      {
        buttonId: 'hdmi',
        name: 'HDMI',
        data: { source: 'hdmi' },
        appearanceOverride: {
          elements: [
            { identifier: 'title', text: 'HDMI' },
          ],
        },
      },
      {
        buttonId: 'usb',
        name: 'USB',
        data: { source: 'usb' },
        appearanceOverride: {
          elements: [
            { identifier: 'title', text: 'USB' },
          ],
        },
      },
    ],
  },
})
```

规则：

- `buttonGroup.buttons` 必填，且至少包含两个按钮。
- 每个按钮必须有稳定、非空且唯一的 `buttonId`。
- `selectionMode` 默认为 `single`；`multiple` 允许同时激活多个按钮。
- `mandatory` 默认为 `true`。启用 mandatory 时至少要有一个激活按钮；未声明 `defaultActiveButtonIds` 时默认激活第一个按钮。
- `defaultActiveButtonIds` 只接受已声明的 `buttonId`；`single` 模式最多一个激活项。
- `displayMode` 默认为 `icon-text`，可统一设置为 `text`、`icon` 或 `icon-text`。
- `inactiveBackgroundColor`、`foregroundColor` 和 `activeColor` 分别控制未激活背景、前景和激活颜色。
- 不允许设置顶层 `appearanceOverride`；按钮外观使用 `buttonGroup.buttons[].appearanceOverride`。用户在宿主编辑器里调整其中一个按钮的布局或配色时，宿主会按内置 Button Group 规则同步其它按钮，保持组内一致。
- 按钮业务数据使用 `buttonGroup.buttons[].data`。插件函数编辑器通过 bridge 读写当前按钮的 `pluginData`，不要把 `appearance` 放入 `data`。
- 不能设置 `hasView: true`。运行视图由宿主提供，插件通过 Host API 读取/设置激活状态并监听 `changed` 事件。

插件可调用 `hostApi.unit.getButtonGroupState(serialNumber, unitUuid)` 读取当前激活按钮 ID 列表，调用 `hostApi.unit.setButtonGroupState(serialNumber, unitUuid, activeButtonIds)` 主动更新状态。设备端交互产生的状态变化会通过 `unit.on(typeId, 'changed')` 发送给拥有该 Unit 的插件。

### slider

`slider` 是插件控制的数值滑块，适合音量、亮度、温度等场景。

```ts
this.createUnitTemplate({
  unitId: '@acme/media/volume',
  typeId: 'acme.media.volume',
  name: 'Volume',
  categoryId: 'media',
  plugin: {
    type: 'slider',
    pluginUUID: this.pluginUUID,
    pluginVersion: this.pluginVersion,
    unitId: '@acme/media/volume',
  },
  slider: {
    format: '%0.1f %%',
    min: 0,
    max: 100,
    step: 0.1,
  },
  defaultData: {
    value: 50,
  },
})
```

规则：

- `slider` 配置必填。
- `format` 使用一个 C-style 数字占位符，例如 `%0.1f %%`。
- 不再使用 `decimals` 字段；显示精度从 `format` 中解析。
- `min` 和 `max` 必须是有限数字，且 `min < max`。
- `step` 可选；省略时宿主根据 `format` 的精度推断。
- `step` 必须为正数，不能大于范围，并且必须能按显示精度整除范围。
- 宿主和 SDK 会把值夹取并量化为 `min + round((value - min) / step) * step`。

插件监听设备滑动事件后执行业务逻辑，并可调用 `hostApi.unit.setSliderValue(serialNumber, unitUuid, value)` 更新设备显示。

### value-label

`value-label` 是插件控制的数值显示 Unit。它没有 slider 的激活态和拖动事件；插件只需要在后端发送数值或数值型字符串，设备端使用宿主预生成的 atlas 本地绘制 primary text，因此不需要用 `custom` 或 `canvas` 实时推图。

`value-label` 有两种模式：

- `format`：`format` 必填，使用一个 C-style `%f` 数字占位符，例如 `%0.1f C`。运行时只接受有限 `number`；宿主格式化后把最终 `displayText` 发给设备。charset 自动由 `0123456789.-` 加 format 字面量生成，忽略 `customCharacters`。
- `custom`：运行时接受 `number | string`。charset 由 `0123456789.` 加用户声明的 `customCharacters` 生成；最多允许 128 个去重后的自定义 grapheme。运行时文本中 atlas 缺失的字符不会导致更新失败，设备端显示方框占位。

```ts
this.createUnitTemplate({
  unitId: 'temperature',
  typeId: '@demo/sensors:temperature',
  name: 'Temperature',
  categoryId: '@demo/sensors',
  plugin: {
    type: 'value-label',
    pluginUUID: this.pluginUUID,
    pluginVersion: this.pluginVersion,
    unitId: 'temperature',
  },
  valueLabel: { mode: 'format', format: '%0.1f C' },
  defaultData: { value: 23.5 },
})
```

```ts
this.createUnitTemplate({
  unitId: 'status-code',
  typeId: '@demo/sensors:status-code',
  name: 'Status Code',
  categoryId: '@demo/sensors',
  plugin: {
    type: 'value-label',
    pluginUUID: this.pluginUUID,
    pluginVersion: this.pluginVersion,
    unitId: 'status-code',
  },
  valueLabel: { mode: 'custom', customCharacters: '-%NA' },
  defaultData: { value: 'N/A' },
})
```

规则：

- `valueLabel` 配置必填。
- 不能同时声明 `functions`、`slider`、`label` 或 `buttonGroup`。
- 不能设置 `hasView: true`。
- primary text 和 primary icon 由设备端运行时绘制；预渲染 PNG 只包含背景、边框、图片和非 primary 元素。
- `value-label` 不新增设备端 `changed` 事件。插件通过 `hostApi.unit.setValueLabelData()` 和 `hostApi.unit.setUnitIcon()` 主动更新设备显示。

### label

`label` 是插件控制的 Unicode 文本显示 Unit。它不使用 atlas，而是使用设备端预置 TTF 字体渲染 primary text，适合状态消息、短文本、中文提示和代码样式文本。

```ts
this.createUnitTemplate({
  unitId: 'message',
  typeId: '@demo/text:message',
  name: 'Message',
  categoryId: '@demo/text',
  plugin: {
    type: 'label',
    pluginUUID: this.pluginUUID,
    pluginVersion: this.pluginVersion,
    unitId: 'message',
  },
  label: { fontFamily: 'puhuiti' },
  defaultData: { text: '在线' },
})
```

规则：

- `label` 配置必填。
- `fontFamily` 只能是 `puhuiti` 或 `consola`。
- 不能同时声明 `functions`、`slider`、`valueLabel` 或 `buttonGroup`。
- 不能设置 `hasView: true`。
- primary text 的字体族被锁定为定义里的字体；字号、颜色、粗体、斜体等外观仍可编辑。
- primary text 和 primary icon 由设备端运行时绘制；预渲染 PNG 不包含这两个元素。
- `label` 不新增设备端 `changed` 事件。插件通过 `hostApi.unit.setLabelText()` 和 `hostApi.unit.setUnitIcon()` 主动更新设备显示。
<!-- plugin-cycled-slider:end -->

## panel：平台原生 Agent Panel

`plugin.type: 'panel'` 声明使用 FlexStudio/设备提供的通用 Agent Panel。Codex、Claude 等适配器提供会话数据、业务请求和动作执行结果；宿主与固件负责 UI、布局、绑定编辑、导航、翻页、焦点、长按确认与超时。插件不实现 Panel iframe、外观编辑器或渲染器，不声明 `appearanceOverride`、`availableElements`、`hasView`、`hasAppearanceEditor`、`interactionMode`、`defaultActivation`。`hasFunctionEditor` 仅用于排序、快捷回复等业务设置。

```ts
this.createUnitTemplate({
  unitId: 'monitor', typeId: '@demo/monitor.panel', name: 'Agent monitor', categoryId: 'plugin',
  plugin: { type: 'panel', pluginUUID: this.pluginUUID,
    pluginVersion: this.pluginVersion, unitId: 'monitor' },
  panel: { staleAfterMs: 30000, sessionCatalogMethod: 'listSessions' },
  hasFunctionEditor: true,
})
// 注册普通 renderer RPC；平台负责选择控件和持久化。
this.registerRendererRpc('listSessions', (query: string, selectedIds: string[]) => ({
  items: [{ id: 'session-stable-id', title: 'Example session' }],
}))
```

目录 RPC 接收 `[query, selectedIds]`，返回 `{items: Array<{id, title}>}`。返回当前查询匹配项及已选择项；ID 必须是稳定会话身份，不随请求变化。目录失败不清除已保存绑定；未实现目录的适配器仍可使用自动会话选择。`exampleModel` 可提供符合模型约束的合成示例，不放真实会话、账户或运行快照。

### 单 Session 元素与高度适配

新 Panel 默认三个 `panel-session` 元素；用户可在高级编辑器添加、复制、删除、拖动和缩放，沿用现有最多 8 个会话槽的限制。每个元素保存自身 UUID、百分比几何和 `{view:'overview', slot, itemId?, itemTitle?}`。固定绑定跟随元素，删除中间元素不会改变其他绑定，复制元素分配新槽并恢复自动选择。缺失的固定会话显示禁用占位，不用另一个会话代替。

元素内部的标题、状态、计时、进度和活动布局由平台编译器生成。预览和上传调用同一编译器；设备消费相同的像素矩形，整个 Session 是一个编辑与点击区域。详情、通知、返回、动作和隐藏会话栏由平台生成，详情/通知标签用于预览，没有可编辑的内部字段。高度适配仅在 Agent Panel 内部：60px 采用紧凑两行，134px 采用三行；不新增面向所有 Unit 的响应式布局协议。

旧分离字段按已有 slot 做一次输入迁移，保存该组矩形并转换旧 `sessionBindings`。运行时不再从字段推断会话。旧布局中复用同一 slot 的多个区域无法恢复成不同会话，需显式新增 Session；已初始化后删除全部 Session 不会自动补回三个。升级需要匹配的宿主、SDK 与固件；设备需公布 `capabilities.pluginPanel: {version:1, sessionElements:2}`。仅有 `version:1` 的旧固件不具备新元素能力，宿主显示更新提示。

### 数据、输入与业务动作

`hostApi.unit.getPanelBindings(serialNumber, unitUuid)` 返回 `{elementId, slot, itemId?, title?}[]`。插件据此获取固定目标数据，但不能重排或写回元素。发布时以固定会话 ID 作为 `item.id`，即便底层请求 ID 改变。使用 `hostApi.unit.setPanelModel` 或基类 `setPanelModel` 发布；Host 拒绝 `navigation` 和 `item.slot`，布局与 slot 投影由平台完成。`layout:'sessions'` 属于内部设备表示，插件无需设置。

运行绑定来自宿主在部署时生成的 `data.panel.bindings` 快照，并随设备已有的 Unit 加载描述返回。插件不要修改这个字段；本地尚未上传的编辑不会影响设备运行绑定。Panel 加载和后续事件都保留设备加载描述中的运行数据，不使用本地项目数据覆盖。

模型包含 `v:1`、`items`，以及可选的 `notice`、`noticeIcon`、`defaultItem`、`staleAfterMs`、数据窗口 `pagination`。条目包括稳定 `id`、`title`、语义 `state`、`pages`，可提供 `activity`、`subtitle`、`stateText`、`badge` 和 `timer`。`timer.since` 是 Unix 毫秒；`elapsedMs` 冻结已完成时长。状态为 idle/active/attention/success/error/disabled。页面表示业务内容或请求，包含 `id`、`lines`、`actions`，可提供 `title`、`timer`、`progress:[完成数,总数]`；`layout:'decision'` 是现有请求语义标记，不提供坐标或布局模板。

动作提供 `id`、完整 `label`、可选 `description`、语义样式 normal/primary/danger、`enabled`、`confirm:'hold'`、`requireFullLabel`；外部打开动作使用 `icon:'open-in-new'`。旧 `priority` 不再让原生 UI 静默省略动作，所有已提供动作由平台分页。点击详情内容切换剩余动作/下一业务页。完整请求标题、正文、敏感规则或决策选项放不下时不可执行，外部打开动作仍可用于查看原请求。

决策页有 2–4 个动作、最后一个动作显式使用 `style:'normal'` 且没有 `icon` 或 `confirm` 时，平台将全部动作排在已有动作区域内，末尾动作使用紧凑次级按钮。例如三个答案后追加“跳过”；插件负责区分空答案与选择答案，不能将跳过文案当作答案提交。这不新增协议字段，其他动作仍沿用原有分页。普通会话详情页在分页前将 `open-in-new` 动作置于首位，确保进入会话时第一个按钮用于在桌面应用打开；其他动作随后排列。提问、审批等 decision 页仍将外部打开动作靠右放在“返回”左边，同时存在紧凑次级动作时将其放在外部打开动作左侧。位置变化保留原始动作事件身份。详情导航统一显示“返回”。

现有设备协议容量不变：模型最多 12288 字节、8 个条目、每条目 8 页、每页 4 个动作/4 行，文字最多 240 UTF-8 字节；ID 不含 NUL，事件含身份/token 后不超过 1024 字节。非法/超限输入发送前拒绝。Codex 对超过三个选项的问题保留“在 Codex 打开”业务动作，不在插件内拆成显示分页；这保留了完整桌面答题路径，但当前不支持在设备逐项回答这些大问题。

旋钮等目标功能调用 `hostApi.unit.sendPanelInput(sn, uuid, input)`，其中 input 为 `{kind:'rotate',delta}`、`{kind:'press',down}` 或 `{kind:'cancel'}`。激活取消时也发送 cancel。平台拥有触摸与旋钮共同使用的选择状态，插件不根据按键直接执行 Panel 审批。接到 `onPanelEvent` 的 action 后重新校验请求、动作、权限与有效期，执行业务并用 `ackPanelAction` 返回结果。陈旧/断线/notice 状态不可执行；更新请求或改变选中目标使按压确认失效。5 秒空闲后允许自动介入，30 秒聚焦空闲返回概览，10 秒未收到动作回执显示未知；未知结果不得自动重放。

`getPanelBindings`、`sendPanelInput`、`setPanelModel`、`ackPanelAction` 都要求 `unit` 权限，并检查插件对已加载 Unit 的所有权。输入按顺序发送，不进入合并最新模型的队列。

### 公共外观编辑与历史

普通多状态 Unit 继续通过已有 `appearance[]` 和公共接口编辑，插件暂不可用时也保留数据。`unitAppearanceTargets`、`unitAppearanceElements`、`updateUnitAppearance`、`arrangeAppearanceElements` 从 `@flexsdk/runtime` 导出；Panel 概览的元素也是现有文档数据。切换预览视图不修改运行状态和历史；显式排列、几何修改、增加/删除与绑定修改共用原有草稿和 Apply/Cancel、撤销/重做。模型更新不写文档。只有初始化或显式“重置布局”创建三个默认会话，不在渲染过程中修改元素。

## label / value-label 状态与交互

label/value-label 点按和长按事件交给插件处理；不声明 tapAction，不提供 Target Page。设备页面导航使用独立的 PageJump Unit。旧插件应在 migrateUnit 中删除废弃的 tapAction 数据。

setUnitState 给 label/value-label 的动态文字和图标应用固定语义色，不提供任意运行时颜色 API。state 的取值与面板相同。label 的原有文字、图标 API 继续使用；不要把动态文字或完整模型保存进 Project。

面板可提供 `pagination: { offset, total }`，items 只承载当前窗口。设备浏览完当前窗口后发送 `{ event: "browse", offset }`；插件从完整数据源投影下一窗口，不能按显示容量丢弃待处理请求。分页事件不执行业务操作。

## 原生插件 Chart Unit（SDK 2.2）

`plugin.type: 'chart'` 为插件专用原生图表 Unit。它使用与内置 Chart 相同的六种元素、样式、数据订阅、设备推送、字体构建和固件渲染器：`chart-text`、`chart-gauge`、`chart-progress-bar`、`chart-line`、`chart-series-bar`、`chart-heatmap`。静态 text/icon/image 可以一起组成默认布局。

文字优先使用 `builtin:font:puhuiti` 或 `builtin:font:consola`。这两个引用直接复用设备内置字体，不生成字体子集，也不随项目重复传输字体文件。预览使用相同字体和原生渲染规则。自定义字体仍通过项目资源和子集部署；不会仅凭字体名称替换。`chart-text` 和 `status-count` 的文字背景应为透明、无边框，Unit 的底色和轮廓放在 `appearance.background`，不要把 Unit surface 复制到文字元素。

- 必须提供 `appearanceOverride`，并绑定 `plugin:<pluginUUID>:<sourceId>:<entryKey>` 数据源。不要声明 iframe `hasView` 或 `hasAppearanceEditor`，也不要附加 canvas/functions、slider、label 或 button-group 运行时配置。
- 使用已有 `chart` 权限、`registerChartDataSource`、`publishChartEntries`。不新增图片推送协议。设备通过现有 load/unload 和 rawEvent（touch、long-pressed）通知插件。
- `defaultGeometry: {width: 3, height: 1}` 指定新建 Unit 的默认格数；两项均为正数，最大 32。所有添加入口通过同一 Unit 工厂消费此默认值。迁移旧 Unit 应保留其 geometry，不应静默挤占邻居。
- 多实例数据源可在元素 `dataSourceKey` 或 line `sources[].key` 中使用 `{unitUUID}`，Studio、设备和字体收集均按当前 Unit UUID 解析。共享指标不必按设备 load 才发布，这样新建 Unit 在编辑器中也能显示真实数据。
- gauge 可声明 `style.thresholds: [{max: 5, color: '#EF5350'}, {max: 20, color: '#FFB74D'}]`，按满足 displayValue <= max 的最小 max 选色，其他数值使用 style.color；最多 8 条。与内置 Chart 共用语义。
- 使用 `migrateUnit` 将旧类型迁移为 chart 时，返回 `{unit}`，一次性更新 plugin、appearance、config，保留 Unit UUID、位置和尺寸，并给新元素分配唯一 UUID。不要只改 type 而保留空布局。

本能力需要同步支持 chart 类型的 FlexStudio 和固件；只升级 SDK 不能让旧固件识别新 Unit。完整示例见 FlexPluginFullTest 的 native-chart 定义及 runtime-load 数据源。

## 状态计数元素（SDK 2.3）

`status-count` 是一个可选择状态的原生文字元素，同一类型可放置多份。每个元素显示一行状态名称和数量；不使用图表外观或通用图表配置面板。它复用现有 `chart` 数据发布、设备文字绑定、字体构建和文字渲染，不新增推送通道。

- 状态展示 Unit 使用 `plugin.type: 'standard'`，由宿主的普通 Unit 视图和外观编辑器呈现；设置 `availableElements: ['status-count', 'text', 'icon', 'image']` 限定高级编辑器的元素面板，`defaultGeometry: {width: 1, height: 1}` 指定新建尺寸。只有需要图表元素的 Unit 才使用 `chart`，例如额度圆环。
- `availableElements` 适用于 `standard` 和 `chart`。显式指定时，`appearanceOverride.elements` 提供完整元素，宿主从空外观构建，不插入默认名称或图标元素，也不接受 primary 元素补丁；元素 UUID 必须唯一。普通 Unit 的面板和外观不能包含 `chart-*` 图表元素。省略该字段时保留原类型的默认外观构建规则。
- 动态计数复用 `chart` Host API 和既有设备数据协议；数据通道名称不决定 Unit 类型。宿主与固件按普通 Unit 实际包含的 `status-count` 元素启用数据消费，不依赖插件名称或业务 ID。断连、过期和来源移除显示 `--`，真实零值保留。
- 元素 `data` 为 `{dataSourceKey, updateInterval, options: [{label, dataSourceKey}]}`。`options` 的数据键唯一，当前选中键必须在其中。高级编辑器只显示状态选择器；插件自行决定状态定义，不在宿主硬编码业务状态。
- 同一组选项也放在 Unit 的 `defaultData.statusCountOptions`，供拖拽、双击新增元素使用。复制粘贴保留元素已有选项。
- 各数据源发布 `rawValue` 数量；状态名称由元素当前选项的 `options.label` 提供，宿主与固件将标签和数字组合为一行，例如 `Running 3`。不要将状态名称写入仅接受数值格式的 `displayText`；设备字体闭包合并所有可选标签与数字字符。语言改变后需要更新布局和文字域；使用设备内置字体时不重新上传字体文件，自定义字体按新字符域重新构建子集。
- `status-count` 保留为设备元素，沿用 `chart.text:<elementUUID>` 原生文字绑定，固件用同一文字渲染器识别它；旧固件不识别该元素，需升级匹配的固件。设备回读后仍能选择状态。
- 升级插件时通过 `migrateUnit` 将旧状态 Unit 改为 `standard` 并更新元素面板。已有 `status-count` 元素保留 UUID、样式和编辑；更早的统计布局需要转换时，给新元素分配 UUID。保留 Unit 的身份、位置和尺寸，并提升插件版本以触发迁移。

完整示例：FlexPluginFullTest 的 Status Count Probe；实际产品示例：Codex Agent status 的运行中、已完成、待处理三行。

### Chart 圆环的一致性

`chart-gauge` 与内置 Chart 共用渲染器。上位机和固件的圆环几何由工作区 `contracts/chart-render/v1/ring.json` 统一生成：按设备像素在元素内居中、等宽圆头线条、135° 起始角及 270° 扫角，背景透明度为 64/255。不依赖 SVG 私有轮廓或 LVGL 主题默认样式。此变更不增加插件配置字段；插件继续提供已有的几何、颜色、阈值和数据绑定。要得到一致的预览和实机效果，需要同时更新宿主与固件。
