module.exports = {
  apps : [{
    script: 'server.js',
    watch_delay: 1000,
    ignore_watch : ["node_modules", "./uploads","./utils","\\.git", "*.log"],
  }, {
    script: './service-worker/',
    watch: ['./service-worker']

  }],
};
