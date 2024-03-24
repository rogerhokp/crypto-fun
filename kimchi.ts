import WebSocket from 'ws';
import * as fs from 'fs';
import _ from 'lodash';
import Big from 'big.js';
import colors from 'colors';
import { TradePayload, LastTrade } from './hashkey.d';
import winston from 'winston';
import * as Xe from './xe';
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info', // Default to 'info'
    format: winston.format.json(),
    transports: [
        new winston.transports.Console()
    ],
});


const upBitWs = new WebSocket('wss://api.upbit.com/websocket/v1');
const hashKeyWs = new WebSocket('wss://stream-pro.hashkey.com/quote/ws/v1');

const hashKeyLatestPrice: { [code: string]: number } = {
    'BTC': 0,
    'ETH': 0,
}
const upBitLatestPrice: { [code: string]: number } = {
    'BTC': 0,
    'ETH': 0,
}





const printDiff = () => {
    const koBtcPrice = upBitLatestPrice['BTC'];
    const hkBtcPrice = hashKeyLatestPrice['BTC'];

    if (koBtcPrice > 0 && hkBtcPrice > 0) {
        logger.info(`[${new Date().toISOString()}] BTC - ${koBtcPrice} vs ${hkBtcPrice} USD / ${Math.abs(koBtcPrice - hkBtcPrice) / Math.min(koBtcPrice, hkBtcPrice) * 100}%`);
    }

    const koEthPrice = upBitLatestPrice['ETH'];
    const hkEthPrice = hashKeyLatestPrice['ETH'];
    if (koEthPrice > 0 && hkEthPrice > 0) {
        logger.info(`[${new Date().toISOString()}] ETH - ${koEthPrice} vs ${hkEthPrice} USD / ${Math.abs(koEthPrice - hkEthPrice) / Math.min(koEthPrice, hkEthPrice) * 100}%`);
    }

}



upBitWs.on('message', function incoming(data) {
    const payload = JSON.parse(data.toString());
    logger.debug('KO Received:', JSON.stringify(payload, null, 2));

    const code = payload.code.split('-')[1] + '';
    const tradePrice = Xe.converKRWToUSD(Number(payload.trade_price));
    upBitLatestPrice[code] = tradePrice;
    logger.debug(`KO: Symbol: ${code}, Price: USD ${tradePrice}`);
    printDiff();

});


hashKeyWs.on('message', function incoming(data) {

    const payload = JSON.parse(data.toString());
    logger.debug('HK Received:', payload)

    if (payload.topic == 'trade' && payload.sendTime && payload.data && payload.data.length > 0) {
        // logger.debug(`Received from server @ ${new Date(payload.sendTime).toISOString()}`);
        const tradePayload = payload as TradePayload;

        const symbol = tradePayload.symbol;
        let avgPrice = new Big(_.sum(tradePayload.data.map(trade => parseFloat(trade.p)))).div(tradePayload.data.length).toNumber();
        // let latestTs = _.maxBy(tradePayload.data, trade => trade.t)?.t || 0;
        if (symbol.includes('BTC')) {
            hashKeyLatestPrice.BTC = Xe.converHKDToUSD(avgPrice);
        } else if (symbol.includes('ETH')) {
            hashKeyLatestPrice.ETH = Xe.converHKDToUSD(avgPrice);
        }

        logger.debug(`HK: Symbol: ${symbol}, Average Price: USD ${avgPrice}`);
        printDiff();
    }

});

upBitWs.on('close', function close() {
    logger.debug('Disconnected from the server');
});

upBitWs.on('error', function error(err) {
    console.error('WebSocket error:', err);
});


hashKeyWs.on('close', function close() {
    logger.debug('Disconnected from the server');
});

hashKeyWs.on('error', function error(err) {
    console.error('WebSocket error:', err);
});


process.on('SIGINT', function () {
    logger.info('Caught interrupt signal');
    upBitWs.close();
    hashKeyWs.close();
    process.exit();
});


(async () => {


    logger.info('Connecting to the UpBit server');
    await new Promise(r => upBitWs.on('open', function open() {
        r(null);
    }));
    logger.info('Connecting to the HashKey server');
    await new Promise(r => hashKeyWs.on('open', function open() {
        // hashKeyWs.send(JSON.stringify({
        //     "ping": Date.now()
        // }));
        r(null);
    }));
    logger.info('Connected to the server');



    upBitWs.send(JSON.stringify([
        {
            "ticket": "test example"
        },
        {
            "type": "trade",
            "codes": [
                "KRW-BTC",
                "KRW-ETH"
            ]
        },
        {
            "format": "DEFAULT"
        }
    ]
    ))



    hashKeyWs.send(JSON.stringify({
        "symbol": "BTCHKD",
        "topic": "trade",
        "event": "sub",
        "params": {
            "binary": false
        },
        "id": 1
    }))

    hashKeyWs.send(JSON.stringify({
        "symbol": "ETHHKD",
        "topic": "trade",
        "event": "sub",
        "params": {
            "binary": false
        },
        "id": 1
    }))



    logger.info('Subscribed to the server');
    while (true) {
        await new Promise(r => setTimeout(r, 1000));
        hashKeyWs.send(JSON.stringify({
            "ping": Date.now()
        }))
    }

})();