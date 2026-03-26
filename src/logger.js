// sendLogToGrafana(event) {
//   const body = JSON.stringify(event);
//   fetch(`${config.url}`, {
//     method: 'post',
//     body: body,
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${config.accountId}:${config.apiKey}`,
//     },
//   }).then((res) => {
//     if (!res.ok) console.log('Failed to send log to Grafana');
//   });
// };

const config = require('./config.js');

class Logger {
  httpLogger = (req, res, next) => {
    console.log('httpLogger HIT:', req.method, req.originalUrl);
    console.log('HTTP Request', { method: req.method, path: req.originalUrl });
    let send = res.send;
    res.send = (resBody) => {
      const logData = {
        authorized: !!req.headers.authorization,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        reqBody: JSON.stringify(req.body),
        resBody: JSON.stringify(resBody),
      };
      const level = this.statusToLogLevel(res.statusCode);
      this.log(level, 'http', logData);
      res.send = send;
      return res.send(resBody);
    };
    next();
  };

  log(level, type, logData) {
    console.log("Config is", config.logging);
    console.log("Config real is ", config);
    console.log('Log Event', { level, type, ...logData });
    const labels = { component: config.logging?.source || 'jwt-pizza-service', level, type, method: logData.method, path: logData.path, statusCode: logData.statusCode, authorized: logData.authorized, reqBody: logData.reqBody || level, resBody: logData.resBody };
    const line = this.sanitize(logData); 
    const logEvent = {
      streams: [
        {
          stream: labels,
          values: [[this.nowString(), line]],
        },
      ],
    };

    this.sendLogToGrafana(logEvent);
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return 'error';
    if (statusCode >= 400) return 'warn';
    return 'info';
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  sanitize(logData) {
    logData = JSON.stringify(logData);

    const sensitiveFields = ['password', 'token', 'jwt', 'api_key'];
    sensitiveFields.forEach((field) => {
      const regex = new RegExp(`\\"${field}\\"\\s*:\\s*\\"[^"]*\\"`, 'g');
      logData = logData.replace(regex, `\\"${field}\\": \\"*****\\"`);
    });
    return logData;
  }

  sendLogToGrafana(event) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    // if (process.env.DISABLE_LOGGING === 'true') return;

    console.log('Sending log to Grafana', event);
    const body = JSON.stringify(event);
    fetch(`${config.logging?.endpointUrl}`, {
      method: 'post',
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logging?.accountId}:${config.logging?.apiKey}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const responseText = await res.text().catch(() => '<no response body>');
          console.error('Failed to send log to Grafana', {
            status: res.status,
            statusText: res.statusText,
            body: responseText,
          });
        } else {
          console.log('Log sent to Grafana', { status: res.status });
        }
      })
      .catch((err) => {
        console.error('Grafana send error', {
          message: err?.message,
          stack: err?.stack,
        });
      });
  }
}

const loggerInstance = new Logger();

module.exports = {
  logger: loggerInstance,
  httpLogger: loggerInstance.httpLogger.bind(loggerInstance),
};