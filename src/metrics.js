const express = require('express');
const config = require('./config');
const os = require('os');
const { log } = require('console');

const metricsConfig = config.metrics;

let latency = 0;

let httpMetrics={
  "total":0,
  "GET":0,
  "POST":0,
  "PUT":0,
  "DELETE":0,
}

let loggedInUsers=0;

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

async function sendIntMetric(metricName, metricValue, type, unit) {
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
                      attributes: [{
                        key: "source",
                        value: { stringValue: "jwt-pizza-service" }
                      }],
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
  await fetch(`${metricsConfig.url}`, {
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
        //console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

const metrics={
  async requestTracker(req, res, next){
    //console.log(req);
    if(req.method in httpMetrics){
      httpMetrics[req.method]++;
      //console.log(`Adding ${req.method} request...`)
    }else{
      //console.log(`Skipping ${req.method} request...`)
    }
    httpMetrics.total++;
    
    next();
  },

  loginUser(){
    loggedInUsers++;
  },

  logoutUser(){
    loggedInUsers--;
    if(loggedInUsers<0){
      loggedInUsers=0;
    }
  },

  async sendMetricsPeriodically(interval){
    const timer = setInterval(async ()=>{
      //console.log("sending metrics")
      try{
        //system metrics
        const cpuValue = Math.round(getCpuUsagePercentage());
        sendIntMetric('cpu-percent', cpuValue, 'gauge', '%');
        const memoryValue = Math.round(getMemoryUsagePercentage());
        sendIntMetric('memory-percent', memoryValue, 'gauge', '%');
        //http requests
        //console.log(httpMetrics);
        for(key in httpMetrics){
          await sendIntMetric(`${key.toLowerCase()}-requests`,httpMetrics[key],'sum','1');
          httpMetrics[key]=0;
        }

        //logged in users
        console.log(`active users: ${loggedInUsers}`);
        sendIntMetric('active-users',loggedInUsers,'sum','1');
      }
      catch(error){
        console.log('Error sending metrics', error);
      }
    },interval);
  }
}


module.exports = metrics;