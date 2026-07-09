import json

log_path = "/home/jill/.gemini/antigravity-ide/brain/70056cd5-3143-4d3d-b8d3-aa5ddfcbed7f/.system_generated/logs/transcript.jsonl"

file_states = {}

def get_lines(path):
    if path not in file_states:
        try:
            with open(path, 'r') as f:
                file_states[path] = f.read().split('\n')
        except FileNotFoundError:
            file_states[path] = []
    return file_states[path]

with open(log_path, 'r') as f:
    for line in f:
        data = json.loads(line)
        if "tool_calls" not in data: continue
        for tc in data["tool_calls"]:
            name = tc.get("name")
            args = tc.get("args", {})
            target = args.get("TargetFile")
            if not target or "brain/" in target: continue
            
            if name == "write_to_file":
                content = args.get("CodeContent", "")
                # Overwrite
                file_states[target] = content.split('\n')
            elif name == "replace_file_content":
                start = args.get("StartLine")
                end = args.get("EndLine")
                replacement = args.get("ReplacementContent", "").split('\n')
                lines = get_lines(target)
                if start and end and len(lines) > 0:
                    lines = lines[:start-1] + replacement + lines[end:]
                    file_states[target] = lines
            elif name == "multi_replace_file_content":
                chunks = args.get("ReplacementChunks", [])
                if isinstance(chunks, str):
                    chunks = json.loads(chunks, strict=False)
                # Apply chunks in reverse order of StartLine to not mess up indices
                chunks.sort(key=lambda x: x["StartLine"], reverse=True)
                lines = get_lines(target)
                if len(lines) > 0:
                    for chunk in chunks:
                        start = chunk["StartLine"]
                        end = chunk["EndLine"]
                        replacement = chunk["ReplacementContent"].split('\n')
                        lines = lines[:start-1] + replacement + lines[end:]
                    file_states[target] = lines

for path, lines in file_states.items():
    print(f"Restoring {path}")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write('\n'.join(lines))
