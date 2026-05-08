import re

with open("supabase/migrations/001_complete_setup.sql", "r", encoding="utf-8") as f:
    sql = f.read()

# get all tables and their columns
tables = {}
for match in re.finditer(r"CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+([a-zA-Z0-9_]+)\s*\((.*?)\);", sql, re.DOTALL):
    tables[match.group(1)] = match.group(2)

missing_tenant_id = []
for t, cols in tables.items():
    if "tenant_id" not in cols:
        missing_tenant_id.append(t)

print("Tables missing tenant_id:", missing_tenant_id)

# Find all DO blocks
do_blocks = re.findall(r"DO \$\$(.*?)\$\$", sql, re.DOTALL)
for block in do_blocks:
    if "tenant_id =" in block:
        # Check which array it loops over
        arr_match = re.search(r"ARRAY\[(.*?)\]", block, re.DOTALL)
        if arr_match:
            tabs = [s.strip(" '\n") for s in arr_match.group(1).split(",")]
            for t in tabs:
                if t in missing_tenant_id:
                    print(f"Error: DO loop uses tenant_id on table {t} but it lacks tenant_id")

# Check CREATE POLICY
for match in re.finditer(r"CREATE POLICY.*?ON\s+([a-zA-Z0-9_]+).*?USING\s*\((.*?)\);", sql, re.DOTALL | re.IGNORECASE):
    table = match.group(1).lower()
    cond = match.group(2)
    if "tenant_id" in cond and table in missing_tenant_id:
        print(f"Error: CREATE POLICY on {table} uses tenant_id but lacks it")

# Check CREATE INDEX
for match in re.finditer(r"CREATE INDEX.*?ON\s+([a-zA-Z0-9_]+)\s*\((.*?)\);", sql, re.DOTALL | re.IGNORECASE):
    table = match.group(1).lower()
    cols = match.group(2)
    if "tenant_id" in cols and table in missing_tenant_id:
        print(f"Error: CREATE INDEX on {table} uses tenant_id but lacks it")
