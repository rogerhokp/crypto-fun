import WebSocket from 'ws';
import * as fs from 'fs';
import _ from 'lodash';
import Big from 'big.js';
import colors from 'colors';
import { TradePayload, LastTrade } from './hashkey.d';

const CONFIG = {
    allowedTradingTimeDifferenceInSec: 2,
    allowedTradingPriceDifferenceInPercentage: 0.4,
}
const ws = new WebSocket('wss://stream-pro.hashkey.com/quote/ws/v1');

 

const converHKDToUSD = (hkd: number) => {
    //use higher value to protect from loss
    return new Big(hkd).div(7.9).toNumber();
}


(async () => {

    let btcHkdLastTrade: LastTrade;
    let btcUsdLastTrade: LastTrade;

    await new Promise(r => ws.on('open', function open() {
        ws.send(JSON.stringify({
            "ping": Date.now()
        }));
        r(null);
    }));
    console.log('Connected to the server');

    ws.on('message', function incoming(data) {

        fs.appendFileSync('./tmp/message.log', data.toString() + '\n');
        const payload = JSON.parse(data.toString());

        if (payload.topic == 'trade' && payload.sendTime && payload.data && payload.data.length > 0) {
            // console.log(`Received from server @ ${new Date(payload.sendTime).toISOString()}`);
            const tradePayload = payload as TradePayload;

            const symbol = tradePayload.symbol;
            let avgPrice = new Big(_.sum(tradePayload.data.map(trade => parseFloat(trade.p)))).div(tradePayload.data.length).toNumber();
            let latestTs = _.maxBy(tradePayload.data, trade => trade.t)?.t || 0;
            if (symbol === 'BTCHKD') {
                avgPrice = converHKDToUSD(avgPrice);
                btcHkdLastTrade = {
                    time: latestTs,
                    price: avgPrice,
                    symbol: symbol
                }
            } else {
                btcUsdLastTrade = {
                    time: latestTs,
                    price: avgPrice,
                    symbol: symbol
                }
            }


            // console.log(`Symbol: ${symbol}, Average Price: USD ${avgPrice}`);
        }


        let opporturnityFound = false
        if (btcHkdLastTrade && btcUsdLastTrade) {
            const tradeTimeDifferenceInSec = Math.abs(btcUsdLastTrade.time - btcHkdLastTrade.time) / 1000;
            const diffInPercentage = Math.abs(((btcUsdLastTrade.price - btcHkdLastTrade.price) / btcHkdLastTrade.price) * 100);

            console.log(`
                ${new Date().toString()}----
                USD vs HKD Last Trade Time Difference
                TimeDifference(Sec): ${tradeTimeDifferenceInSec},
                BTCUSD: ${btcUsdLastTrade.price},
                BTCHKD: ${btcHkdLastTrade.price},
                Difference: ${btcUsdLastTrade.price - btcHkdLastTrade.price} USD
                Difference in Percentage: ${diffInPercentage}%
                            `);
            if (tradeTimeDifferenceInSec <= CONFIG.allowedTradingTimeDifferenceInSec) {
                if (diffInPercentage >= CONFIG.allowedTradingPriceDifferenceInPercentage) {



                    console.log(colors.red(`Opportunity Found ${CONFIG.allowedTradingPriceDifferenceInPercentage}%`));
                    opporturnityFound = true;
                    let buySymbol = '';
                    let sellSymbol = '';
                    if (btcHkdLastTrade.price > btcUsdLastTrade.price) {
                        console.log(colors.red(`Buy BTCUSD and Sell BTCHKD`));
                        buySymbol = 'BTCUSD';
                        sellSymbol = 'BTCHKD';
                    } else {
                        console.log(colors.yellow(`Buy BTCHKD and Sell BTCUSD`));
                        buySymbol = 'BTCHKD';
                        sellSymbol = 'BTCUSD';
                    }


                    console.log(`
                    Buy Symbol: ${buySymbol},
                    Buy Price: ${btcUsdLastTrade.price},
                    Sell Symbol: ${sellSymbol},
                    Sell Price: ${btcHkdLastTrade.price}
                    `);




                }
            }



        }

        if (!opporturnityFound) {
            console.log(colors.green(`No Opportunity Found`));
        }


        // console.log('Message from server:', JSON.stringify(payload, null, 2));
    });

    ws.on('close', function close() {
        console.log('Disconnected from the server');
    });

    ws.on('error', function error(err) {
        console.error('WebSocket error:', err);
    });





    ws.send(JSON.stringify({
        "symbol": "BTCUSD",
        "topic": "trade",
        "event": "sub",
        "params": {
            "binary": false
        },
        "id": 1
    }))

    ws.send(JSON.stringify({
        "symbol": "BTCHKD",
        "topic": "trade",
        "event": "sub",
        "params": {
            "binary": false
        },
        "id": 1
    }))

    while (true) {
        await new Promise(r => setTimeout(r, 1000));
        ws.send(JSON.stringify({
            "ping": Date.now()
        }))
    }

})();