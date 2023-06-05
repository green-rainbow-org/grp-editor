import fs from 'fs';
import path from 'path';
import postcss from 'postcss';
import { defineConfig, setup } from 'tsup';
const noNest = import('no-nest-css');

/*
  https://github.com/egoist/tsup/issues/536#issuecomment-1302012400
*/

const esbuildPlugins = [{
  name: "css-module",
  setup(build) {
    build.onResolve(
      { filter: /\.module\.css$/, namespace: "file" },
      (args) => ({
        path: `${args.path}#css-module`,
        namespace: "css-module",
        pluginData: {
          pathDir: path.join(args.resolveDir, args.path),
        },
      })
    );
    build.onLoad(
      { filter: /#css-module$/, namespace: "css-module" },
      async (args) => {
        const { pluginData } = args;
        const source = await fs.promises.readFile(
          pluginData.pathDir,
          "utf8"
        );

        const result = await postcss().process(source, { from: pluginData.pathDir });
        const css = (await noNest).noNestCSS(result.css);

        return {
          pluginData: { css },
          contents: `import "${
            pluginData.pathDir
          }";
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(\`${css}\`);
          export default sheet`,
        };
      }
    );
    build.onResolve(
      { filter: /\.module\.css$/, namespace: "css-module" },
      (args) => {
        return {
          path: path.join(args.resolveDir, args.path, "#css-module-data"),
          namespace: "css-module",
          pluginData: args.pluginData
        }
      }
    );
    build.onLoad(
      { filter: /#css-module-data$/, namespace: "css-module" },
      (args) => {
        return {
          contents: args.pluginData.css,
          loader: "css"
        }
      }
    );
  },
}];

export default defineConfig({ esbuildPlugins });
