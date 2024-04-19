
import { Candlestick } from './type';
import { fetchCandlestickData } from './market-data';
import { analyzeTrend } from './trend-analyzer';
import Color from 'colors';
import moment from 'moment';
import _ from 'lodash';


// const targets = [
//     {
//         symbol: 'BTCUSDT',
//         maxDayToCheck: 30,
//         precentCountAsUpward: 2,
//         minDayInRightSide: 3,
//         minDayInLeftSide: 3,
//     }
// ];

export type DropReboundPeriod = {
    leftSideStart: Date;
    leftSideEnd: Date;
    leftSideHighestPrice: Big;
    leftSideLowestPrice: Big;
    rightSideStart: Date;
    rightSideEnd: Date;
    settlementPrice: Big;
};

export const run = async (symbol: string, maxDayToCheck: number, settlementDate?: string) => {
    const targets = [
        {
            symbol: symbol.toLocaleUpperCase(),
            maxDayToCheck: maxDayToCheck,
            precentCountAsUpward: 2,
            minDayInRightSide: 3,
            minDayInLeftSide: 2,
        }
    ];


    const settlementMoment = settlementDate ? moment.utc(settlementDate) : moment.utc();
    if (!settlementMoment.isValid()) {
        throw new Error('Invalid date format');
    }

    console.log(`Settlment Date is ${settlementMoment.format('YYYY-MM-DD')}`);
    const dropReboundPeriods: DropReboundPeriod[] = [];
    for (const target of targets) {

        console.log(`Analyzing ${target.symbol}...`);
        const allCandlesticks = await fetchCandlestickData(
            target.symbol, '1d', settlementMoment.clone().subtract(target.maxDayToCheck, 'd').toDate().getTime(),
            settlementMoment.clone().toDate().getTime()
        );
        if (allCandlesticks.length === 0) {
            console.log(`No data found for ${target.symbol}`);
            return;
        }

        // console.log(JSON.stringify(allCandlesticks, null, 2))

        const upwardRightCandlesticks: Candlestick[][] = [];
        const rightDayAdded: { [dayBackward: number]: true | undefined } = {};
        for (const dayToBackward of _.range(target.maxDayToCheck + 1, target.minDayInRightSide)) {
            const rightCandlesticks = allCandlesticks.slice(-dayToBackward);
            const firstRightCandlestick = rightCandlesticks[0];
            const isFirstCandUpward = firstRightCandlestick.closePrice > firstRightCandlestick.openPrice;
            if (!isFirstCandUpward) {
                continue
            }
            const rightTrend = analyzeTrend(rightCandlesticks, target.precentCountAsUpward);
            if (rightTrend.direction === 'upward' && isFirstCandUpward) {
                rightDayAdded[dayToBackward] = true;
                

                const prevDateExists = rightDayAdded[dayToBackward + 1]
                if (!prevDateExists) {
                    upwardRightCandlesticks.push(rightCandlesticks);
                }
            }
        }

        // console.log(`Found Range: ${upwardRightCandlesticks.map(t => {
        //     return `${moment.utc(t[0].openTime).format('YYYY-MM-DD')} - ${moment.utc(t[t.length - 1].openTime).format('YYYY-MM-DD')}`
        // }).join('\r\n')}`);


        for (const rightCandlesticks of upwardRightCandlesticks) {
            const dayToBackward = rightCandlesticks.length;
            // console.log(`Day ${dayToBackward} - ${rightTrend.direction} - ${rightTrend.percentage}%`);
            const rightSideLast = rightCandlesticks[rightCandlesticks.length - 1];;
            if (!moment.utc(rightSideLast.openTime).isSame(settlementMoment, 'D')) {
                throw new Error('Settlement date is not the same as the last candlestick date ‼️');
            }
            const settlementPrice = rightSideLast.highPrice;//not close price, ha

            const allLeftCandlesticks = allCandlesticks.slice(0, -dayToBackward);
            const leftDaysAdded: { [dayBackward: number]: true | undefined } = {};
            for (const dayToBackwardForLeftCandlesticks of _.range(target.maxDayToCheck + 1, 0)) {
                const leftCandlesticks = allLeftCandlesticks.slice(-dayToBackwardForLeftCandlesticks);
                if (leftCandlesticks.length < target.minDayInLeftSide) {
                    continue;
                }
                const leftTrend = analyzeTrend(leftCandlesticks);
                // console.log()
                // console.log(`Day ${dayToBackwardForLeftCandlesticks} - Left trend: ${leftTrend.direction} - ${leftTrend.percentage}%`);

                if (leftTrend.direction === 'downward') {

                    leftDaysAdded[dayToBackwardForLeftCandlesticks] = true;
                    // const isFirstCandDownward = leftCandlesticks[0].closePrice < leftCandlesticks[0].openPrice;
                    // if(!isFirstCandDownward){
                    //     continue;
                    // }
                    const prevDateExists = leftDaysAdded[dayToBackwardForLeftCandlesticks + 1];
                    if (prevDateExists) {
                        continue;
                    }

                    const leftSideHighestPrice = _.maxBy(leftCandlesticks, c => c.highPrice);
                    if (!leftSideHighestPrice) {
                        throw new Error('Cannot find the lowest price in the left candlesticks.');
                    }
                    const leftSideLowestPrice = _.minBy(leftCandlesticks, c => c.lowPrice);
                    if (!leftSideLowestPrice) {
                        throw new Error('Cannot find the lowest price in the left candlesticks.');
                    }
                    if (settlementPrice.gte(leftSideHighestPrice.highPrice)) {
                        console.log('------------------------------------')
                        console.log(`Found Drop period from ${moment.utc(leftCandlesticks[0].openTime).format('YYYY-MM-DD')} to ${moment.utc(leftCandlesticks[leftCandlesticks.length - 1].openTime).format('YYYY-MM-DD')}`);
                        console.log(`Found Rebound period from ${moment.utc(rightCandlesticks[0].openTime).format('YYYY-MM-DD')} to ${moment.utc(rightSideLast.openTime).format('YYYY-MM-DD')}`);
                        console.log(`Found ${target.symbol} at ${settlementPrice}@${moment.utc(rightSideLast.openTime).format('YYYY-MM-DD')} 📈 ${leftSideHighestPrice.highPrice}@${moment.utc(leftSideHighestPrice.openTime).format('YYYY-MM-DD')}`);




                        dropReboundPeriods.push({
                            leftSideStart: leftCandlesticks[0].openTime,
                            leftSideEnd: leftCandlesticks[leftCandlesticks.length - 1].openTime,
                            leftSideHighestPrice: leftSideHighestPrice.highPrice,
                            leftSideLowestPrice: leftSideLowestPrice.lowPrice,
                            rightSideStart: rightCandlesticks[0].openTime,
                            rightSideEnd: rightSideLast.openTime,
                            settlementPrice,
                        });
                    }
                }
            }



        }




    }
    return dropReboundPeriods;
};
//check if cli has arguments --test
if (process.argv.includes('--test') && process.argv.includes(__filename)) {
    (async () => {
        const result = await run('ETHUSDT', 30, new Date('2024-04-08').toISOString());
        // const result = await run('ETHUSDT', 30, new Date('2024-03-11').toISOString());
        console.log(result);
    })();
}



