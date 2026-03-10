const path = require('path');

module.exports = function sdkWebpackPlugin() {
  return {
    name: 'sdk-webpack-plugin',
    configureWebpack() {
      const packagesDir = path.resolve(__dirname, '../../../');
      return {
        resolve: {
          alias: {
            '@functionspace/core': path.resolve(packagesDir, 'core/src'),
            '@functionspace/react': path.resolve(packagesDir, 'react/src'),
            '@functionspace/ui': path.resolve(packagesDir, 'ui/src'),
          },
          // SDK source uses ESM .js extension imports (e.g., from './types.js')
          // but actual files are .ts. This tells webpack to try .ts when .js is requested.
          extensionAlias: {
            '.js': ['.ts', '.tsx', '.js', '.jsx'],
          },
        },
        module: {
          rules: [
            {
              // Ensure SDK TypeScript source gets transpiled
              test: /\.tsx?$/,
              include: [
                path.resolve(packagesDir, 'core/src'),
                path.resolve(packagesDir, 'react/src'),
                path.resolve(packagesDir, 'ui/src'),
              ],
              use: {
                loader: require.resolve('babel-loader'),
                options: {
                  presets: [
                    require.resolve('@babel/preset-typescript'),
                    [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
                  ],
                },
              },
            },
          ],
        },
      };
    },
  };
};
