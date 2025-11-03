const app = require('./service.js');
const metrics = require('./metrics.js');

const port = process.argv[2] || 3000;
app.listen(port, () => {
  metrics.sendMetricsPeriodically(5000);
  console.log(`Server started on port ${port}`);
});
