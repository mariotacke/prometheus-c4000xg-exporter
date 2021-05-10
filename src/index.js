const express = require('express');
const client = require('prom-client');
const C4000XGClient = require('@mariotacke/centurylink-c4000xg');
const { snakeCase } = require('change-case');

const app = express();
const modemClient = new C4000XGClient({
  host: process.env.MODEM_HOST,
  username: process.env.MODEM_USERNAME,
  password: process.env.MODEM_PASSWORD,
});

const namespace = process.env.METRICS_NAMESPACE || 'c4000xg';

function updateMetrics(raw) {
  return Object.keys(raw).reduce((metrics, component) => {
    for (const originalMetricsName of Object.keys(raw[component])) {
      const metricName = snakeCase(`${namespace} ${originalMetricsName}`);
      const value = raw[component][originalMetricsName];

      if (typeof value !== 'number') {
        continue;
      }

      let metric = client.register.getSingleMetric(metricName);

      if (!metric) {
        metric = new client.Gauge({
          name: metricName,
          help: 'metric_help',
        });
      }

      metric.set(value);
    }

    return metrics;
  }, []);
}

app.get('/metrics', async function(req, res) {
  try {
    const response = await modemClient.getDeviceInformation('Device.Ethernet.Link.3.Stats');

    updateMetrics(response);

    const metrics = await client.register.metrics();

    res.end(metrics);
  } catch (e) {
    if (e.code === 'ENOTFOUND') {
      console.log(`Could not resolve ${e.hostname}`);
    } else {
      console.log(e);
    }

    res.status(500).send('Could not gather metrics. Try again later.');
  }
});

app.listen(process.env.PORT || 9998);