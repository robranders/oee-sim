/**
 * Project https://github.com/robranders/oee-sim
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

const runtimes = (start, end, aFactor) => {
    let runtimes = [];
    let downtimes = [];
    let runtimesDowntimes = [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    const duration = endDate.getTime() - startDate.getTime();
    const runtime = parseInt(duration * aFactor, 10);
    const downtime = duration - runtime;

    // if (aFactor <= 0) return { r: [], d: [duration] };
    // if (aFactor >= 1) return { r: [duration], d: [] };

    let cumulativeDowntime = 0;
    let cumulativeRuntime = 0;

    while (cumulativeDowntime < downtime) {
        var thisDT = parseInt(
            (downtime - cumulativeDowntime) * Math.random(),
            10
        );
        if (thisDT <= 0) break;
        downtimes.push(thisDT);
        cumulativeDowntime += thisDT;
    }

    while (cumulativeRuntime < runtime) {
        var thisRT = parseInt(
            (runtime - cumulativeRuntime) * Math.random(),
            10
        );
        if (thisRT <= 0) break;
        runtimes.push(thisRT);
        cumulativeRuntime += thisRT;
    }

    downtimes = shuffle(downtimes);
    runtimes = shuffle(runtimes);

    const dlen = downtimes.length;
    const rlen = runtimes.length;

    if (dlen < rlen && rlen > 1) {
        for (let i = 0; i < rlen - dlen; i++) {
            let removeIndex = Math.floor(Math.random() * runtimes.length);
            let addIndex = Math.floor(Math.random() * runtimes.length);

            while (addIndex === removeIndex) {
                addIndex = Math.floor(Math.random() * runtimes.length);
            }

            runtimes[addIndex] = runtimes[addIndex] + runtimes[removeIndex];

            runtimes.splice(removeIndex, 1);
        }
    } else if (rlen < dlen) {
        for (let i = 0; i < dlen - rlen; i++) {
            let splitIndex, overwriteValue;
            let addValue = 0;

            while (addValue === 0) {
                splitIndex = Math.floor(Math.random() * runtimes.length);
                overwriteValue = Math.floor(
                    Math.random() * runtimes[splitIndex]
                );
                addValue = runtimes[splitIndex] - overwriteValue;
            }

            runtimes[splitIndex] = overwriteValue;
            runtimes.push(addValue);
        }
    }

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

    const tagUpdates = tagUpdatesRel.map((u) => ({
        ...u,
        t: new Date(startDate.getTime() + u.t)
    }));

    let timeHelper = new Date(startDate.getTime());

    for (let i = 0; i < runtimesDowntimes.length; i++) {
        runtimesDowntimes[i].start = timeHelper;
        timeHelper = new Date(
            timeHelper.getTime() + runtimesDowntimes[i].length
        );
        runtimesDowntimes[i].end = timeHelper;
    }

    return { tag: tagUpdates, parts: runtimesDowntimes };
};

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

const OEE = (start, end, aRate, pRate, qRate, hpTarget, counterStart) => {
    const st = new Date(start);
    const ed = new Date(end);

    const R = runtimes(st, ed, aRate);
    const P = production(R.parts, st, ed, hpTarget, pRate, counterStart);
    const W = waste(P.tag, qRate);

    return { r: R.tag, p: P.tag, w: W };
};

module.exports = { runtimes, production, waste, OEE };
