import { useSelector } from 'react-redux';

const useCurrency = () => {
  const { baseCurrency, exchangeRates } = useSelector((state) => state.nav);

  // Currency label to code mapping (e.g., "USD ($)" -> "USD")
  const getCurrencyCode = (label) => {
    if (!label) return 'USD';
    const match = label.match(/^[A-Z]{3}/);
    return match ? match[0] : 'USD';
  };

  const getCurrencySymbol = (label) => {
    if (!label) return '$';
    const match = label.match(/\((.+)\)/);
    return match ? match[1] : '$';
  };

  const currentCode = getCurrencyCode(baseCurrency);
  const currentSymbol = getCurrencySymbol(baseCurrency);

  /**
   * Formats a number according to the current base currency.
   * @param {number} amount - The amount in USD (internal reference) or relative to rates.
   * @param {boolean} convertFromUSD - If true, assumes 'amount' is in USD and converts it to baseCurrency.
   */
  const format = (amount, convertFromUSD = true) => {
    let value = amount || 0;
    
    if (convertFromUSD) {
      const rate = exchangeRates[currentCode] || 1;
      value = value * rate;
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currentCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value).replace(/[A-Z]{3}/, currentSymbol).trim();
  };

  /**
   * Just get the symbol
   */
  const symbol = currentSymbol;

  /**
   * Convert between currencies
   */
  const convert = (amount, fromCode, toCode) => {
    if (fromCode === toCode) return amount;
    const usdAmount = amount / (exchangeRates[fromCode] || 1);
    return usdAmount * (exchangeRates[toCode] || 1);
  };

  return {
    currency: baseCurrency,
    code: currentCode,
    symbol,
    format,
    convert,
    rates: exchangeRates
  };
};

export default useCurrency;
