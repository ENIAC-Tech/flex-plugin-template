import { createVuetify } from 'vuetify';
import { aliases, mdi } from 'vuetify/iconsets/mdi';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { mountFlexPage } from '@flexsdk/runtime';
import UnitFunctionEditor from './UnitFunctionEditor.vue';
import UnitAppearanceEditor from './UnitAppearanceEditor.vue';
import UnitView from './UnitView.vue';
import ConfigPage from './ConfigPage.vue';

const vuetify = createVuetify({
  components,
  directives,
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
});

void mountFlexPage({
  components: {
    unitFunctionEditor: UnitFunctionEditor,
    unitAppearanceEditor: UnitAppearanceEditor,
    unitView: UnitView,
    configPage: ConfigPage
  },
  setupApp(app) {
    app.use(vuetify);
  },
  themeSync: { vuetify }
});
