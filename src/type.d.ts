export type Candlestick = {
    openTime: Date;
    openPrice: Big;
    highPrice: Big;
    lowPrice: Big;
    closePrice: Big;
    volume: Big;
    closeTime: number;
    quoteAssetVolume: Big;
    numberOfTrades: number;
    takerBuyBaseAssetVolume: Big;
    takerBuyQuoteAssetVolume: Big;
    unusedField: string;
};
