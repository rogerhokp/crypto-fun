import Big from 'big.js';

export const converHKDToUSD = (hkd: number) => {
    return new Big(hkd).mul(0.13).toNumber();
}

export const converKRWToUSD = (krw: number) => {
    return new Big(krw).mul(0.00074).toNumber();
}