import { FlexPluginBase, unitTemplate } from '@flexsdk/runtime';
import type { PluginDefinitionsPayload, PluginEventEnvelope, PluginLoadContext } from '@flexsdk/types';

const PLUGIN_UUID = '@your-username/your-plugin-name';
const UNIT_TYPE_ID = `${PLUGIN_UUID}.example-unit`;
const RUNTIME_STATUS_CHANNEL = 'runtime-status';

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

    // Renderer State Channels retain same-plugin UI state. Register first, then
    // publish a complete snapshot; later actions can publish small deltas.
    await this.registerRendererStateChannel(RUNTIME_STATUS_CHANNEL);
    await this.publishRendererState(RUNTIME_STATUS_CHANNEL, {
      kind: 'snapshot',
      payload: { status: 'ready', message: 'Hello from plugin!' }
    });

    // Keep startup quick: register RPC/events early and move slow remote sync into a
    // background job. If you enable the `jobs` permission in manifest.json, a pattern
    // like the block below is preferred over waiting inside onLoad().
    //
    // const job = await this.hostApi.jobs.create({
    //   title: 'Initial sync',
    //   progress: 0,
    //   message: 'Queued',
    // });
    // void this.runInitialSync(job.id);

    this.registerRendererRpc('getMessage', async () => {
      return ctx.hostApi.store.get('message', 'Hello from plugin!');
    });

    this.registerRendererRpc('setMessage', async (message: string) => {
      await ctx.hostApi.store.set('message', message);
      await this.publishRendererState(RUNTIME_STATUS_CHANNEL, {
        kind: 'delta',
        payload: { message, updatedAt: new Date().toISOString() }
      });
      return { success: true };
    });

    await this.onRawUnitEvent(UNIT_TYPE_ID, async (payload) => {
      if (payload.rawEvent !== 'pressed') return;
      this.logger.info('Key pressed', { payload });
    });

    await this.on(
      'device.connection.changed',
      (event: PluginEventEnvelope) => {
        this.logger.info('Device connection changed', event.payload);
      },
      { snapshot: true }
    );
  }

  // Optional example for plugins that declare the `jobs` permission:
  //
  // private async runInitialSync(jobId: string): Promise<void> {
  //   try {
  //     for (let step = 0; step < 4; step += 1) {
  //       if (await this.hostApi.jobs.isCancellationRequested(jobId)) {
  //         await this.hostApi.jobs.cancel(jobId);
  //         return;
  //       }
  //
  //       await this.hostApi.jobs.update(jobId, {
  //         progress: (step + 1) * 25,
  //         message: `Sync step ${step + 1}/4`,
  //       });
  //     }
  //
  //     await this.hostApi.jobs.complete(jobId, { synced: true });
  //   } catch (error) {
  //     await this.hostApi.jobs.fail(jobId, error instanceof Error ? error.message : String(error));
  //   }
  // }
}
