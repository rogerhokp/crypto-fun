
import { Candlestick } from './type';
import { fetchCandlestickData } from './market-data';
import { analyzeWeeklyTrend } from './trend-analyzer';
import Color from 'colors';
import moment from 'moment';
import _ from 'lodash';


const targets = [
    {
        symbol: 'BTCUSDT',
        splitPointInDayBefore: 5,//左右分割點
        maxDayToCheckDownward: 60,
        precentCountAsUpward: 2,
    }
];


(async () => {

    // const now = moment();
    const now = moment('2024-01-29');

    for (const target of targets) {

        console.log(`Analyzing ${target.symbol}...`);
        for (const splitPointInDayBefore of _.range(target.splitPointInDayBefore, target.maxDayToCheckDownward)) {


            console.log(Color.yellow(`Analyzing ${splitPointInDayBefore} days as downward...`));


            //TODO should record all upward trends 
            //is past x days upward?
            let upwardStartDate = null;
            let upwardFoundResult = null;
            let largestUpwardPrecentage = 0;
            let upwardCandles: Candlestick[] = [];
            for (const daysCountAsUpward of _.range(1, splitPointInDayBefore)) {
                const expectedUpwardDate = now.clone().subtract(daysCountAsUpward, 'days').startOf('day');
                // console.log(`Analyzing ${daysCountAsUpward} days as upward from ${expectedUpwardDate.format('YYYY-MM-DD')}...`);
                const candles = await fetchCandlestickData(target.symbol, '1d', expectedUpwardDate.toDate().getTime(), now.clone().toDate().getTime());
                const result = analyzeWeeklyTrend(candles, target.precentCountAsUpward);
                if (result.direction === 'upward' && result.percentage > largestUpwardPrecentage) {
                    upwardStartDate = expectedUpwardDate;
                    upwardFoundResult = result;
                    upwardCandles = candles;
                }
            }
            if (upwardFoundResult && upwardStartDate) {
                console.log(`Upward Result: ${JSON.stringify(upwardFoundResult, null, 2)}`);
                console.log(`Upward trend found from ${upwardStartDate.format('YYYY-MM-DD')} to ${now.format('YYYY-MM-DD')}`);
            } else {
                console.log(`No upward trend found`);
                continue
            }



            //TODO loop and check all upward trends

            

            let earliestDate = null;
            let foundResult = null;
            let largestDropPrecentage = 0;
            let downwardCandles: Candlestick[] = [];
            const endTime = upwardStartDate.clone().subtract(1, 'day').endOf('day').toDate().getTime();
            for (const dayBackward of _.range(splitPointInDayBefore, target.maxDayToCheckDownward)) {
                const startTime = upwardStartDate.clone().subtract(dayBackward, 'days').startOf('day').toDate().getTime();
                // console.log(`Analyzing ${dayBackward} days from ${moment(startTime).format('YYYY-MM-DD')} to ${moment(endTime).format('YYYY-MM-DD')}...`);

                const candles = await fetchCandlestickData(target.symbol, '1d', startTime, endTime);
                const result = analyzeWeeklyTrend(candles);
                if (result.direction === 'downward' && result.percentage > largestDropPrecentage) {
                    foundResult = result;
                    earliestDate = moment(startTime);
                    largestDropPrecentage = result.percentage;
                    downwardCandles = candles;
                }
            }

            if (earliestDate && foundResult) {
                console.log(`found downward period from ${earliestDate.format('YYYY-MM-DD')} to ${upwardStartDate.format('YYYY-MM-DD')}`)
                console.log(`It's ${now.diff(earliestDate, 'days')} days ago`);
                console.log(`Result: ${JSON.stringify(foundResult, null, 2)}`);
            } else {
                console.log(`No downward trend found`);
                continue
            }

            //find the highest point in the downward period
            const higestPriceInDownwardPeriod = _.maxBy(downwardCandles, c => c.highPrice)
            if (!higestPriceInDownwardPeriod) {
                throw new Error('No higest price found in downward period');
            }
            console.log(`Highest price in downward period: ${higestPriceInDownwardPeriod.highPrice}`)


            //find the highest point in the upward period
            const highestPriceInUpwardPeriod = _.maxBy(upwardCandles, c => c.highPrice)
            if (!highestPriceInUpwardPeriod) {
                throw new Error('No highest price found in upward period');
            }
            console.log(`Highest price in upward period: ${highestPriceInUpwardPeriod.highPrice}`)


            //要突破前高

            console.log(`Previous high price: ${higestPriceInDownwardPeriod.highPrice}`)
            console.log(`Current high price: ${highestPriceInUpwardPeriod.highPrice}`)
            console.log(`downward period: ${earliestDate.format('YYYY-MM-DD')} to ${upwardStartDate.format('YYYY-MM-DD')}`)
            console.log(`upward period: ${upwardStartDate.format('YYYY-MM-DD')} to ${now.format('YYYY-MM-DD')}`)

            if (earliestDate && highestPriceInUpwardPeriod.highPrice > higestPriceInDownwardPeriod.highPrice) {
                console.log(Color.green('Breakthrough!'))
                break;
            } else {
                console.log(Color.red('No breakthrough'))
            }


        }

    }



})()