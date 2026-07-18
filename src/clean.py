import pandas as pd
import os

def remove_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    initial_len = len(df)
    df = df.drop_duplicates()
    print(f"Removed {initial_len - len(df)} duplicates")
    return df

def handle_missing(df: pd.DataFrame) -> pd.DataFrame:
    df['customer_name'] = df['customer_name'].fillna('Unknown')
    mode_cat = df['category'].mode()[0]
    df['category'] = df['category'].fillna(mode_cat)
    df = df.dropna(subset=['order_date', 'unit_price'])
    return df

def fix_types(df: pd.DataFrame) -> pd.DataFrame:
    df['order_date'] = pd.to_datetime(df['order_date'], errors='coerce')
    df = df.dropna(subset=['order_date'])
    df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce')
    df['unit_price'] = pd.to_numeric(df['unit_price'], errors='coerce')
    df = df.dropna(subset=['quantity', 'unit_price'])
    return df

def remove_invalid(df: pd.DataFrame) -> pd.DataFrame:
    return df[(df['unit_price'] > 0) & (df['quantity'] > 0)].copy()

def run_cleaning(df: pd.DataFrame, output_path: str) -> pd.DataFrame:
    print(f"Rows before cleaning: {len(df)}")
    df = remove_duplicates(df)
    print(f"Rows after removing duplicates: {len(df)}")
    df = handle_missing(df)
    print(f"Rows after handling missing: {len(df)}")
    df = fix_types(df)
    print(f"Rows after fixing types: {len(df)}")
    df = remove_invalid(df)
    print(f"Rows after removing invalid: {len(df)}")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    return df
