# oee-sim

![oee-sim-logo](logo.png)

![npm bundle size](https://img.shields.io/bundlephobia/min/oee-sim)
![npm](https://img.shields.io/npm/v/oee-sim)

oee-sim is a package that gives you a function to generate simulated, radomized time series tags. This data can be used to feed simulation OPC tags with data. Those tags can then be used to validate an OEE management system.

## install

```
npm install oee-sim
```

## usage

```javascript
const { OEE } = require("oee-sim");

let startTime = new Date("2021-01-01T00:00:00Z"),
    endTime = new Date("2021-01-01T01:00:00Z"),
    availabilityRate = 0.9,
    productionRate = 0.7,
    qualityRate = 0.6,
    hourProductionTarget = 1332,
    productionCounterStart = 0;

const { r, p, w } = OEE(
    startTime,
    endTime,
    availabilityRate,
    productionRate,
    qualityRate,
    hourProductionTarget,
    productionCounterStart
);

console.log({ r, p, w });
```
