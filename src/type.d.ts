export type Candlestick = {
    openTime: Date;
    openPrice: Big;
    highPrice: Big;
    lowPrice: Big;
    closePrice: Big;
    volume: Big;
    closeTime: Date;
    quoteAssetVolume: Big;
    numberOfTrades: number;
    takerBuyBaseAssetVolume: Big;
    takerBuyQuoteAssetVolume: Big;
    unusedField: string;
};
