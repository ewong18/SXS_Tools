from datetime import datetime, timedelta, timezone
from pathlib import Path
import pytz
import sys
#import pandas as pd
import requests
import json
from typing import List, Dict

class ExpCalc:
    def __init__(self,
                 current_lvl:int,
                 current_exp:int,
                 target_lvl:int,
                 XP_per_hr:int,
                 season:int,
                 timezone:str="America/New_York"):
        
        self.current_lvl = current_lvl
        self.current_exp = current_exp
        self.target_lvl = target_lvl
        self.XP_per_hr = XP_per_hr
        self.season = season
        self.timezone = timezone
        self.RESET_TIME = 13  # Reset time in UTC (13:00 UTC)

        self._exp_table = self.get_exp_table()

    def get_exp_table(self) -> List[Dict]:
        try:
            url = "https://qenu.github.io/ethna-timeline/assets/data/exp_required.json"
            response = requests.get(url)
            if response.status_code == 200:
                data = json.loads(response.text)
            else:
                raise Exception(f"Failed to retrieve data from {url}")
        except:
            SRC_DIR = Path(__file__).resolve().parent
            RESOURCES_PATH = SRC_DIR.parent / "resources" / "season_exp.json"
            with open(RESOURCES_PATH, "r") as f:
                data = json.load(f)
        return data
        
    def calc_required_exp(self) -> int:        
        required_exp = 0
        for line in self._exp_table:
            if  (line['level'] > self.current_lvl
                and line['level'] <= self.target_lvl
                and line['season']==self.season):
                required_exp += line['exp']
        return required_exp
    
    def count_resets_passed(self,
                            start_time: datetime, 
                            delta_seconds: float) -> int:
        end_time = start_time + timedelta(seconds=delta_seconds)
        
        start_shifted = start_time - timedelta(hours=self.RESET_TIME)
        end_shifted = end_time - timedelta(hours=self.RESET_TIME)
        
        days_passed = (end_shifted.date() - start_shifted.date()).days
        
        return days_passed

    def calc_eta(self) -> datetime:
        XP_required = self.calc_required_exp()
        remaining_XP_required = XP_required - self.current_exp
    
        # include daily 2hr speedup
        current_ts = datetime.now(timezone.utc)
        time_required_hr = remaining_XP_required/self.XP_per_hr
        free_resets = self.count_resets_passed(current_ts,                  
                                               time_required_hr*3600)
        if free_resets > 0:
            #print(f"Will cross {free_resets} reset days.")
            remaining_time = time_required_hr - (2 * free_resets)
        else:
            remaining_time = time_required_hr
            
        eta = current_ts + timedelta(seconds=remaining_time*3600)
        eta_converted = eta.astimezone(pytz.timezone(self.timezone))
        return(eta_converted)