# Setup

```bash
cd toolkit && npm install && npm run build && cd ..
pip install -r requirements.txt
cp config.example.yaml config.yaml
python3 scripts/validate_skill.py
```

Then configure:

- `wechat.appid`
- `wechat.secret`
- optional image provider keys for `gemini`, `openai`, `doubao`, or `qwen`

Do not ask the user to paste secrets directly into chat history when the host offers a safer configuration path. Prefer guiding the user to edit `config.yaml` locally.

Finally, add your current public IP to the WeChat API whitelist.
