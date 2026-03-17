const httpMetrics = { count: 0, errors: 0, totalLatency: 0 };
const systemMetrics = { cpu: 0, memory: 0 };
const purchaseMetrics = { total: 0, success: 0, failure: 0, revenue: 0 };

module.exports = {};

function requestTracker(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    httpMetrics.count++;
    httpMetrics.totalLatency += duration;

    if (res.statusCode >= 400) {
      httpMetrics.errors++;
    }
  });

  next();
};

const os = require('os');

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
};

function pizzaPurchase(success, latency, price) {
  purchaseMetrics.total++;
  purchaseMetrics.latency += latency;

  if (success) {
    purchaseMetrics.success++;
    purchaseMetrics.revenue += price;
  } else {
    purchaseMetrics.failure++;
  }
}

module.exports = {
  requestTracker,
};