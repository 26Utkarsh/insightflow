import pandas as pd

REQUIRED_COLUMNS = [
    'order_id', 'order_date', 'customer_name', 'product_name', 'category', 'region', 
    'quantity', 'unit_price', 'discount', 'returned'
]

def load_data(filepath: str) -> pd.DataFrame:
    df = pd.read_csv(filepath)
    print(f"Shape: {df.shape}")
    print("Column dtypes:")
    print(df.dtypes)
    return df

def validate_columns(df: pd.DataFrame, required_cols: list) -> None:
    missing = set(required_cols) - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
