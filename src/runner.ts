
import { Candlestick } from './type';
import { fetchCandlestickData } from './market-data';
import { analyzeWeeklyTrend } from './trend-analyzer';
import { Color } from 'colors';
import moment from 'moment';
import _ from 'lodash';


const targets = [
    {
        symbol: 'BTCUSDT',
        minDayToAnalyze: 5,
        maxDayToAnalyze: 21,
        minDaysCountAsUpward: 2,
        maxDaysCountAsUpward: 3,
        precentCountAsUpward: 2,
    }
];


(async () => {

    // const now = moment();
    const now = moment('2024-03-25');

    for (const target of targets) {

        console.log(`Analyzing ${target.symbol}...`);

        //Find the upward trend period
        let upwardStartDate = null;
        let upwardFoundResult = null;
        let largestUpwardPrecentage = 0;
        for (const daysCountAsUpward of _.range(target.minDaysCountAsUpward, target.maxDaysCountAsUpward)) {
            const expectedUpwardDate = now.clone().subtract(daysCountAsUpward, 'days').startOf('day');
            console.log(`Analyzing ${daysCountAsUpward} days as upward from ${expectedUpwardDate.format('YYYY-MM-DD')}...`);
            const candles = await fetchCandlestickData(target.symbol, '1d', expectedUpwardDate.toDate().getTime(), now.clone().toDate().getTime());
            const result = analyzeWeeklyTrend(candles, target.precentCountAsUpward);
            if (result.direction === 'upward' && result.percentage > largestUpwardPrecentage) {
                upwardStartDate = expectedUpwardDate;
                upwardFoundResult = result;
            }
        }
        if (upwardFoundResult && upwardStartDate) {
            console.log(`Upward Result: ${JSON.stringify(upwardFoundResult, null, 2)}`);
            console.log(`Upward trend found from ${upwardStartDate.format('YYYY-MM-DD')} to ${now.format('YYYY-MM-DD')}`);
        } else {
            console.log(`No upward trend found`);
            continue
        }



        // let earliestDate = null;
        // let foundResult = null;
        // let largestDropPrecentage = 0;
        // const endTime = expectedUpwardDate.clone().endOf('day').toDate().getTime();
        // for (const dayBackward of _.range(target.minDayToAnalyze, target.maxDayToAnalyze)) {
        //     const startTime = expectedUpwardDate.clone().subtract(dayBackward, 'days').startOf('day').toDate().getTime();
        //     console.log(`Analyzing ${dayBackward} days from ${moment(startTime).format('YYYY-MM-DD')} to ${moment(endTime).format('YYYY-MM-DD')}...`);

        //     const candles = await fetchCandlestickData(target.symbol, '1d', startTime, endTime);
        //     const result = analyzeWeeklyTrend(candles);
        //     console.log(`Result: ${result}`);
        //     if (result.direction === 'downward' && result.percentage > largestDropPrecentage) {
        //         foundResult = result;
        //         earliestDate = moment(startTime);
        //         largestDropPrecentage = result.percentage;
        //     }
        // }

        // if (earliestDate && foundResult) {
        //     console.log(`found downward period from ${earliestDate.format('YYYY-MM-DD')} to ${expectedUpwardDate.format('YYYY-MM-DD')}`)
        //     console.log(`It's ${now.diff(earliestDate, 'days')} days ago`);
        //     console.log(`Result: ${JSON.stringify(foundResult, null, 2)}`);
        // }

        //Check 拎個period 入面最高點 as 前高
        //要突破前高



    }



})()