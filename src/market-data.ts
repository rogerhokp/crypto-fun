import axios from 'axios';
import Big from 'big.js';
import { Candlestick } from './type';

export async function fetchCandlestickData(symbol: string, interval: string, startTime: number, endTime: number): Promise<Candlestick[]> {
    const baseUrl = 'https://api.binance.com';
    const endpoint = '/api/v3/klines';
    const url = `${baseUrl}${endpoint}`;

    try {
        const response = await axios.get(url, {
            params: {
                symbol: symbol,
                interval: interval,
                startTime: startTime,
                endTime: endTime
            }
        });

        // console.log(response.data);

        // [
        //     [
        //       1499040000000,      // Kline open time
        //       "0.01634790",       // Open price
        //       "0.80000000",       // High price
        //       "0.01575800",       // Low price
        //       "0.01577100",       // Close price
        //       "148976.11427815",  // Volume
        //       1499644799999,      // Kline Close time
        //       "2434.19055334",    // Quote asset volume
        //       308,                // Number of trades
        //       "1756.87402397",    // Taker buy base asset volume
        //       "28.46694368",      // Taker buy quote asset volume
        //       "0"                 // Unused field, ignore.
        //     ]
        //   ]

        const candlestickData: Candlestick[] = response.data.map((candlestick: number[] | string[]) => {
            const [
                openTime,
                openPrice,
                highPrice,
                lowPrice,
                closePrice,
                volume,
                closeTime,
                quoteAssetVolume,
                numberOfTrades,
                takerBuyBaseAssetVolume,
                takerBuyQuoteAssetVolume,
                unusedField
            ] = candlestick;
            return {
                openTime: new Date(openTime),
                openPrice: Big(openPrice),
                highPrice: Big(highPrice),
                lowPrice: Big(lowPrice),
                closePrice: Big(closePrice),
                volume: Big(volume),
                closeTime : new Date(closeTime),
                quoteAssetVolume: Big(quoteAssetVolume),
                numberOfTrades,
                takerBuyBaseAssetVolume: Big(takerBuyBaseAssetVolume),
                takerBuyQuoteAssetVolume: Big(takerBuyQuoteAssetVolume),
                unusedField
            };
        });
        return candlestickData;
    } catch (error) {
        console.error('Error fetching candlestick data:', error);
        throw error;
    }
}
//check if cli has arguments --test
if (process.argv.includes('--test')) {

    // Example usage
    const symbol = 'ETHUSDT';
    const interval = '1d'; // Daily intervals. You can change this to '1h' for hourly data, etc.
    const startTime = new Date('2024-04-15').getTime(); // Start date
    const endTime = new Date('2024-04-16').getTime(); // End date


    (async () => {
        try {
            const candlestickData = await fetchCandlestickData(symbol, interval, startTime, endTime);
            console.log(candlestickData.map(candlestick => ({
                ...candlestick,
                openPrice: candlestick.openPrice.toFixed(2),
                highPrice: candlestick.highPrice.toFixed(2),
                lowPrice: candlestick.lowPrice.toFixed(2),
                closePrice: candlestick.closePrice.toFixed(2),
                volume: candlestick.volume.toFixed(2),
                quoteAssetVolume: candlestick.quoteAssetVolume.toFixed(2),
                takerBuyBaseAssetVolume: candlestick.takerBuyBaseAssetVolume.toFixed(2),
                takerBuyQuoteAssetVolume: candlestick.takerBuyQuoteAssetVolume.toFixed(2)
            })));
        } catch (error) {
            console.error('Error fetching candlestick data:', error);
        }
    })();

}
