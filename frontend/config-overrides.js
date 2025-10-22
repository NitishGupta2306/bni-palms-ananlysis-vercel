const path = require('path');

module.exports = function override(config, env) {
  config.resolve = {
    ...config.resolve,
    alias: {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    },
  };
  return config;
};

module.exports.devServer = (configFn) => {
  return (proxy, allowedHost) => {
    const config = configFn(proxy, allowedHost);

    // Handle deprecated webpack-dev-server options
    const {
      onAfterSetupMiddleware,
      onBeforeSetupMiddleware,
      https,
      ...restConfig
    } = config;

    return {
      ...restConfig,
      // Use setupMiddlewares instead of deprecated hooks
      setupMiddlewares: (middlewares, devServer) => {
        return middlewares;
      }
    };
  };
};
