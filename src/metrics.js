
const { fail } = require('assert');
const config = require('./config');
const os = require('os');

const metricsConfig = config.metrics;

const latency={
  'pizza-service':[],
  'pizza-creation':[]
}

let httpMetrics={
  "total":0,
  "GET":0,
  "POST":0,
  "PUT":0,
  "DELETE":0,
}

let loggedInUsers=0;

let successfulLogins=0;
let failedLogins=0;

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
    successfulLogins++;
  },

  failedLogin(){
    failedLogins++;
  },

  logoutUser(){
    loggedInUsers--;
    if(loggedInUsers<0){
      loggedInUsers=0;
    }
  },

  recordLatency(type,value){
    latency[type]?.push(value);
  },

  async sendMetricsPeriodically(){
    //secondly reports
    setInterval(async ()=>{
      //console.log("sending metrics")
      try{
        //system metrics
        const cpuValue = Math.round(getCpuUsagePercentage());
        sendIntMetric('cpu-percent', cpuValue, 'gauge', '%');
        const memoryValue = Math.round(getMemoryUsagePercentage());
        sendIntMetric('memory-percent', memoryValue, 'gauge', '%');
        //logged in users
        //console.log(`active users: ${loggedInUsers}`);
        sendIntMetric('active-users',loggedInUsers,'sum','1');

        //latency
        //console.log(latency);
        let key;
        for(key in latency){

          latency[key]?.forEach(async (time)=>{
            await sendIntMetric(key+'-latency',time,'sum','ms')
          })

          latency[key]=[];
        }
      }
      catch(error){
        console.log('Error sending metrics', error);
      }
    },1000);
    //minutely reports
    setInterval(async ()=>{
      try{
                //http requests
        //console.log(httpMetrics);
        let key;
        for(key in httpMetrics){
          await sendIntMetric(`${key.toLowerCase()}-requests`,httpMetrics[key],'sum','1');
          httpMetrics[key]=0;
        }

        //auth info
        //console.log(`Successful Logins: ${successfulLogins}, Failed Logins: ${failedLogins}`);
        await sendIntMetric('successful-logins',successfulLogins,'sum','1');
        successfulLogins=0;
        await sendIntMetric('failed-logins',failedLogins,'sum','1');
        failedLogins=0;
      }
      catch(error){
        console.log('Error sending metrics', error);
      }
    },60000)
  }
}


module.exports = metrics;