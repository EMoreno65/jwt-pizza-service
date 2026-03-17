const os = require('os');

const httpMetrics = { count: 0, errors: 0, totalLatency: 0 };
const systemMetrics = { cpu: 0, memory: 0 };
const purchaseMetrics = { total: 0, success: 0, failure: 0, revenue: 0 };

function requestTracker(req, res, next) {
  const isInternalMetricsPost = req.method === 'POST' && req.path === '/metrics';
  const start = Date.now();

  res.on('finish', () => {
    if (isInternalMetricsPost) {
      return;
    }

    const duration = Date.now() - start;

    httpMetrics.count++;
    httpMetrics.totalLatency += duration;

    if (res.statusCode >= 400) {
      httpMetrics.errors++;
    }
  });

  next();
}

// Testing for deployment after doing automation


function pizzaPurchase(success, latency, price) {
  purchaseMetrics.total++;

  if (success) {
    purchaseMetrics.success++;
    purchaseMetrics.revenue += price;
  } else {
    purchaseMetrics.failure++;
  }
}

function collectSystemMetrics() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  systemMetrics.cpu = cpuUsage * 100;

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  systemMetrics.memory = (usedMemory / totalMemory) * 100;
}

async function sendMetrics() {
  const payload = {
    httpMetrics,
    systemMetrics,
    purchaseMetrics,
  };

  console.log('Sending metrics:', payload);

  if (typeof fetch !== 'function') {
    return;
  }

  try {
    await fetch('http://localhost:3000/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('Failed to send metrics:', err.message);
  }
}

if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    collectSystemMetrics();
    sendMetrics();
  }, 5000);
}

module.exports = {
  requestTracker,
  pizzaPurchase,
};

