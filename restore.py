import json
import re
import os

log_path = "/home/jill/.gemini/antigravity-ide/brain/70056cd5-3143-4d3d-b8d3-aa5ddfcbed7f/.system_generated/logs/transcript.jsonl"
with open(log_path, 'r') as f:
    for line in f:
        data = json.loads(line)
        if "tool_calls" in data:
            for tc in data["tool_calls"]:
                name = tc.get("name")
                if name in ["write_to_file", "replace_file_content", "multi_replace_file_content"]:
                    print(f"--- {name} ---")
                    args = tc.get("args", {})
                    target = args.get("TargetFile")
                    if target:
                        print(f"Target: {target}")
                    else:
                        print(args)
