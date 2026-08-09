# Databricks notebook source
# /// script
# [tool.databricks.environment]
# environment_version = "5"
# ///
import requests
import json

# COMMAND ----------

url = "https://qenu.github.io/ethna-timeline/assets/data/exp_required.json"
data = requests.get(url).text


# COMMAND ----------

pdf = pd.DataFrame.from_dict(json.loads(data))
df = spark.createDataFrame(pdf)

# COMMAND ----------

import pandas as pd
df = pd.read_json(url)
df.columns

# COMMAND ----------

#SRC_DIR = Path(__file__).resolve().parent
#RESOURCES_PATH = SRC_DIR.parent.parent / "exp_calculator" / "resources" / "season_exp.json"
df = pd.read_json("../exp_calculator/resources/season_exp.json")
df.head()
                

# COMMAND ----------

import json
file_path = "../exp_calculator/resources/season_exp.json"
with open(file_path, "r") as f:
    data = json.load(f)
    
total = 0
for line in data:
    if  (line['level'] >= 100
        and line['level'] <= 102
        and line['season']==2):
        total += line['exp']
print(total)

# COMMAND ----------

print(type(data))

# COMMAND ----------

current_lvl = 100  # Set your current level here
target_lvl = 102
season = 2

exp_sum = df.filter(
    (df.season == season) &
    (df.level >= current_lvl) &
    (df.level <= target_lvl)
)#.agg({"exp": "sum"}).collect()[0][0]
exp_sum.head()
#print(exp_sum)

# COMMAND ----------

df.createOrReplaceTempView("exp_required")

# COMMAND ----------

# MAGIC %sql
# MAGIC select max(level), max(exp), season from exp_required group by season order by season

# COMMAND ----------

# MAGIC %sql
# MAGIC select * from exp_required where level = 137

# COMMAND ----------

