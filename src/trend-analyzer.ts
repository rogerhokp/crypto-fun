import { Candlestick } from './type';




export function analyzeWeeklyTrend(candles: Candlestick[], totalPercentageChangeTolerance: number = 5): string {
  let actTotalPercentageChange = 0;

  candles.forEach(candle => {
    const open = candle.openPrice.toNumber();
    const close = candle.closePrice.toNumber();
    const dailyChange = ((close - open) / open) * 100;
    actTotalPercentageChange += dailyChange;
  });

  const totalPercentageChanged = Math.abs(actTotalPercentageChange);
  if (totalPercentageChanged > totalPercentageChangeTolerance && actTotalPercentageChange > 0) {
    return 'upward';
  } else if (totalPercentageChanged > totalPercentageChangeTolerance && actTotalPercentageChange < 0) {
    return 'downward';
  } else {
    return 'neutral';
  }
}

