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

const config = require('./config');

class Logger {
  httpLogger = (req, res, next) => {
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
    const labels = { component: config.logging.source, level, type };
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
    return logData.replace(/\\"password\\":\s*\\"[^"]*\\"/g, '\\"password\\": \\"*****\\"');
  }

  sendLogToGrafana(event) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const body = JSON.stringify(event);
    fetch(`${config.logging.endpointUrl}`, {
      method: 'post',
      body,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.logging.accountId}:${config.logging.apiKey}`,
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

module.exports = {
  logger: new Logger(),
  httpLogger: new Logger().httpLogger,
}