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

const { r, p, w } = OEE(
    new Date("2021-01-01T00:00:00Z"),
    new Date("2021-01-01T01:00:00Z"),
    0.9,
    0.7,
    0.6,
    1332,
    0
);

console.log({ r, p, w });
```
