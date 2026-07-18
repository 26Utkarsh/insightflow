import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os

def prepare_features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, dict]:
    df = df.copy()
    encoders = {}
    
    le_cat = LabelEncoder()
    df['category_encoded'] = le_cat.fit_transform(df['category'])
    encoders['category'] = le_cat
    
    le_reg = LabelEncoder()
    df['region_encoded'] = le_reg.fit_transform(df['region'])
    encoders['region'] = le_reg
    
    features = ['month_num', 'year', 'quantity', 'unit_price', 'discount', 'category_encoded', 'region_encoded']
    X = df[features]
    y = df['total_sales']
    
    return X, y, encoders

def train_model(X_train, y_train) -> RandomForestRegressor:
    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    return model

def evaluate_model(model, X_test, y_test) -> dict:
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"MAE: {mae:.2f}")
    print(f"RMSE: {rmse:.2f}")
    print(f"R2: {r2:.2f}")
    
    return {'MAE': mae, 'RMSE': rmse, 'R2': r2}

def predict_future(model, df: pd.DataFrame, encoders: dict, months_ahead: int = 6) -> pd.DataFrame:
    # Use mean values of quantity, unit_price, discount
    mean_qty = df['quantity'].mean()
    mean_price = df['unit_price'].mean()
    mean_disc = df['discount'].mean()
    
    # Most frequent category and region
    freq_cat = df['category'].mode()[0]
    freq_reg = df['region'].mode()[0]
    
    cat_enc = encoders['category'].transform([freq_cat])[0]
    reg_enc = encoders['region'].transform([freq_reg])[0]
    
    last_month_num = df['month_num'].max()
    
    # Extract last year and month
    last_month_obj = df['month'][df['month_num'] == last_month_num].iloc[0]
    if hasattr(last_month_obj, 'year'):
        last_year_val = last_month_obj.year
        last_month_val = last_month_obj.month
    else:
        last_month_str = str(last_month_obj)
        if len(last_month_str) >= 7:
            last_year_val = int(last_month_str[:4])
            last_month_val = int(last_month_str[5:7])
        else:
            last_year_val = df['year'][df['month_num'] == last_month_num].iloc[0]
            last_month_val = 12
        
    future_data = []
    
    for i in range(1, months_ahead + 1):
        next_month_val = last_month_val + i
        next_year_val = last_year_val + (next_month_val - 1) // 12
        actual_month_val = (next_month_val - 1) % 12 + 1
        
        future_month_str = f"{next_year_val}-{actual_month_val:02d}"
        future_month_num = last_month_num + i
        
        row = {
            'month_num': future_month_num,
            'year': next_year_val,
            'quantity': mean_qty,
            'unit_price': mean_price,
            'discount': mean_disc,
            'category_encoded': cat_enc,
            'region_encoded': reg_enc
        }
        
        # Predict
        X_pred = pd.DataFrame([row])
        pred_sales = model.predict(X_pred)[0]
        
        future_data.append({
            'month': future_month_str,
            'predicted_sales': pred_sales
        })
        
    return pd.DataFrame(future_data)

def save_model(model, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(model, path)

def load_model(path: str) -> RandomForestRegressor:
    return joblib.load(path)
