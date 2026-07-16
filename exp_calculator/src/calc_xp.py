from datetime import datetime, timedelta, timezone
from pathlib import Path
import pytz
import sys

def parse_xp_file():
    SRC_DIR = Path(__file__).resolve().parent
    RESOURCES_PATH = SRC_DIR.parent / "resources" / "required_xp.csv"
    with open(RESOURCES_PATH, "r") as f:
        next(f)
        lines = f.readlines()
    xp_dict = {}
    for line in lines:
        level, xp, cumulative = line.strip().split(",")
        xp_dict[int(level)] = int(xp)
    return xp_dict

def calc_eta(current_level,
             current_exp,
             target_level,
             XP_per_hr,
             current_ts,
             tgt_timezone="America/New_York"):
    XP_required = 0
    cleaned_data = parse_xp_file()

    for level in range(current_level+1, target_level+1):
        XP_required += cleaned_data.get(level, 0)
    
    remaining_XP_required = XP_required - current_exp
    
    # include daily 2hr speedup
    time_required_hr = remaining_XP_required/XP_per_hr
    free_resets = count_resets_passed(current_ts, time_required_hr*3600)
    if free_resets > 0:
        #print(f"Will cross {free_resets} reset days.")
        remaining_time = time_required_hr - (2 * free_resets)
    else:
        remaining_time = time_required_hr
        
    eta = current_ts + timedelta(seconds=remaining_time*3600)
    eta_converted = eta.astimezone(pytz.timezone(tgt_timezone))
    return(eta_converted)

def count_resets_passed(start_time: datetime, delta_seconds: float) -> int:
    reset_time = 13  # Reset time in UTC (13:00 UTC)
    end_time = start_time + timedelta(seconds=delta_seconds)
    
    start_shifted = start_time - timedelta(hours=reset_time)
    end_shifted = end_time - timedelta(hours=reset_time)
    
    days_passed = (end_shifted.date() - start_shifted.date()).days
    
    return days_passed

if __name__ == "__main__":
    if len(sys.argv) == 5:
        tgt_timezone = "America/New_York"
    elif len(sys.argv) == 6:
        tgt_timezone = sys.argv[5]
    else:
        #print("Usage: python calc_xp.py <current_level> <current_exp> <target_level> <XP_per_hr>")
        sys.exit(1)
    
    current_level = int(sys.argv[1])
    current_exp = int(sys.argv[2])
    target_level = int(sys.argv[3])
    XP_per_hr = float(sys.argv[4])
    
    current_ts = datetime.now(timezone.utc)
    
    eta = calc_eta(current_level,
                   current_exp,
                   target_level,
                   XP_per_hr,
                   current_ts,
                   tgt_timezone=tgt_timezone)
    print(eta)
