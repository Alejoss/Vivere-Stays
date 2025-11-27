"""
Default values for dynamic pricing configuration.
These values are loaded from dp_dynamic_increment_default.csv
"""

# Default dynamic pricing increments (56 combinations: 7 occupancy categories x 8 lead time categories)
DEFAULT_DYNAMIC_INCREMENTS = [
    {"occupancy_category": "0-30", "lead_time_category": "0-1", "increment_type": "Additional", "increment_value": -10.0},
    {"occupancy_category": "0-30", "lead_time_category": "1-3", "increment_type": "Additional", "increment_value": -12.0},
    {"occupancy_category": "0-30", "lead_time_category": "3-7", "increment_type": "Additional", "increment_value": -12.0},
    {"occupancy_category": "0-30", "lead_time_category": "7-14", "increment_type": "Additional", "increment_value": -10.0},
    {"occupancy_category": "0-30", "lead_time_category": "14-30", "increment_type": "Additional", "increment_value": -5.0},
    {"occupancy_category": "0-30", "lead_time_category": "30-45", "increment_type": "Additional", "increment_value": -5.0},
    {"occupancy_category": "0-30", "lead_time_category": "45-60", "increment_type": "Additional", "increment_value": 0.0},
    {"occupancy_category": "0-30", "lead_time_category": "60+", "increment_type": "Additional", "increment_value": 0.0},
    
    {"occupancy_category": "30-50", "lead_time_category": "0-1", "increment_type": "Additional", "increment_value": -5.0},
    {"occupancy_category": "30-50", "lead_time_category": "1-3", "increment_type": "Additional", "increment_value": -10.0},
    {"occupancy_category": "30-50", "lead_time_category": "3-7", "increment_type": "Additional", "increment_value": -5.0},
    {"occupancy_category": "30-50", "lead_time_category": "7-14", "increment_type": "Additional", "increment_value": 0.0},
    {"occupancy_category": "30-50", "lead_time_category": "14-30", "increment_type": "Additional", "increment_value": 0.0},
    {"occupancy_category": "30-50", "lead_time_category": "30-45", "increment_type": "Additional", "increment_value": 0.0},
    {"occupancy_category": "30-50", "lead_time_category": "45-60", "increment_type": "Additional", "increment_value": 0.0},
    {"occupancy_category": "30-50", "lead_time_category": "60+", "increment_type": "Additional", "increment_value": 0.0},
    
    {"occupancy_category": "50-70", "lead_time_category": "0-1", "increment_type": "Additional", "increment_value": 0.0},
    {"occupancy_category": "50-70", "lead_time_category": "1-3", "increment_type": "Additional", "increment_value": 0.0},
    {"occupancy_category": "50-70", "lead_time_category": "3-7", "increment_type": "Additional", "increment_value": 0.0},
    {"occupancy_category": "50-70", "lead_time_category": "7-14", "increment_type": "Additional", "increment_value": 5.0},
    {"occupancy_category": "50-70", "lead_time_category": "14-30", "increment_type": "Additional", "increment_value": 5.0},
    {"occupancy_category": "50-70", "lead_time_category": "30-45", "increment_type": "Additional", "increment_value": 8.0},
    {"occupancy_category": "50-70", "lead_time_category": "45-60", "increment_type": "Additional", "increment_value": 12.0},
    {"occupancy_category": "50-70", "lead_time_category": "60+", "increment_type": "Additional", "increment_value": 15.0},
    
    {"occupancy_category": "70-80", "lead_time_category": "0-1", "increment_type": "Additional", "increment_value": 5.0},
    {"occupancy_category": "70-80", "lead_time_category": "1-3", "increment_type": "Additional", "increment_value": 5.0},
    {"occupancy_category": "70-80", "lead_time_category": "3-7", "increment_type": "Additional", "increment_value": 8.0},
    {"occupancy_category": "70-80", "lead_time_category": "7-14", "increment_type": "Additional", "increment_value": 10.0},
    {"occupancy_category": "70-80", "lead_time_category": "14-30", "increment_type": "Additional", "increment_value": 10.0},
    {"occupancy_category": "70-80", "lead_time_category": "30-45", "increment_type": "Additional", "increment_value": 12.0},
    {"occupancy_category": "70-80", "lead_time_category": "45-60", "increment_type": "Additional", "increment_value": 15.0},
    {"occupancy_category": "70-80", "lead_time_category": "60+", "increment_type": "Additional", "increment_value": 20.0},
    
    {"occupancy_category": "80-90", "lead_time_category": "0-1", "increment_type": "Additional", "increment_value": 8.0},
    {"occupancy_category": "80-90", "lead_time_category": "1-3", "increment_type": "Additional", "increment_value": 8.0},
    {"occupancy_category": "80-90", "lead_time_category": "3-7", "increment_type": "Additional", "increment_value": 10.0},
    {"occupancy_category": "80-90", "lead_time_category": "7-14", "increment_type": "Additional", "increment_value": 12.0},
    {"occupancy_category": "80-90", "lead_time_category": "14-30", "increment_type": "Additional", "increment_value": 15.0},
    {"occupancy_category": "80-90", "lead_time_category": "30-45", "increment_type": "Additional", "increment_value": 18.0},
    {"occupancy_category": "80-90", "lead_time_category": "45-60", "increment_type": "Additional", "increment_value": 20.0},
    {"occupancy_category": "80-90", "lead_time_category": "60+", "increment_type": "Additional", "increment_value": 25.0},
    
    {"occupancy_category": "90-100", "lead_time_category": "0-1", "increment_type": "Additional", "increment_value": 10.0},
    {"occupancy_category": "90-100", "lead_time_category": "1-3", "increment_type": "Additional", "increment_value": 10.0},
    {"occupancy_category": "90-100", "lead_time_category": "3-7", "increment_type": "Additional", "increment_value": 12.0},
    {"occupancy_category": "90-100", "lead_time_category": "7-14", "increment_type": "Additional", "increment_value": 15.0},
    {"occupancy_category": "90-100", "lead_time_category": "14-30", "increment_type": "Additional", "increment_value": 20.0},
    {"occupancy_category": "90-100", "lead_time_category": "30-45", "increment_type": "Additional", "increment_value": 22.0},
    {"occupancy_category": "90-100", "lead_time_category": "45-60", "increment_type": "Additional", "increment_value": 25.0},
    {"occupancy_category": "90-100", "lead_time_category": "60+", "increment_type": "Additional", "increment_value": 30.0},
    
    {"occupancy_category": "100+", "lead_time_category": "0-1", "increment_type": "Additional", "increment_value": 200.0},
    {"occupancy_category": "100+", "lead_time_category": "1-3", "increment_type": "Additional", "increment_value": 200.0},
    {"occupancy_category": "100+", "lead_time_category": "3-7", "increment_type": "Additional", "increment_value": 200.0},
    {"occupancy_category": "100+", "lead_time_category": "7-14", "increment_type": "Additional", "increment_value": 200.0},
    {"occupancy_category": "100+", "lead_time_category": "14-30", "increment_type": "Additional", "increment_value": 200.0},
    {"occupancy_category": "100+", "lead_time_category": "30-45", "increment_type": "Additional", "increment_value": 200.0},
    {"occupancy_category": "100+", "lead_time_category": "45-60", "increment_type": "Additional", "increment_value": 200.0},
    {"occupancy_category": "100+", "lead_time_category": "60+", "increment_type": "Additional", "increment_value": 200.0},
]


# Default general settings
DEFAULT_GENERAL_SETTINGS = {
    "min_competitors": 2,
    "comp_price_calculation": "min",
    "future_days_to_price": 365,
    "pricing_status": "online",
    "los_status": "offline",
    "otas_price_diff": 0.0,
    "los_num_competitors": 2,
    "los_aggregation": "min",
}

