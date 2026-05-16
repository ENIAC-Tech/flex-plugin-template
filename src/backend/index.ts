import { FlexPluginBase, unitTemplate } from '@flexsdk/runtime';
import type { PluginDefinitionsPayload, PluginEventEnvelope, PluginLoadContext } from '@flexsdk/types';

const PLUGIN_UUID = '@your-username/your-plugin-name';
const UNIT_TYPE_ID = `${PLUGIN_UUID}.example-unit`;

export default class YourPlugin extends FlexPluginBase {
  async getDefinitions(): Promise<PluginDefinitionsPayload> {
    return {
      libraries: [this.createDefaultLibrary({ name: 'Your Plugin' })],
      units: [
        this.createUnitTemplate({
          unitId: 'example-unit',
          typeId: UNIT_TYPE_ID,
          name: 'Example Unit',
          categoryId: 'plugin',
          icon: 'mdi-puzzle',
          hasFunctionEditor: true,
          hasAppearanceEditor: true,
          hasView: false,
          defaultData: { message: 'Hello from plugin!' }
        })
      ],
      builtinUnits: [
        this.createBuiltinUnitTemplate(unitTemplate, {
          uuid: `${PLUGIN_UUID}.builtin-media-key`,
          typeId: '@eniacelec/media:media-key',
          name: 'Example Media Key',
          icon: 'mdi-play-pause',
          data: {
            keyId: 'play-pause',
            hidCode: 0x00CD
          }
        })
      ],
      revision: '1'
    };
  }

  async onLoad(ctx: PluginLoadContext): Promise<void> {
    await super.onLoad(ctx);
    this.logger.info('Plugin loaded');

    this.registerRendererRpc('getMessage', async () => {
      return ctx.hostApi.store.get('message', 'Hello from plugin!');
    });

    this.registerRendererRpc('setMessage', async (message: string) => {
      await ctx.hostApi.store.set('message', message);
      return { success: true };
    });

    await this.on(
      `device.plugin.${UNIT_TYPE_ID}.pressed`,
      async (event: PluginEventEnvelope) => {
        this.logger.info('Key pressed', { payload: event.payload });
      }
    );

    await this.on(
      'device.connection.changed',
      (event: PluginEventEnvelope) => {
        this.logger.info('Device connection changed', event.payload);
      },
      { snapshot: true }
    );
  }
}
