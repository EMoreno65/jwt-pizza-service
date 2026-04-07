
const os = require('os');
const config = require('./config.js');

const httpMetrics = { 
  TOTAL: { count: 0, totalLatency: 0, errors: 0 },
  GET: { count: 0, totalLatency: 0, errors: 0 },
  PUT: { count: 0, totalLatency: 0, errors: 0 },
  POST: { count: 0, totalLatency: 0, errors: 0 },
  DELETE: { count: 0, totalLatency: 0, errors: 0 },
 };
const systemMetrics = { cpu: 0, memory: 0 };
const purchaseMetrics = { total: 0, success: 0, failure: 0, revenue: 0, latency: 0 };
const userMetrics = { total: 0, active: 0 };
const authMetrics = { total: 0, success: 0, failure: 0 };
const chaosMetrics = { enabled: 0, triggered: 0 };
const ACTIVE_WINDOW_MS = 10 * 60 * 1000;
const activeUsersLastSeen = new Map();
const knownUsers = new Set();

function requestTracker(req, res, next) {
  const isInternalMetricsPost = req.method === 'POST' && req.path === '/metrics';
  const start = Date.now();
  const requestMethod = httpMetrics[req.method] ? req.method : 'TOTAL';
  const userKey = req.user?.id ? `user:${req.user.id}` : null;

  res.on('finish', () => {
    if (isInternalMetricsPost) {
      return;
    }

    const duration = Date.now() - start;

    httpMetrics[requestMethod].count++;
    httpMetrics.TOTAL.count++;
    httpMetrics[requestMethod].totalLatency += duration;
    httpMetrics.TOTAL.totalLatency += duration;

    if (userKey) {
      activeUsersLastSeen.set(userKey, Date.now());
      if (!knownUsers.has(userKey)) {
        knownUsers.add(userKey);
        userMetrics.total = knownUsers.size;
      }
    }

    if (res.statusCode >= 400) {
      httpMetrics[requestMethod].errors++;
      httpMetrics.TOTAL.errors++;
    }
  });

  next();
}

function authAttempt(success) {
  authMetrics.total++;
  if (success) {
    authMetrics.success++;
  }
  else {
    authMetrics.failure++;
  }
}

function pizzaPurchase(success, latency, price) {
  purchaseMetrics.total++;

  if (success) {
    purchaseMetrics.success++;
    purchaseMetrics.revenue += price;
  } else {
    purchaseMetrics.failure++;
  }
  purchaseMetrics.latency += latency;
}

function setChaosEnabled(enabled) {
  chaosMetrics.enabled = enabled ? 1 : 0;
}

function chaosTriggered() {
  chaosMetrics.triggered++;
}

function collectSystemMetrics() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  systemMetrics.cpu = cpuUsage.toFixed(2) * 100;

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  let memory = (usedMemory / totalMemory) * 100;
  systemMetrics.memory = memory.toFixed(2);
}

function getActiveUsersCount() {
  const now = Date.now();

  for (const [userKey, lastSeen] of activeUsersLastSeen.entries()) {
    if (now - lastSeen > ACTIVE_WINDOW_MS) {
      activeUsersLastSeen.delete(userKey);
    }
  }

  userMetrics.active = activeUsersLastSeen.size;
  return userMetrics.active;
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

  const activeUsersCount = getActiveUsersCount();
  const averageLatency =
    httpMetrics.TOTAL.count > 0
      ? httpMetrics.TOTAL.totalLatency / httpMetrics.TOTAL.count
      : 0;

  const pizzaLatency =
    purchaseMetrics.success > 0
      ? purchaseMetrics.latency / purchaseMetrics.success
      : 0;
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
      name: 'ethan_http_request_latency',
      unit: '1',
      gauge: {
        dataPoints: [
          {
            asDouble: averageLatency,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ],
      },
    },
    {
        name: 'ethan_http_get_requests_total',
        unit: '1',
        sum: {
          aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
          isMonotonic: true,
          dataPoints: [
            {
              asInt: httpMetrics.GET.count,
              timeUnixNano: nowNs,
              attributes: [{ key: 'source', value: { stringValue: source } }],
            },
          ]
        }
      },
        {
        name: 'ethan_http_put_requests_total',
        unit: '1',
        sum: {
          aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
          isMonotonic: true,
          dataPoints: [
            {
              asInt: httpMetrics.PUT.count,
              timeUnixNano: nowNs,
              attributes: [{ key: 'source', value: { stringValue: source } }],
            },
          ]
        }
      },
          {
        name: 'ethan_http_delete_requests_total',
        unit: '1',
        sum: {
          aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
          isMonotonic: true,
          dataPoints: [
            {
              asInt: httpMetrics.DELETE.count,
              timeUnixNano: nowNs,
              attributes: [{ key: 'source', value: { stringValue: source } }],
            },
          ]
        }
      },
          {
        name: 'ethan_http_post_requests_total',
        unit: '1',
        sum: {
          aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
          isMonotonic: true,
          dataPoints: [
            {
              asInt: httpMetrics.POST.count,
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
            asInt: purchaseMetrics.total,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ]
      }
    },
    {
      name: 'ethan_failed_orders',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [
          {
            asInt: purchaseMetrics.failure,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ]
      }
    },
    {
      name: 'ethan_revenue',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [
          {
            asDouble: purchaseMetrics.revenue,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ]
      }
    },
    {
      name: 'ethan_pizza_latency',
      unit: '1',
      gauge: {
        dataPoints: [
          {
            asDouble: pizzaLatency,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ],
      },
    },
    {
      name: 'ethan_active_users_10m',
      unit: '1',
      gauge: {
        dataPoints: [
          {
            asInt: activeUsersCount,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ],
      },
    },
    {
      name: 'ethan_auth_attempts_min',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [
          {
            asInt: authMetrics.total,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ]
      }
    },
    {
      name: 'ethan_auth_successes_min',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [
          {
            asInt: authMetrics.success,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ]
      }
    },
    {
      name: 'ethan_auth_failures_min',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [
          {
            asInt: authMetrics.failure,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ]
      }
    },
    {
      name: 'ethan_chaos_enabled',
      unit: '1',
      gauge: {
        dataPoints: [
          {
            asInt: chaosMetrics.enabled,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ],
      },
    },
    {
      name: 'ethan_chaos_triggered_total',
      unit: '1',
      sum: {
        aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
        isMonotonic: true,
        dataPoints: [
          {
            asInt: chaosMetrics.triggered,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ]
      }
    },
    {
      name: 'ethan_cpu_usage',
      unit: '1',
      gauge: {
        dataPoints: [
          {
            asDouble: systemMetrics.cpu,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ],
      },
    },
    {
      name: 'ethan_memory_usage',
      unit: '1',
      gauge: {
        dataPoints: [
          {
            asDouble: systemMetrics.memory,
            timeUnixNano: nowNs,
            attributes: [{ key: 'source', value: { stringValue: source } }],
          },
        ],
      },
    },
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

  // console.log("Sending payload:", JSON.stringify(payload, null, 2));
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
  authAttempt,
  setChaosEnabled,
  chaosTriggered,
};