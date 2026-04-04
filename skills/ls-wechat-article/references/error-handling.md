# Error Handling

## Common failures

| Symptom | Meaning | Fix |
|---------|---------|-----|
| `errcode=40164` or IP-related error | Current public IP is not whitelisted | Re-check public IP and update WeChat whitelist |
| `tsc: command not found` | Toolkit dependencies are not installed | Run `cd toolkit && npm install` |
| `Draft 文件不存在` | Learning input path is wrong | Verify `--draft` and `--final` paths |
| `未配置可用的 image provider` | No image API key is configured | Add a key under `image.providers.*.api_key` |
| `history.yaml 格式异常` | Invalid YAML structure | Repair the file to be a YAML list |

## Recovery rule

If publishing fails, do not abandon the workflow. Generate a local preview and return that file path so the user can continue.
