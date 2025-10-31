const express = require('express');
const config = require('./config');
const os = require('os');

const metricsConfig = config.metrics;

let requests = 0;
let latency = 0;

let httpMetrics=[];


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
}

function sendMetricToGrafana(metricName, metricValue, type, unit) {
  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: unit,
                [type]: {
                  dataPoints: [
                    {
                      asInt: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  if (type === 'sum') {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
  }

  const body = JSON.stringify(metric);
  fetch(`${metricsConfig.url}`, {
    method: 'POST',
    body: body,
    headers: { Authorization: `Bearer ${metricsConfig.apiKey}`, 'Content-Type': 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
        });
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

const metrics={
  async requestTracker(req, res, next){
    //console.log(req);

    next();
  },

  sendMetricsPeriodically(interval){
    const timer = setInterval(()=>{
      console.log("sending metrics")
      try{
        //system metrics
        const cpuValue = Math.round(getCpuUsagePercentage());
        sendMetricToGrafana('cpu-percent', cpuValue, 'gauge', '%');
        const memoryValue = Math.round(getMemoryUsagePercentage());
        sendMetricToGrafana('memory-percent', memoryValue, 'gauge', '%');
        //http requests
      }
      catch(error){
        console.log('Error sending metrics', error);
      }
    },interval);
  }
}


module.exports = metrics;