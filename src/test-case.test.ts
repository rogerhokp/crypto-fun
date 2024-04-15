
import { Candlestick } from './type';
import { fetchCandlestickData } from './market-data';
import { analyzeWeeklyTrend } from './trend-analyzer';



const data = [
    {
        symbol: 'BTCUSDT',
        interval: '1d',
        startTime: new Date('2023-12-05').getTime(),
        endTime: new Date('2024-01-12').getTime(),
        expected: 'neutral',
    }, {
        symbol: 'BTCUSDT',
        interval: '1d',
        startTime: new Date('2024-04-02').getTime(),
        endTime: new Date('2024-04-13').getTime(),
        expected: 'downward',
    }, {
        symbol: 'BTCUSDT',
        interval: '1d',
        startTime: new Date('2024-01-23').getTime(),
        endTime: new Date('2024-01-31').getTime(),
        expected: 'upward',
    }
    , {
        symbol: 'BTCUSDT',
        interval: '1d',
        startTime: new Date('2024-02-13').getTime(),
        endTime: new Date('2024-02-23').getTime(),
        expected: 'neutral',
    }, {
        symbol: 'BTCUSDT',
        interval: '1d',
        startTime: new Date('2024-01-09').getTime(),
        endTime: new Date('2024-01-23').getTime(),
        expected: 'downward',
    }

]
describe('run', () => {
    it('should analyze weekly trend', async () => {

        for (const d of data) {

            const candles = await fetchCandlestickData(d.symbol, d.interval, d.startTime, d.endTime);
            // console.log(JSON.stringify(candles, null, 2))
            const result = analyzeWeeklyTrend(candles);
            expect(result.direction).toBe(d.expected);
        }

    });
});