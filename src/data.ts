import { DataMetrics, DataProfiling, DataResult, Insight, SalesRecord } from './types';

const COLUMN_ALIASES: Record<string, string[]> = {
  order_id: ['order id', 'order', 'id', 'invoice', 'invoice id', 'transaction', 'transaction id'],
  order_date: ['order date', 'date', 'created at', 'timestamp', 'sale date', 'invoice date', 'purchase date'],
  customer_name: ['customer name', 'customer', 'client', 'buyer', 'name', 'consumer'],
  product_name: ['product name', 'product', 'item', 'item name'],
  category: ['category', 'product category', 'type', 'item type', 'department', 'group'],
  region: ['region', 'country', 'state', 'location', 'territory', 'market', 'city', 'zone'],
  quantity: ['quantity', 'qty', 'amount', 'units', 'volume', 'count', 'items'],
  unit_price: ['unit price', 'price', 'cost', 'item price', 'selling price', 'mrp'],
  discount: ['discount', 'discount amount', 'discount percent', 'promo'],
  returned: ['returned', 'return', 'refunded', 'status'],
  total_sales: ['total sales', 'sales', 'revenue', 'total', 'amount', 'sales amount', 'revenue amount', 'grand total', 'net sales', 'gross sales'],
  profit: ['profit', 'margin', 'net profit', 'net']
};

function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ');
}

function findBestColumnMatch(actualColumns: string[], aliases: string[]): string | undefined {
  const normalizedActual = actualColumns.map(normalizeKey);
  for (const alias of aliases) {
    const idx = normalizedActual.indexOf(alias);
    if (idx !== -1) return actualColumns[idx];
  }
  // partial match
  for (const alias of aliases) {
    const idx = normalizedActual.findIndex(a => a.includes(alias) || alias.includes(a));
    if (idx !== -1) return actualColumns[idx];
  }
  return undefined;
}

function parseDate(dateStr: string | number): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  // Try DD/MM/YYYY
  if (typeof dateStr === 'string') {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      // Guess format
      let day, month, year;
      if (parts[2].length === 4) {
        year = parseInt(parts[2]);
        if (parseInt(parts[1]) > 12) {
          month = parseInt(parts[0]);
          day = parseInt(parts[1]);
        } else {
          day = parseInt(parts[0]);
          month = parseInt(parts[1]);
        }
      } else if (parts[0].length === 4) {
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
      }
      if (year && month && day) {
        const parsed = new Date(year, month - 1, day);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }
  }
  return null;
}

export function generateInsights(data: SalesRecord[]): Insight[] {
  if (data.length === 0) return [];
  const insights: Insight[] = [];
  
  let totalRev = 0;
  let totalProfit = 0;
  const monthlyRevenue = new Map<string, number>();
  const monthlyProfit = new Map<string, number>();
  const categoryRev = new Map<string, number>();
  const categoryProfit = new Map<string, number>();
  const regionRev = new Map<string, number>();
  const productRev = new Map<string, number>();
  const customerRev = new Map<string, number>();
  const uniqueOrders = new Set<string>();

  data.forEach(d => {
    totalRev += d.total_sales;
    totalProfit += d.profit;
    monthlyRevenue.set(d.month, (monthlyRevenue.get(d.month) || 0) + d.total_sales);
    monthlyProfit.set(d.month, (monthlyProfit.get(d.month) || 0) + d.profit);
    categoryRev.set(d.category, (categoryRev.get(d.category) || 0) + d.total_sales);
    categoryProfit.set(d.category, (categoryProfit.get(d.category) || 0) + d.profit);
    regionRev.set(d.region, (regionRev.get(d.region) || 0) + d.total_sales);
    productRev.set(d.product_name, (productRev.get(d.product_name) || 0) + d.total_sales);
    customerRev.set(d.customer_name, (customerRev.get(d.customer_name) || 0) + d.total_sales);
    uniqueOrders.add(d.order_id);
  });
  
  const sortedMonths = Array.from(monthlyRevenue.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  if (sortedMonths.length >= 2) {
    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const prevMonth = sortedMonths[sortedMonths.length - 2];
    if (prevMonth[1] > 0) {
      const growth = ((lastMonth[1] - prevMonth[1]) / prevMonth[1]) * 100;
      insights.push({
        id: 'rev-growth',
        type: growth >= 0 ? 'positive' : 'negative',
        title: 'Revenue Growth',
        description: `Month-over-month revenue ${growth >= 0 ? 'showed positive momentum, increasing' : 'contracted'} by ${Math.abs(growth).toFixed(1)}% in ${lastMonth[0]}. We recommend reviewing underlying volume drivers to ensure sustainability.`
      });
    }
  }

  if (sortedMonths.length > 0) {
    const bestMonth = [...sortedMonths].sort((a, b) => b[1] - a[1])[0];
    const worstMonth = [...sortedMonths].sort((a, b) => a[1] - b[1])[0];
    if (bestMonth[1] > 0) {
      insights.push({
        id: 'best-month',
        type: 'positive',
        title: 'Best Month',
        description: `${bestMonth[0]} emerged as the peak performance period, generating ${bestMonth[1].toLocaleString(undefined, { maximumFractionDigits: 0 })} in revenue. A variance analysis is advised to identify reproducible success factors.`
      });
    }
    if (worstMonth[1] > 0 && worstMonth[0] !== bestMonth[0]) {
      insights.push({
        id: 'worst-month',
        type: 'negative',
        title: 'Lowest Revenue Month',
        description: `Revenue realization dropped to a period-low of ${worstMonth[1].toLocaleString(undefined, { maximumFractionDigits: 0 })} in ${worstMonth[0]}. This warrants an audit of operational bottlenecks and market headwinds during this cycle.`
      });
    }
  }

  const validCategories = Array.from(categoryRev.entries()).filter(c => c[0] !== 'Unknown' && c[1] > 0);
  if (validCategories.length > 0) {
    const topCategory = validCategories.sort((a, b) => b[1] - a[1])[0];
    const pct = (topCategory[1] / totalRev) * 100;
    insights.push({
      id: 'top-cat',
      type: 'info',
      title: 'Top Category',
      description: `${topCategory[0]} serves as the primary revenue engine, representing ${pct.toFixed(1)}% of total volume. We should evaluate concentration risk and consider diversification strategies.`
    });
  }

  const validCategoryProfits = Array.from(categoryProfit.entries()).filter(c => c[0] !== 'Unknown' && c[1] > 0);
  if (validCategoryProfits.length > 0) {
    const topProfitCat = validCategoryProfits.sort((a, b) => b[1] - a[1])[0];
    insights.push({
      id: 'top-profit-cat',
      type: 'positive',
      title: 'Most Profitable Category',
      description: `${topProfitCat[0]} yielded the strongest net margin contribution (${topProfitCat[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}). Capital allocation should be prioritized toward scaling this high-yield segment.`
    });
  }

  const validRegions = Array.from(regionRev.entries()).filter(r => r[0] !== 'Unknown' && r[1] > 0);
  if (validRegions.length > 0) {
    const topRegion = validRegions.sort((a, b) => b[1] - a[1])[0];
    const worstRegion = validRegions[validRegions.length - 1];
    insights.push({
      id: 'top-region',
      type: 'positive',
      title: 'Highest Revenue Region',
      description: `The ${topRegion[0]} market outpaced expectations with ${topRegion[1].toLocaleString(undefined, { maximumFractionDigits: 0 })} in sales. We advise cross-pollinating these regional strategies to lagging territories.`
    });
    if (validRegions.length > 1) {
      insights.push({
        id: 'worst-region',
        type: 'warning',
        title: 'Lowest Revenue Region',
        description: `${worstRegion[0]} showed material underperformance (${worstRegion[1].toLocaleString(undefined, { maximumFractionDigits: 0 })}). A localized root-cause analysis is necessary to determine if structural or execution issues exist.`
      });
    }
  }

  const validProducts = Array.from(productRev.entries()).filter(p => p[0] !== 'Unknown' && p[1] > 0).sort((a, b) => b[1] - a[1]);
  if (validProducts.length > 0) {
    insights.push({
      id: 'top-product',
      type: 'info',
      title: 'Best Selling Product',
      description: `${validProducts[0][0]} anchors the portfolio, driving ${validProducts[0][1].toLocaleString(undefined, { maximumFractionDigits: 0 })} in revenue. Supply chain continuity for this flagship SKU must be stringently audited.`
    });

    // Pareto principle check (80% revenue)
    let cumulative = 0;
    let count = 0;
    for (const [_, rev] of validProducts) {
      cumulative += rev;
      count++;
      if (cumulative >= totalRev * 0.8) break;
    }
    if (count > 0 && count < validProducts.length) {
      const pctProducts = ((count / validProducts.length) * 100).toFixed(1);
      insights.push({
        id: 'pareto',
        type: 'info',
        title: 'Revenue Concentration',
        description: `High concentration risk identified: ${pctProducts}% of SKUs (${count} items) drive 80% of total revenue. We recommend a strategic review of the long-tail product catalog to optimize inventory carrying costs.`
      });
    }
  }

  const validCustomers = Array.from(customerRev.entries()).filter(c => c[0] !== 'Unknown' && c[1] > 0).sort((a, b) => b[1] - a[1]);
  if (validCustomers.length > 0) {
    insights.push({
      id: 'top-customer',
      type: 'positive',
      title: 'Largest Customer',
      description: `${validCustomers[0][0]} remains the dominant enterprise account (${validCustomers[0][1].toLocaleString(undefined, { maximumFractionDigits: 0 })}). We advise implementing key account retention protocols to mitigate single-client dependency.`
    });
  }

  if (uniqueOrders.size > 0) {
    const aov = totalRev / uniqueOrders.size;
    insights.push({
      id: 'aov',
      type: 'info',
      title: 'Average Order Value',
      description: `The benchmark Average Order Value (AOV) is stabilizing at ${aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Upsell compliance and discounting guardrails should be monitored closely.`
    });
  }

  if (totalProfit > 0 && totalRev > 0) {
    const margin = (totalProfit / totalRev) * 100;
    insights.push({
      id: 'margin',
      type: margin >= 20 ? 'positive' : (margin >= 10 ? 'info' : 'warning'),
      title: 'Profit Margin',
      description: `The aggregate blended margin sits at ${margin.toFixed(1)}%. We recommend a granular cost-of-sales audit to identify margin leakage in underperforming segments.`
    });
  }

  return insights;
}

export function generateMetrics(data: SalesRecord[]): DataMetrics {
  let totalRevenue = 0;
  let totalProfit = 0;
  let totalQuantity = 0;
  
  const customers = new Set<string>();
  const products = new Set<string>();
  const orders = new Set<string>();
  
  const monthlyRevenue = new Map<string, number>();
  const productRevenue = new Map<string, number>();
  const regionRevenue = new Map<string, number>();
  const categoryRevenue = new Map<string, number>();
  
  data.forEach(d => {
    totalRevenue += d.total_sales;
    totalProfit += d.profit;
    totalQuantity += d.quantity;
    
    if (d.customer_name && d.customer_name !== 'Unknown') customers.add(d.customer_name);
    if (d.product_name && d.product_name !== 'Unknown') products.add(d.product_name);
    if (d.order_id) orders.add(d.order_id);
    
    monthlyRevenue.set(d.month, (monthlyRevenue.get(d.month) || 0) + d.total_sales);
    
    if (d.product_name && d.product_name !== 'Unknown') {
      productRevenue.set(d.product_name, (productRevenue.get(d.product_name) || 0) + d.total_sales);
    }
    
    if (d.region && d.region !== 'Unknown') {
      regionRevenue.set(d.region, (regionRevenue.get(d.region) || 0) + d.total_sales);
    }
    
    if (d.category && d.category !== 'Unknown') {
      categoryRevenue.set(d.category, (categoryRevenue.get(d.category) || 0) + d.total_sales);
    }
  });

  const uniqueCustomers = customers.size;
  const uniqueProducts = products.size;
  const totalOrders = orders.size > 0 ? orders.size : data.length; 
  
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgQuantity = totalOrders > 0 ? totalQuantity / totalOrders : 0;
  
  const revPerCustomer = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;
  const revPerProduct = uniqueProducts > 0 ? totalRevenue / uniqueProducts : 0;
  
  const sortedMonths = Array.from(monthlyRevenue.entries()).sort((a, b) => b[1] - a[1]);
  const bestMonth = sortedMonths.length > 0 ? { month: sortedMonths[0][0], revenue: sortedMonths[0][1] } : null;
  const worstMonth = sortedMonths.length > 0 ? { month: sortedMonths[sortedMonths.length - 1][0], revenue: sortedMonths[sortedMonths.length - 1][1] } : null;
  
  const sortedProducts = Array.from(productRevenue.entries()).sort((a, b) => b[1] - a[1]);
  const highestSellingProduct = sortedProducts.length > 0 ? { name: sortedProducts[0][0], revenue: sortedProducts[0][1] } : null;
  const lowestSellingProduct = sortedProducts.length > 0 ? { name: sortedProducts[sortedProducts.length - 1][0], revenue: sortedProducts[sortedProducts.length - 1][1] } : null;
  
  const sortedRegions = Array.from(regionRevenue.entries()).sort((a, b) => b[1] - a[1]);
  const highestRevenueRegion = sortedRegions.length > 0 ? { name: sortedRegions[0][0], revenue: sortedRegions[0][1] } : null;
  
  const sortedCategories = Array.from(categoryRevenue.entries()).sort((a, b) => b[1] - a[1]);
  const highestRevenueCategory = sortedCategories.length > 0 ? { name: sortedCategories[0][0], revenue: sortedCategories[0][1] } : null;
  
  const monthsChronological = Array.from(monthlyRevenue.keys()).sort();
  let growth = 0;
  if (monthsChronological.length >= 2) {
    const last = monthlyRevenue.get(monthsChronological[monthsChronological.length - 1]) || 0;
    const prev = monthlyRevenue.get(monthsChronological[monthsChronological.length - 2]) || 0;
    if (prev > 0) {
      growth = ((last - prev) / prev) * 100;
    }
  }

  return {
    totalRevenue,
    totalProfit,
    averageOrderValue: avgOrderValue,
    totalOrders,
    uniqueCustomers,
    uniqueProducts,
    averageQuantity: avgQuantity,
    revenuePerCustomer: revPerCustomer,
    revenuePerProduct: revPerProduct,
    bestMonth,
    worstMonth,
    highestSellingProduct,
    lowestSellingProduct,
    highestRevenueRegion,
    highestRevenueCategory,
    growth
  };
}

function generateProfiling(rawData: any[], actualColumns: string[]): DataProfiling {
  const numericColumns = 5;
  const categoricalColumns = 5;
  const dateColumns = 1;
  
  const uniqueValues: Record<string, number> = {};
  const sampleSize = Math.min(rawData.length, 1000);
  
  actualColumns.forEach(col => {
    const vals = new Set();
    for (let i = 0; i < sampleSize; i++) {
      if (rawData[i][col] !== undefined && rawData[i][col] !== null) {
        vals.add(rawData[i][col]);
      }
    }
    uniqueValues[col] = vals.size;
  });
  
  return {
    numericColumns,
    categoricalColumns,
    dateColumns,
    uniqueValues
  };
}

export function cleanAndProcessData(rawData: any[]): Promise<DataResult> {
  return new Promise((resolve, reject) => {
    try {
      if (rawData.length === 0) {
        return reject(new Error("The selected dataset contains no data."));
      }
      
      const actualColumns = Object.keys(rawData[0]);
      const mappedColumns = {
        order_id: findBestColumnMatch(actualColumns, COLUMN_ALIASES.order_id),
        order_date: findBestColumnMatch(actualColumns, COLUMN_ALIASES.order_date),
        customer_name: findBestColumnMatch(actualColumns, COLUMN_ALIASES.customer_name),
        product_name: findBestColumnMatch(actualColumns, COLUMN_ALIASES.product_name),
        category: findBestColumnMatch(actualColumns, COLUMN_ALIASES.category),
        region: findBestColumnMatch(actualColumns, COLUMN_ALIASES.region),
        quantity: findBestColumnMatch(actualColumns, COLUMN_ALIASES.quantity),
        unit_price: findBestColumnMatch(actualColumns, COLUMN_ALIASES.unit_price),
        discount: findBestColumnMatch(actualColumns, COLUMN_ALIASES.discount),
        returned: findBestColumnMatch(actualColumns, COLUMN_ALIASES.returned),
        total_sales: findBestColumnMatch(actualColumns, COLUMN_ALIASES.total_sales),
        profit: findBestColumnMatch(actualColumns, COLUMN_ALIASES.profit)
      };

      const cleanData: SalesRecord[] = [];
      
      let missingValuesHandled = 0;
      let duplicatesRemoved = 0;
      let invalidDates = 0;
      let invalidNumbers = 0;
      const seenIds = new Set<string>();
      
      let minDate = new Date(8640000000000000);
      let maxDate = new Date(-8640000000000000);
      
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        let rowHasMissing = false;
        
        const rawQuantity = mappedColumns.quantity ? row[mappedColumns.quantity] : null;
        const rawPrice = mappedColumns.unit_price ? row[mappedColumns.unit_price] : null;
        const rawTotal = mappedColumns.total_sales ? row[mappedColumns.total_sales] : null;
        const rawDate = mappedColumns.order_date ? row[mappedColumns.order_date] : null;

        let quantity = parseFloat(String(rawQuantity).replace(/[^0-9.-]+/g, ''));
        if (isNaN(quantity) && rawQuantity !== null && rawQuantity !== undefined && rawQuantity !== '') invalidNumbers++;
        quantity = quantity || 0;

        let unit_price = parseFloat(String(rawPrice).replace(/[^0-9.-]+/g, ''));
        if (isNaN(unit_price) && rawPrice !== null && rawPrice !== undefined && rawPrice !== '') invalidNumbers++;
        unit_price = unit_price || 0;

        let total_sales = parseFloat(String(rawTotal).replace(/[^0-9.-]+/g, ''));
        if (isNaN(total_sales) && rawTotal !== null && rawTotal !== undefined && rawTotal !== '') invalidNumbers++;
        total_sales = total_sales || 0;
        
        if (quantity <= 0 && unit_price > 0 && total_sales > 0) {
          quantity = total_sales / unit_price;
        } else if (unit_price <= 0 && quantity > 0 && total_sales > 0) {
          unit_price = total_sales / quantity;
        } else if (total_sales <= 0 && quantity > 0 && unit_price > 0) {
          total_sales = quantity * unit_price;
        } else if (total_sales <= 0 && quantity <= 0 && unit_price <= 0) {
           quantity = 1;
           unit_price = 0;
           total_sales = 0;
        }
        
        let order_date = parseDate(rawDate);
        if (!order_date) {
          if (rawDate !== null && rawDate !== undefined && rawDate !== '') invalidDates++;
          rowHasMissing = true;
          order_date = new Date(); 
        }
        
        if (order_date < minDate) minDate = order_date;
        if (order_date > maxDate) maxDate = order_date;
        
        const rawId = mappedColumns.order_id ? row[mappedColumns.order_id] : null;
        const order_id = rawId ? String(rawId) : `ORD-${Date.now()}-${i}`;
        
        if (!rawId) rowHasMissing = true;

        if (seenIds.has(order_id) && rawId) { 
           duplicatesRemoved++; 
           continue;
        }
        seenIds.add(order_id);
        
        const rawDiscount = mappedColumns.discount ? row[mappedColumns.discount] : null;
        let discount = parseFloat(String(rawDiscount).replace(/[^0-9.-]+/g, ''));
        if (isNaN(discount) && rawDiscount !== null && rawDiscount !== undefined && rawDiscount !== '') invalidNumbers++;
        discount = discount || 0;
        if (discount > 1) discount = discount / 100; 
        
        const rawProfit = mappedColumns.profit ? row[mappedColumns.profit] : null;
        let profit = parseFloat(String(rawProfit).replace(/[^0-9.-]+/g, ''));
        if (isNaN(profit)) {
           if (rawProfit !== null && rawProfit !== undefined && rawProfit !== '') invalidNumbers++;
           profit = total_sales * 0.25; 
        }
        
        const customer = mappedColumns.customer_name ? String(row[mappedColumns.customer_name] || 'Unknown') : 'Unknown';
        const product = mappedColumns.product_name ? String(row[mappedColumns.product_name] || 'Unknown') : 'Unknown';
        const category = mappedColumns.category ? String(row[mappedColumns.category] || 'Unknown') : 'Unknown';
        const region = mappedColumns.region ? String(row[mappedColumns.region] || 'Unknown') : 'Unknown';
        const returned = mappedColumns.returned ? String(row[mappedColumns.returned] || 'No') : 'No';
        
        if (customer === 'Unknown' || product === 'Unknown' || category === 'Unknown' || region === 'Unknown') {
          rowHasMissing = true;
        }
        
        if (rowHasMissing) missingValuesHandled++;

        cleanData.push({
          order_id,
          order_date,
          customer_name: customer,
          product_name: product,
          category,
          region,
          quantity,
          unit_price,
          discount,
          returned,
          total_sales,
          profit,
          month: `${order_date.getFullYear()}-${String(order_date.getMonth() + 1).padStart(2, '0')}`,
          year: order_date.getFullYear()
        });
      }
      
      cleanData.sort((a, b) => a.order_date.getTime() - b.order_date.getTime());
      
      let emptyColumns = 0;
      actualColumns.forEach(col => {
        const isEmpty = rawData.every(row => row[col] === null || row[col] === undefined || String(row[col]).trim() === '');
        if (isEmpty) emptyColumns++;
      });

      let healthScore = 100;
      healthScore -= (duplicatesRemoved * 2);
      healthScore -= (missingValuesHandled * 2);
      healthScore -= (invalidDates * 3);
      healthScore -= (invalidNumbers * 3);
      healthScore -= (emptyColumns * 5);
      healthScore = Math.max(0, healthScore);

      const insights = generateInsights(cleanData);
      const metrics = generateMetrics(cleanData);
      const profiling = generateProfiling(rawData, actualColumns);
      
      const detectedFields = Object.entries(mappedColumns)
        .filter(([_, value]) => value !== undefined)
        .map(([key, _]) => {
          switch(key) {
            case 'order_id': return 'Order ID';
            case 'order_date': return 'Date';
            case 'customer_name': return 'Customer';
            case 'product_name': return 'Product';
            case 'category': return 'Category';
            case 'region': return 'Region';
            case 'quantity': return 'Quantity';
            case 'unit_price': return 'Unit Price';
            case 'discount': return 'Discount';
            case 'returned': return 'Returned';
            case 'total_sales': return 'Revenue';
            case 'profit': return 'Profit';
            default: return key;
          }
        });

      resolve({
        data: cleanData,
        stats: {
          totalRows: rawData.length,
          totalColumns: actualColumns.length,
          cleanedRows: cleanData.length,
          duplicatesRemoved,
          missingValuesHandled,
          invalidDates,
          invalidNumbers,
          emptyColumns,
          dateRange: minDate <= maxDate ? { start: minDate.getTime(), end: maxDate.getTime() } : undefined,
          healthScore,
          insights,
          detectedFields,
          metrics,
          profiling
        }
      });
    } catch (error: any) {
      reject(error);
    }
  });
}

export function generateAndCleanData(): DataResult {
  const n_rows = 2000;
  
  const start_date = new Date(2022, 0, 1).getTime();
  const end_date = new Date(2023, 11, 31).getTime();
  
  const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Toys'];
  const regions = ['North America', 'Europe', 'Asia', 'South America', 'Oceania'];
  
  const cleanData: SalesRecord[] = [];
  
  for (let i = 0; i < n_rows; i++) {
    const order_date = new Date(start_date + Math.random() * (end_date - start_date));
    const category = categories[Math.floor(Math.random() * categories.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    
    let unit_price = 0;
    if (category === 'Electronics') unit_price = Math.floor(Math.random() * 900) + 100;
    else if (category === 'Clothing') unit_price = Math.floor(Math.random() * 80) + 20;
    else if (category === 'Home & Garden') unit_price = Math.floor(Math.random() * 250) + 50;
    else if (category === 'Sports') unit_price = Math.floor(Math.random() * 150) + 30;
    else unit_price = Math.floor(Math.random() * 60) + 10;
    
    const quantity = Math.floor(Math.random() * 10) + 1;
    const discount = Math.random() > 0.7 ? Math.round(Math.random() * 0.25 * 100) / 100 : 0;
    const total_sales = quantity * unit_price * (1 - discount);
    
    let profit_margin = 0;
    if (category === 'Electronics') profit_margin = 0.15 + Math.random() * 0.1;
    else if (category === 'Clothing') profit_margin = 0.3 + Math.random() * 0.2;
    else profit_margin = 0.2 + Math.random() * 0.15;
    
    const profit = total_sales * profit_margin;
    
    const month = `${order_date.getFullYear()}-${String(order_date.getMonth() + 1).padStart(2, '0')}`;
    const year = order_date.getFullYear();
    
    cleanData.push({
      order_id: `ORD-${10000 + i}`,
      order_date,
      customer_name: `Customer ${Math.floor(Math.random() * 500) + 1}`,
      product_name: `${category} Product ${Math.floor(Math.random() * 50) + 1}`,
      category,
      region,
      quantity,
      unit_price,
      discount,
      returned: Math.random() > 0.95 ? 'Yes' : 'No',
      total_sales,
      profit,
      month,
      year
    });
  }
  
  cleanData.sort((a, b) => a.order_date.getTime() - b.order_date.getTime());
  const insights = generateInsights(cleanData);
  const metrics = generateMetrics(cleanData);
  const profiling = generateProfiling(cleanData, ['Date', 'Category', 'Region', 'Quantity', 'Unit Price', 'Revenue', 'Profit', 'Customer', 'Product', 'Discount', 'Returned', 'Order ID']);

  return {
    data: cleanData,
    stats: {
      totalRows: n_rows,
      totalColumns: 14,
      cleanedRows: cleanData.length,
      duplicatesRemoved: 0,
      missingValuesHandled: 0,
      invalidDates: 0,
      invalidNumbers: 0,
      emptyColumns: 0,
      healthScore: 100,
      dateRange: { start: start_date, end: end_date },
      insights,
      detectedFields: ['Date', 'Category', 'Region', 'Quantity', 'Unit Price', 'Revenue', 'Profit', 'Customer', 'Product', 'Discount', 'Returned', 'Order ID'],
      metrics,
      profiling
    }
  };
}

export function generateForecast(historicalData: SalesRecord[], monthsAhead: number = 6) {
  if (!historicalData || historicalData.length === 0) return [];
  
  const monthlySales = new Map<string, number>();
  let lastMonth = '';
  
  historicalData.forEach(d => {
    monthlySales.set(d.month, (monthlySales.get(d.month) || 0) + d.total_sales);
    if (d.month > lastMonth) lastMonth = d.month;
  });
  
  const months = Array.from(monthlySales.keys()).sort();
  if (months.length < 2) return [];
  
  const values = months.map(m => monthlySales.get(m) || 0);
  
  let totalGrowth = 0;
  for (let i = 1; i < values.length; i++) {
    const growth = (values[i] - values[i-1]) / (values[i-1] || 1);
    totalGrowth += Math.max(Math.min(growth, 0.5), -0.5); 
  }
  const avgGrowth = totalGrowth / (values.length - 1);
  
  const seasonalFactors = Array(12).fill(1.0);
  if (months.length >= 12) {
    const monthlyAverages = Array(12).fill(0);
    const monthlyCounts = Array(12).fill(0);
    
    months.forEach(m => {
      const monthIdx = parseInt(m.split('-')[1]) - 1;
      monthlyAverages[monthIdx] += monthlySales.get(m) || 0;
      monthlyCounts[monthIdx]++;
    });
    
    let overallAvg = 0;
    let totalMonths = 0;
    
    for (let i = 0; i < 12; i++) {
      if (monthlyCounts[i] > 0) {
        monthlyAverages[i] /= monthlyCounts[i];
        overallAvg += monthlyAverages[i];
        totalMonths++;
      }
    }
    
    if (totalMonths > 0) {
      overallAvg /= totalMonths;
      for (let i = 0; i < 12; i++) {
        if (monthlyCounts[i] > 0) {
          seasonalFactors[i] = monthlyAverages[i] / overallAvg;
        }
      }
    }
  }
  
  const result = [];
  const [lastY, lastM] = lastMonth.split('-');
  let currentY = parseInt(lastY);
  let currentM = parseInt(lastM);
  let baseValue = values[values.length - 1];
  
  for (let i = 0; i < monthsAhead; i++) {
    currentM++;
    if (currentM > 12) {
      currentM = 1;
      currentY++;
    }
    
    const monthStr = `${currentY}-${String(currentM).padStart(2, '0')}`;
    const trendValue = baseValue * (1 + avgGrowth);
    baseValue = trendValue; 
    
    const seasonFactor = seasonalFactors[currentM - 1];
    let projectedValue = trendValue * seasonFactor;
    
    projectedValue = projectedValue * 0.98; // Deterministic confidence band factor
    
    result.push({
      month: monthStr,
      projected_sales: Math.max(0, projectedValue)
    });
  }
  
  return result;
}
