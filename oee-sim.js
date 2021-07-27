/**
 * Project https://github.com/robranders/oee-sim
 */

/**
 * Shuffle Array
 * Source: https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 * @param {Array} array - input array
 * @returns {Array}
 */
function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue,
        randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

/**
 * @typedef {Object} Runtimes
 * @property {array} parts - array of intervals where the machine is running
 * @property {array} tag - an array with tag updates for the running bit
 */

/**
 * Generate runtimes based on a start and end time and an availability factor
 *
 * @param {Date} start - Start of the interval
 * @param {Date} end - End of the interval
 * @param {number} aFactor - target availability factor (number between 0 and 1)
 * @returns {Runtimes}
 */
const runtimes = (start, end, aFactor) => {
    let runtimes = [];
    let downtimes = [];
    let runtimesDowntimes = [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    // OEE definition Runtime and Downtime
    const duration = endDate.getTime() - startDate.getTime();
    const runtime = parseInt(duration * aFactor, 10);
    const downtime = duration - runtime;

    // if (aFactor <= 0) return { r: [], d: [duration] };
    // if (aFactor >= 1) return { r: [duration], d: [] };

    let cumulativeDowntime = 0;
    let cumulativeRuntime = 0;

    // Generate downtimes of random length until the target amount of downtime is reached
    // As the cumulative downtime reaches the target downtime, the downtime parts become smaller and smaller
    while (cumulativeDowntime < downtime) {
        var thisDT = parseInt(
            (downtime - cumulativeDowntime) * Math.random(),
            10
        );
        if (thisDT <= 0) break;
        downtimes.push(thisDT);
        cumulativeDowntime += thisDT;
    }

    // Generate runtimes of random length until the target amount of runtime is reached
    // As the cumulative runtime reaches its target, the runtime parts become smaller and smaller
    while (cumulativeRuntime < runtime) {
        var thisRT = parseInt(
            (runtime - cumulativeRuntime) * Math.random(),
            10
        );
        if (thisRT <= 0) break;
        runtimes.push(thisRT);
        cumulativeRuntime += thisRT;
    }

    // At this point the downtime array and runtime array will contain random chunks of time (an integer number)
    // for both of these arrays the chunks of time will roughly sorted from large numbers to small numbers
    // Shuffle both arrays
    downtimes = shuffle(downtimes);
    runtimes = shuffle(runtimes);

    const dlen = downtimes.length;
    const rlen = runtimes.length;

    // Before we can combine the downtime parts and runtime parst again we must make sure that
    // the amount of runtime parts are the same as the amount of downtime parts
    // Those actions are done here:
    if (dlen < rlen && rlen > 1) {
        // There are more runtime parts as downtime parts
        for (let i = 0; i < rlen - dlen; i++) {
            // Pick a random index out of the runtimes array
            let removeIndex = Math.floor(Math.random() * runtimes.length);
            let addIndex = Math.floor(Math.random() * runtimes.length);

            // if the removeIndex is the same as the addIndex pick a new index
            // Keep trying a new index until you have two different indexes
            while (addIndex === removeIndex) {
                addIndex = Math.floor(Math.random() * runtimes.length);
            }

            // Add the runtime value form the remove index to the value of the add index
            runtimes[addIndex] = runtimes[addIndex] + runtimes[removeIndex];

            // Remove the removeIndex item from the runtimes array
            runtimes.splice(removeIndex, 1);
        }
    } else if (rlen < dlen) {
        // There are more downtime parts than runtime parts
        // Split runtime parts
        for (let i = 0; i < dlen - rlen; i++) {
            let splitIndex, overwriteValue;
            let addValue = 0;

            while (addValue === 0) {
                // Pick a random index out of the runtime array
                splitIndex = Math.floor(Math.random() * runtimes.length);
                // Multiply the value at the split index with a random number
                overwriteValue = Math.floor(
                    Math.random() * runtimes[splitIndex]
                );
                // calculate how much runtime there is remaining
                // keep looping unitl this value is greather than 0
                addValue = runtimes[splitIndex] - overwriteValue;
            }

            // write the new value at the split index
            runtimes[splitIndex] = overwriteValue;
            // add the remaining value to the end of the array
            runtimes.push(addValue);
        }
    }

    // At this point we have two arrays (downtime and runtime) of numbers. Each of the entries in these array indicate the lengt of a downtime / runtime
    // Now calculate the actual times (t) when the running bit should update (v)

    const tagUpdatesRel = [{ t: 0, v: 1 }];
    const tagUpdateCount = downtimes.length;

    for (let i = 0; i < tagUpdateCount; i++) {
        tagUpdatesRel.push({
            t: tagUpdatesRel[tagUpdatesRel.length - 1].t + downtimes[i],
            v: 0
        });

        tagUpdatesRel.push({
            t: tagUpdatesRel[tagUpdatesRel.length - 1].t + runtimes[i],
            v: 1
        });

        runtimesDowntimes.push({
            running: true,
            length: runtimes[i]
        });

        runtimesDowntimes.push({
            running: false,
            length: downtimes[i]
        });
    }

    // calculate a timestamp based on the input startDate
    const tagUpdates = tagUpdatesRel.map((u) => ({
        ...u,
        t: new Date(startDate.getTime() + u.t)
    }));

    let timeHelper = new Date(startDate.getTime());

    // Calculate timestamps for the second part of the result set (usefull for other functions)
    for (let i = 0; i < runtimesDowntimes.length; i++) {
        runtimesDowntimes[i].start = timeHelper;
        timeHelper = new Date(
            timeHelper.getTime() + runtimesDowntimes[i].length
        );
        runtimesDowntimes[i].end = timeHelper;
    }

    return { tag: tagUpdates, parts: runtimesDowntimes };
};

/**
 * Generate a production counter base on runtimes and a performance target
 *
 * @param {Array} parts - Array of downtime and runtime parts (provided by the runtimes() function)
 * @param {Date} start - Start time of the interval
 * @param {Date} end - End time of the interval
 * @param {number} hpTarget - Hour production target (pieces per hour)
 * @param {number} pFactor - Performance factor (number between 0 and 1)
 * @param {number} counterStart - Start value of the total product counter
 * @returns
 */
const production = (parts, start, end, hpTarget, pFactor, counterStart) => {
    let counter = typeof counterStart === "undefined" ? 0 : counterStart;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const duration = endDate.getTime() - startDate.getTime();
    const tagUpdates = [];

    const targetProduction = hpTarget * (duration / 3600000);
    const targetCycleTime = 3600 / hpTarget;
    const actualProduction = targetProduction * pFactor;
    const actualCycleTime = 3600 / (hpTarget * pFactor);

    const newParts = parts.map((part) => {
        part.production = 0;
        if (!(part.running === true)) return part;
        part.production = Math.floor(part.length / 1000 / actualCycleTime);

        for (let i = 0; i < part.production; i++) {
            counter++;
            tagUpdates.push({
                t: new Date(
                    part.start.getTime() + actualCycleTime * 1000 * (i + 1)
                ),
                v: counter,
                increase: 1
            });
        }

        return part;
    });

    return { parts: newParts, tag: tagUpdates };
};

/**
 * Generate waste updates base on the production counter that was generated by the production() function
 * @param {Array} productionTags - array of tag updates generated by the production() function
 * @param {number} qFactor - Quality factor (number between 0 and 1)
 * @returns
 */
const waste = (productionTags, qFactor) => {
    const wFactor = 1 - qFactor;
    const indexPicks = [];
    const wasteIndexes = [];
    let totalProduction = 0;

    productionTags.forEach((t, i) => {
        indexPicks.push(i);
        totalProduction += t.increase;
    });

    const totalWaste = Math.floor(totalProduction * wFactor);

    for (let i = 0; i < totalWaste; i++) {
        let randomWasteIndex = Math.floor(Math.random() * indexPicks.length);
        wasteIndexes.push(randomWasteIndex);
        indexPicks.splice(randomWasteIndex, 1);
    }

    const wasteTags = wasteIndexes.map((i) => ({
        t: new Date(productionTags[i].t.getTime() + Math.random() * 5000),
        v: 1
    }));

    return wasteTags;
};

/**
 * @typedef {Object} OEE
 * @property {array} r - tag updates runtime (boolean)
 * @property {array} p - tag updates performance (total production counter)
 * @property {array} w - tag updates waste (amount of wast per update)
 */

/**
 * This function generates simulated tag data based on OEE targets.
 *
 * @param {Date} start - Start timestamp of the interval
 * @param {Date} end - End timestamp of the interval
 * @param {number} aRate - Availability rate (a number between 0 and 1)
 * @param {number} pRate - Performance rate (a number between 0 and 1)
 * @param {number} qRate - Quality rate (a number between 0 and 1)
 * @param {number} hpTarget - Hour Production target (pieces per hour)
 * @param {number} counterStart - Indicate on which number the counter must start
 * @returns {OEE} tag updates for runtime, production and waste
 */
const OEE = (start, end, aRate, pRate, qRate, hpTarget, counterStart) => {
    const st = new Date(start);
    const ed = new Date(end);

    const R = runtimes(st, ed, aRate);
    const P = production(R.parts, st, ed, hpTarget, pRate, counterStart);
    const W = waste(P.tag, qRate);

    return { r: R.tag, p: P.tag, w: W };
};

module.exports = { runtimes, production, waste, OEE };
