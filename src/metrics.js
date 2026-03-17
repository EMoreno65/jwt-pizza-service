
const os = require('os');
const config = require('./config.js');
let totalPizzas = 0;

const httpMetrics = { 
  TOTAL: { count: 0, totalLatency: 0, errors: 0 },
  GET: { count: 0, totalLatency: 0, errors: 0 },
  PUT: { count: 0, totalLatency: 0, errors: 0 },
  POST: { count: 0, totalLatency: 0, errors: 0 },
  DELETE: { count: 0, totalLatency: 0, errors: 0 },
 };
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

    httpMetrics[req.method].count++;
    httpMetrics.TOTAL.count++;
    httpMetrics[req.method].totalLatency += duration;
    httpMetrics.TOTAL.totalLatency += duration;


    if (res.statusCode >= 400) {
      httpMetrics[req.method].errors++;
      httpMetrics.TOTAL.errors++;
    }
  });

  next();
}

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

  totalPizzas += Math.floor(Math.random() * 3);

  const nowNs = Date.now() * 1000000;
  const metrics = [ 
    {
      name: 'ethan_http_requests_total',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [
          {
            asInt: httpMetrics.TOTAL.count,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ]
      }
    },
    {
      name: 'ethan_pizzas_ordered',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [
          {
            asInt: totalPizzas,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ]
      }
    }
  ]

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

  console.log("Sending payload:", JSON.stringify(payload, null, 2));
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