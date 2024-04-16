
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

type DropReboundPeriod = {
    leftSideStart: Date;
    leftSideEnd: Date;
    leftSideHighestPrice: Big;
    rightSideStart: Date;
    rightSideEnd: Date;
    rightSideHighestPrice: Big;
};

export const run = async (symbol: string, maxDayToCheck: number, date?: string) => {
    const targets = [
        {
            symbol: symbol.toLocaleUpperCase(),
            maxDayToCheck: maxDayToCheck,
            precentCountAsUpward: 2,
            minDayInRightSide: 3,
            minDayInLeftSide: 3,
        }
    ];



    // const now = moment();
    const now = date ? moment(date) : moment();
    if (!now.isValid()) {
        throw new Error('Invalid date format');
    }

    console.log(`Now is ${now.format('YYYY-MM-DD HH:mm:ss')}`);
    const dropReboundPeriods: DropReboundPeriod[] = [];
    for (const target of targets) {

        console.log(`Analyzing ${target.symbol}...`);
        const allCandlesticks = await fetchCandlestickData(target.symbol, '1d', now.clone().subtract(target.maxDayToCheck, 'd').toDate().getTime(), now.clone().add(1, 'd').toDate().getTime());
        if (allCandlesticks.length === 0) {
            console.log(`No data found for ${target.symbol}`);
            return;
        }

        // console.log(JSON.stringify(allCandlesticks, null, 2))

        for (const dayToBackward of _.range(target.minDayInRightSide, target.maxDayToCheck + 1)) {



            const rightCandlesticks = allCandlesticks.slice(-dayToBackward);
            const rightTrend = analyzeTrend(rightCandlesticks, target.precentCountAsUpward);


            if (rightTrend.direction === 'upward') {
                // console.log(`Day ${dayToBackward} - ${rightTrend.direction} - ${rightTrend.percentage}%`);
                const rightSideHighestPrice = _.maxBy(rightCandlesticks, c => c.highPrice);

                if (!rightSideHighestPrice) {
                    throw new Error('Cannot find the highest price in the right candlesticks.');
                }

                const allLeftCandlesticks = allCandlesticks.slice(0, -dayToBackward);
                for (const dayToBackwardForLeftCandlesticks of _.range(target.minDayInLeftSide, target.maxDayToCheck + 1)) {
                    const leftCandlesticks = allLeftCandlesticks.slice(-dayToBackwardForLeftCandlesticks);
                    const leftTrend = analyzeTrend(leftCandlesticks);
                    // console.log()
                    // console.log(`Day ${dayToBackwardForLeftCandlesticks} - Left trend: ${leftTrend.direction} - ${leftTrend.percentage}%`);
                    if (leftTrend.direction === 'downward') {

                        const leftSideHighestPrice = _.maxBy(leftCandlesticks, c => c.highPrice);
                        if (!leftSideHighestPrice) {
                            throw new Error('Cannot find the lowest price in the left candlesticks.');
                        }
                        if (rightSideHighestPrice.highPrice > leftSideHighestPrice.highPrice) {
                            console.log('------------------------------------')
                            console.log(`Found Drop period from ${moment(leftCandlesticks[0].openTime).format('YYYY-MM-DD')} to ${moment(leftCandlesticks[leftCandlesticks.length - 1].openTime).format('YYYY-MM-DD')}`);
                            console.log(`Found Rebound period from ${moment(rightCandlesticks[0].openTime).format('YYYY-MM-DD')} to ${moment(rightCandlesticks[rightCandlesticks.length - 1].openTime).format('YYYY-MM-DD')}`);
                            console.log(`Found ${target.symbol} at ${rightSideHighestPrice.highPrice}@${moment(rightSideHighestPrice.openTime).format('YYYY-MM-DD')} 📈 ${leftSideHighestPrice.highPrice}@${moment(leftSideHighestPrice.openTime).format('YYYY-MM-DD')}`);




                            dropReboundPeriods.push({
                                leftSideStart: leftCandlesticks[0].openTime,
                                leftSideEnd: leftCandlesticks[leftCandlesticks.length - 1].openTime,
                                leftSideHighestPrice: leftSideHighestPrice.highPrice,
                                rightSideStart: rightCandlesticks[0].openTime,
                                rightSideEnd: rightCandlesticks[rightCandlesticks.length - 1].openTime,
                                rightSideHighestPrice: rightSideHighestPrice.highPrice,
                            });
                            console.log('Type generated successfully.');
                        }
                    }
                }


            }


        }


    }
    return dropReboundPeriods;
};


