import { Candlestick } from './type';




export function analyzeWeeklyTrend(candles: Candlestick[], totalPercentageChangeTolerance: number = 5): { direction: 'upward' | 'downward' | 'neutral', percentage: number } {
  let actTotalPercentageChange = 0;

  candles.forEach(candle => {
    const open = candle.openPrice.toNumber();
    const close = candle.closePrice.toNumber();
    const dailyChange = ((close - open) / open) * 100;
    actTotalPercentageChange += dailyChange;
  });

  const totalPercentageChanged = Math.abs(actTotalPercentageChange);
  console.log(`Total percentage changed: ${totalPercentageChanged}`)
  if (totalPercentageChanged > totalPercentageChangeTolerance && actTotalPercentageChange > 0) {
    return { direction: 'upward', percentage: totalPercentageChanged };
  } else if (totalPercentageChanged > totalPercentageChangeTolerance && actTotalPercentageChange < 0) {
    return { direction: 'downward', percentage: totalPercentageChanged };
  } else {
    return { direction: 'neutral', percentage: totalPercentageChanged };
  }
}

