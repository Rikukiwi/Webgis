"""
Data Preprocessing Pipeline for LST (Land Surface Temperature)
Adheres strictly to Section II.2 of the specification:
1. Missing data inspection & imputation (linear interpolation, ffill, drop)
2. Outlier detection & correction (IQR, Z-score)
3. Temporal synchronization & Resampling
4. Spatial alignment
5. Normalization (Min-Max, Z-score, None) - FITTED ONLY ON TRAIN SET to prevent data leakage
6. Chronological Train / Val / Test splitting
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

class LSTPreprocessor:
    def __init__(
        self,
        missing_strategy: str = "interpolate",  # 'interpolate', 'drop', 'mean'
        outlier_strategy: str = "iqr",          # 'iqr', 'z_score', 'clip', 'none'
        norm_method: str = "min_max",           # 'min_max', 'z_score', 'none'
        train_end_date: str = "2023-12-31",
        val_end_date: str = "2024-12-31"
    ):
        self.missing_strategy = missing_strategy
        self.outlier_strategy = outlier_strategy
        self.norm_method = norm_method
        self.train_end_date = train_end_date
        self.val_end_date = val_end_date
        self.scaler_params = {}

    def handle_missing(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        initial_count = len(df)
        missing_count = int(df['gia_tri_lst'].isna().sum())
        
        df = df.sort_values(['kinh_do', 'vi_do', 'thoi_gian']).copy()
        
        if self.missing_strategy == "drop":
            df = df.dropna(subset=['gia_tri_lst'])
        elif self.missing_strategy == "interpolate":
            # Group by spatial point and linearly interpolate over time
            df['gia_tri_lst'] = df.groupby(['kinh_do', 'vi_do'])['gia_tri_lst'].transform(
                lambda s: s.interpolate(method='linear', limit_direction='both')
            )
            df['gia_tri_lst'] = df['gia_tri_lst'].fillna(df['gia_tri_lst'].mean())
        elif self.missing_strategy == "mean":
            df['gia_tri_lst'] = df['gia_tri_lst'].fillna(df['gia_tri_lst'].mean())
            
        stats = {
            "initial_rows": initial_count,
            "missing_found": missing_count,
            "missing_pct": round(missing_count / max(1, initial_count) * 100, 2),
            "strategy": self.missing_strategy
        }
        return df, stats

    def handle_outliers(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        df = df.copy()
        outliers_detected = 0
        s = df['gia_tri_lst'].dropna()
        
        if self.outlier_strategy == "iqr":
            q1 = s.quantile(0.25)
            q3 = s.quantile(0.75)
            iqr = q3 - q1
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            outlier_mask = (df['gia_tri_lst'] < lower) | (df['gia_tri_lst'] > upper)
            outliers_detected = int(outlier_mask.sum())
            # Cap/clip to thresholds or replace with bounds
            df.loc[df['gia_tri_lst'] < lower, 'gia_tri_lst'] = lower
            df.loc[df['gia_tri_lst'] > upper, 'gia_tri_lst'] = upper
            
        elif self.outlier_strategy == "z_score":
            mean = s.mean()
            std = s.std()
            if std > 0:
                z = (df['gia_tri_lst'] - mean).abs() / std
                outlier_mask = z > 3.0
                outliers_detected = int(outlier_mask.sum())
                df.loc[outlier_mask, 'gia_tri_lst'] = mean + 3.0 * std * np.sign(df.loc[outlier_mask, 'gia_tri_lst'] - mean)

        stats = {
            "outliers_detected": outliers_detected,
            "strategy": self.outlier_strategy
        }
        return df, stats

    def chronological_split(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Split chronologically into train, val, and test subsets
        """
        df['thoi_gian_dt'] = pd.to_datetime(df['thoi_gian'])
        
        train_dt = pd.to_datetime(self.train_end_date)
        val_dt = pd.to_datetime(self.val_end_date)
        
        train_df = df[df['thoi_gian_dt'] <= train_dt].copy()
        val_df = df[(df['thoi_gian_dt'] > train_dt) & (df['thoi_gian_dt'] <= val_dt)].copy()
        test_df = df[df['thoi_gian_dt'] > val_dt].copy()
        
        # If dates didn't match data span, do standard chronological fraction split
        if len(train_df) == 0 or len(test_df) == 0:
            df_sorted = df.sort_values('thoi_gian_dt')
            n = len(df_sorted)
            train_cut = int(n * 0.70)
            val_cut = int(n * 0.85)
            train_df = df_sorted.iloc[:train_cut].copy()
            val_df = df_sorted.iloc[train_cut:val_cut].copy()
            test_df = df_sorted.iloc[val_cut:].copy()
            
        return train_df, val_df, test_df

    def fit_normalize(self, train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame):
        """
        Compute normalization parameters on TRAIN only to strictly avoid data leakage.
        """
        if self.norm_method == "min_max":
            lst_min = float(train_df['gia_tri_lst'].min())
            lst_max = float(train_df['gia_tri_lst'].max())
            denom = lst_max - lst_min if lst_max > lst_min else 1.0
            
            self.scaler_params = {"method": "min_max", "min": lst_min, "max": lst_max, "denom": denom}
            
            # Add normalized columns
            for subset in [train_df, val_df, test_df]:
                subset['gia_tri_lst_norm'] = (subset['gia_tri_lst'] - lst_min) / denom
                
        elif self.norm_method == "z_score":
            mean = float(train_df['gia_tri_lst'].mean())
            std = float(train_df['gia_tri_lst'].std()) if float(train_df['gia_tri_lst'].std()) > 0 else 1.0
            self.scaler_params = {"method": "z_score", "mean": mean, "std": std}
            
            for subset in [train_df, val_df, test_df]:
                subset['gia_tri_lst_norm'] = (subset['gia_tri_lst'] - mean) / std
        else:
            self.scaler_params = {"method": "none"}
            
        return train_df, val_df, test_df, self.scaler_params
