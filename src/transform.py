import pandas as pd

def add_computed_columns(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['total_sales'] = df['quantity'] * df['unit_price'] * (1 - df['discount'])
    df['profit'] = df['total_sales'] * 0.30
    df['profit_margin'] = df['profit'] / df['total_sales']
    df['month'] = df['order_date'].dt.to_period('M')
    df['year'] = df['order_date'].dt.year
    
    unique_months = sorted(df['month'].unique())
    month_to_num = {m: i+1 for i, m in enumerate(unique_months)}
    df['month_num'] = df['month'].map(month_to_num)
    
    return df

def monthly_sales(df: pd.DataFrame) -> pd.DataFrame:
    agg = df.groupby('month', as_index=False)['total_sales'].sum()
    agg['month'] = agg['month'].astype(str)
    return agg

def category_sales(df: pd.DataFrame) -> pd.DataFrame:
    return df.groupby('category', as_index=False)[['total_sales', 'profit']].sum()

def region_sales(df: pd.DataFrame) -> pd.DataFrame:
    return df.groupby('region', as_index=False)['total_sales'].sum()

def top_products(df: pd.DataFrame, n: int = 10) -> pd.DataFrame:
    agg = df.groupby('product_name', as_index=False)['total_sales'].sum()
    return agg.sort_values(by='total_sales', ascending=False).head(n)
