import { TaxLot } from '../types/financial';

export interface AnnualTaxSimulationPoint {
  year: number;
  age: number;
  phase: 'Accumulation' | 'Retirement';
  grossProceedsHarvested: number;
  netCashForExpenses: number;
  realizedSTGain: number;
  realizedLTGain: number;
  totalRealizedGain: number;
  indexedZeroCapGainLimit: number; // Inflation-adjusted 0% Federal Cap Gains Limit
  indexedFifteenCapGainLimit: number; // Inflation-adjusted 15% Federal Cap Gains Limit
  socialSecurityColaBenefit: number; // SS Benefit with COLA applied
  federalTax: number;
  californiaTax: number;
  totalTax: number;
  effectiveTaxRate: number;
  lotsSoldThisYear: number;
  remainingLotsCount: number;
  remainingPortfolioValue: number;
}

export function runLifetimeTaxSimulation(
  taxLots: TaxLot[],
  currentAge: number,
  retireYear: number,
  retireMonth: number,
  baseAnnualExpenses: number,
  inflationRate: number,
  ssAnnualBenefit: number,
  ssStartAge: number,
  ssColaRate: number = 0.025 // Annual Social Security Cost of Living Adjustment
): AnnualTaxSimulationPoint[] {
  const simulation: AnnualTaxSimulationPoint[] = [];
  const startYear = 2026;

  // IRS Federal Capital Gains Brackets in 2026 (Single filer baseline)
  const baseZeroCapGainLimit = 47025;
  const baseFifteenCapGainLimit = 518900;

  // Clone active tax lots inventory
  let inventory = taxLots.map(l => ({ ...l }));

  for (let age = currentAge; age <= 90; age++) {
    const projectionYear = startYear + (age - currentAge);
    const yearsFromStart = age - currentAge;
    const isRetirement = projectionYear > retireYear || (projectionYear === retireYear && retireMonth <= 4);

    const inflationFactor = Math.pow(1 + inflationRate, yearsFromStart);

    // 1. Year-Over-Year Capital Gains Bracket Indexing
    const indexedZeroLimit = Math.round(baseZeroCapGainLimit * inflationFactor);
    const indexedFifteenLimit = Math.round(baseFifteenCapGainLimit * inflationFactor);

    // 2. Social Security Cost of Living Adjustment (COLA) Compounding
    let ssColaBenefit = 0;
    if (age >= ssStartAge) {
      // Benefit compounds by COLA every single year from 2026
      const colaYears = projectionYear - startYear;
      ssColaBenefit = Math.round(ssAnnualBenefit * Math.pow(1 + ssColaRate, colaYears));
    }

    let grossHarvested = 0;
    let netCashNeeded = 0;
    let stGain = 0;
    let ltGain = 0;
    let fedTax = 0;
    let caTax = 0;
    let lotsSold = 0;

    if (!isRetirement) {
      // Accumulation phase: standard salary mode, lots appreciate
      const remainingVal = inventory.reduce((sum, l) => sum + (l.shares * l.currentPrice * Math.pow(1.06, yearsFromStart)), 0);
      simulation.push({
        year: projectionYear,
        age,
        phase: 'Accumulation',
        grossProceedsHarvested: 0,
        netCashForExpenses: 0,
        realizedSTGain: 0,
        realizedLTGain: 0,
        totalRealizedGain: 0,
        indexedZeroCapGainLimit: indexedZeroLimit,
        indexedFifteenCapGainLimit: indexedFifteenLimit,
        socialSecurityColaBenefit: 0,
        federalTax: 0,
        californiaTax: 0,
        totalTax: 0,
        effectiveTaxRate: 0,
        lotsSoldThisYear: 0,
        remainingLotsCount: inventory.filter(l => l.shares > 0.001).length,
        remainingPortfolioValue: Math.round(remainingVal)
      });
    } else {
      // Retirement Phase: Harvest tax lots to match expenses after COLA Social Security
      const totalLivingExpensesNeeded = baseAnnualExpenses * inflationFactor;
      netCashNeeded = Math.max(0, totalLivingExpensesNeeded - ssColaBenefit);

      if (netCashNeeded > 0) {
        // Grow active lots by 5% annual return
        inventory = inventory.map(l => ({
          ...l,
          currentPrice: l.currentPrice * 1.05
        }));

        // Sort active lots HIFO (highest cost basis per share first for maximum tax efficiency)
        const activeLots = inventory
          .filter(l => l.shares > 0.0001)
          .sort((a, b) => b.costBasisPerShare - a.costBasisPerShare);

        let cashHarvested = 0;
        let targetCashToHarvest = netCashNeeded;

        for (const lot of activeLots) {
          if (cashHarvested >= targetCashToHarvest) break;

          const lotPrice = lot.currentPrice;
          const neededFromThisLot = targetCashToHarvest - cashHarvested;

          const sharesToSell = Math.min(lot.shares, neededFromThisLot / lotPrice);
          const grossFromLot = sharesToSell * lotPrice;
          const costBasisFromLot = sharesToSell * lot.costBasisPerShare;
          const gainFromLot = grossFromLot - costBasisFromLot;

          if (lot.term === 'Long Term') {
            ltGain += gainFromLot;
          } else {
            stGain += gainFromLot;
          }

          lot.shares -= sharesToSell;
          cashHarvested += grossFromLot;
          lotsSold += 1;
        }

        const totalGainIncurred = Math.max(0, stGain + ltGain);

        // Apply Year-over-Year Indexed Capital Gains Brackets for Federal Tax
        if (totalGainIncurred > 0) {
          // LT Capital Gains taxed at 0% up to indexedZeroLimit, 15% up to indexedFifteenLimit, 20% above
          let ltTaxableAt0 = Math.min(ltGain, indexedZeroLimit);
          let ltTaxableAt15 = Math.max(0, Math.min(ltGain - ltTaxableAt0, indexedFifteenLimit - indexedZeroLimit));
          let ltTaxableAt20 = Math.max(0, ltGain - indexedZeroLimit - ltTaxableAt15);

          // 3.8% Net Investment Income Tax (NIIT) for gains over $200k threshold
          let niitTaxable = Math.max(0, totalGainIncurred - 200000);
          let niitTax = niitTaxable * 0.038;

          // Short-Term gains taxed at ordinary rates (~22%)
          let stTax = stGain * 0.22;

          fedTax = Math.round((ltTaxableAt15 * 0.15) + (ltTaxableAt20 * 0.20) + niitTax + stTax);

          // California State Tax (CA taxes all capital gains as ordinary income ~9.3% to 13.3%)
          caTax = Math.round(totalGainIncurred * 0.093);
        }

        grossHarvested = Math.round(cashHarvested);
      }

      const totTax = fedTax + caTax;
      const totGain = Math.round(stGain + ltGain);
      const effTaxRate = grossHarvested > 0 ? (totTax / grossHarvested) : 0;

      const remainingVal = inventory.reduce((sum, l) => sum + (l.shares * l.currentPrice), 0);

      simulation.push({
        year: projectionYear,
        age,
        phase: 'Retirement',
        grossProceedsHarvested: grossHarvested,
        netCashForExpenses: Math.round(netCashNeeded),
        realizedSTGain: Math.round(stGain),
        realizedLTGain: Math.round(ltGain),
        totalRealizedGain: totGain,
        indexedZeroCapGainLimit: indexedZeroLimit,
        indexedFifteenCapGainLimit: indexedFifteenLimit,
        socialSecurityColaBenefit: ssColaBenefit,
        federalTax: fedTax,
        californiaTax: caTax,
        totalTax: totTax,
        effectiveTaxRate: Math.round(effTaxRate * 1000) / 10,
        lotsSoldThisYear: lotsSold,
        remainingLotsCount: inventory.filter(l => l.shares > 0.001).length,
        remainingPortfolioValue: Math.round(remainingVal)
      });
    }
  }

  return simulation;
}
