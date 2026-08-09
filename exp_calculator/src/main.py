import sys
from calc_xp import ExpCalc

if __name__ == "__main__":
    if len(sys.argv) == 6:
        tgt_timezone = "America/New_York"
    elif len(sys.argv) == 7:
        tgt_timezone = sys.argv[6]
    else:
        print("Usage: python calc_xp.py <current_level> <current_exp> <target_level> <XP_per_hr> <season> [<timezone>]")
        sys.exit(1)
    
    current_level = int(sys.argv[1])
    current_exp = int(sys.argv[2])
    target_level = int(sys.argv[3])
    XP_per_hr = int(sys.argv[4])
    season = int(sys.argv[5])
        
    exp_calc_client = ExpCalc(current_level,
                               current_exp,
                               target_level,
                               XP_per_hr,
                               season,
                               tgt_timezone)
    eta = exp_calc_client.calc_eta()
    print(eta)