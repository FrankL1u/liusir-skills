# Error Handling

Use this file for shared recovery rules across skills.

## Common failures

| Symptom | Meaning | Fix |
|---------|---------|-----|
| `command not found` | Required runtime or dependency is missing | Install the missing tool, then rerun the command |
| build tool fails to start | Local dependencies are not installed | Run the skill's install step before retrying |
| config file missing | Required local configuration is absent | Create the config from the example file and fill required fields |
| auth or provider error | Credentials, token, or remote access is unavailable | Recheck the configured key, token, endpoint, or account state |
| YAML / JSON parse error | Structured data file is malformed | Repair the file so it is valid YAML or JSON before continuing |
| input file not found | Path or file selection is wrong | Recheck the input path and retry |

## Recovery rule

If one step fails, do not abandon the whole workflow by default.
Preserve any usable local output, explain the failing step, and continue with the next safe fallback when possible.

## Rule

Keep this file generic.
Skill-specific failures should stay in that skill's own references, README, or pipeline notes.
