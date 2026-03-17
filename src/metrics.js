const os = require('os');
const config = require('./config.js');

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

// Testing for deployment after doing automation, moved config file


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
  if (typeof fetch !== 'function') {
    return;
  }

  const source = config.metrics?.source ?? 'jwt-pizza-service';
  const endpointUrl = config.metrics?.endpointUrl;
  const accountId = config.metrics?.accountId;
  const apiKey = config.metrics?.apiKey;

  if (!endpointUrl || !accountId || !apiKey) {
    return;
  }

  const metrics = [
    {
      name: 'jwt_pizza_http_request_count',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [{ asInt: httpMetrics.count, timeUnixNano: Date.now() * 1000000, attributes: [{ key: 'source', value: { stringValue: source } }] }],
      },
    },
    {
      name: 'jwt_pizza_http_error_count',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [{ asInt: httpMetrics.errors, timeUnixNano: Date.now() * 1000000, attributes: [{ key: 'source', value: { stringValue: source } }] }],
      },
    },
    {
      name: 'jwt_pizza_http_total_latency_ms',
      unit: 'ms',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [{ asInt: httpMetrics.totalLatency, timeUnixNano: Date.now() * 1000000, attributes: [{ key: 'source', value: { stringValue: source } }] }],
      },
    },
    {
      name: 'jwt_pizza_purchase_total',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [{ asInt: purchaseMetrics.total, timeUnixNano: Date.now() * 1000000, attributes: [{ key: 'source', value: { stringValue: source } }] }],
      },
    },
    {
      name: 'jwt_pizza_purchase_success',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [{ asInt: purchaseMetrics.success, timeUnixNano: Date.now() * 1000000, attributes: [{ key: 'source', value: { stringValue: source } }] }],
      },
    },
    {
      name: 'jwt_pizza_purchase_failure',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [{ asInt: purchaseMetrics.failure, timeUnixNano: Date.now() * 1000000, attributes: [{ key: 'source', value: { stringValue: source } }] }],
      },
    },
    {
      name: 'jwt_pizza_purchase_revenue',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [{ asDouble: purchaseMetrics.revenue, timeUnixNano: Date.now() * 1000000, attributes: [{ key: 'source', value: { stringValue: source } }] }],
      },
    },
    {
      name: 'jwt_pizza_system_cpu_percent',
      unit: '%',
      gauge: {
        dataPoints: [{ asDouble: systemMetrics.cpu, timeUnixNano: Date.now() * 1000000, attributes: [{ key: 'source', value: { stringValue: source } }] }],
      },
    },
    {
      name: 'jwt_pizza_system_memory_percent',
      unit: '%',
      gauge: {
        dataPoints: [{ asDouble: systemMetrics.memory, timeUnixNano: Date.now() * 1000000, attributes: [{ key: 'source', value: { stringValue: source } }] }],
      },
    },
  ];

  const payload = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accountId}:${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Failed to push metrics data to Grafana: ${body}`);
    }
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

