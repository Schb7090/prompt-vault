# fabric-prompt

Generate, improve, or transform prompts using [fabric](https://github.com/danielmiessler/fabric) AI patterns.

## Usage

```
/fabric-prompt [pattern] [topic or raw prompt]
```

**Examples:**
- `/fabric-prompt improve_prompt` — improve an existing prompt you paste in
- `/fabric-prompt create_art_prompt` — turn a concept into a rich image-gen prompt
- `/fabric-prompt greybeard_secure_prompt_engineer` — harden a prompt for security/edge cases
- `/fabric-prompt summarize_prompt` — compress a long prompt to its essence
- `/fabric-prompt` — interactive: list all prompt-related patterns and let user choose

## What this skill does

1. **Check fabric is installed** at `~/.local/bin/fabric`. If not, install it automatically.
2. **Ensure fabric patterns are up to date** (runs `--updatepatterns` if the patterns directory is empty or missing).
3. **Ensure an API key is configured** in `~/.config/fabric/.env`. If not, prompt the user to provide one.
4. **Run the chosen fabric pattern** against the user's input.
5. **Save the output** as a new prompt file in `$PROMPT_VAULT/prompts/` (creating the folder if needed).
6. **Commit and push** the new prompt file to the current branch.

## Step-by-step instructions

### Step 1 — Parse arguments from `$ARGUMENTS`

- First word (if present) is the **pattern name**.
- Remaining words are the **topic / raw prompt** to feed into fabric.
- If no pattern given, default to `improve_prompt`.
- If no topic given, ask the user to paste in their draft prompt or describe what they need.

Valid prompt-generation patterns (check with `fabric --listpatterns`):
- `improve_prompt` — rewrites and strengthens any prompt using OpenAI's prompt-engineering guide
- `create_art_prompt` — turns a concept into a detailed image-generation prompt
- `greybeard_secure_prompt_engineer` — adds edge-case hardening and adversarial robustness
- `summarize_prompt` — distils a verbose prompt to its minimal effective form

### Step 2 — Verify fabric installation

Run: `which fabric || ls ~/.local/bin/fabric`

If not found:
```bash
mkdir -p ~/.local/bin
curl -L https://github.com/danielmiessler/fabric/releases/download/v1.4.452/fabric_Linux_x86_64.tar.gz \
  -o /tmp/fabric.tar.gz
tar -xzf /tmp/fabric.tar.gz -C /tmp/
cp /tmp/fabric ~/.local/bin/fabric
chmod +x ~/.local/bin/fabric
export PATH="$HOME/.local/bin:$PATH"
```

Then verify: `fabric --version`

### Step 3 — Verify patterns exist

```bash
ls ~/.config/fabric/patterns/ 2>/dev/null | wc -l
```

If 0 or directory missing:
```bash
mkdir -p ~/.config/fabric && touch ~/.config/fabric/.env
fabric --updatepatterns
```

### Step 4 — Verify API key is configured

Read `~/.config/fabric/.env`. It should contain at least one of:
- `ANTHROPIC_API_KEY=...`
- `OPENAI_API_KEY=...`
- `GEMINI_API_KEY=...`

If empty or missing the key, ask the user:
> "Fabric needs an API key to run LLM patterns. Which provider would you like to use? Please share your API key and I'll add it to `~/.config/fabric/.env`."

Once provided, append to `~/.config/fabric/.env`:
```
ANTHROPIC_API_KEY=<key>
```

Then set the default model in fabric:
- For Anthropic: `claude-sonnet-4-6`
- For OpenAI: `gpt-4o`

Write the model to `~/.config/fabric/.env`:
```
DEFAULT_MODEL=claude-sonnet-4-6
DEFAULT_VENDOR=Anthropic
```

### Step 5 — Run the fabric pattern

```bash
export PATH="$HOME/.local/bin:$PATH"
echo "<user_input>" | fabric --pattern <pattern_name>
```

Capture the output. If fabric returns an error, surface the error message clearly and stop.

### Step 6 — Save to prompt vault

Determine a slug from the topic (lowercase, spaces→hyphens, max 40 chars).
Save to: `/home/user/prompt-vault/prompts/<slug>-<pattern>.md`

File format:
```markdown
# <Slug title>

**Pattern:** `<pattern_name>`
**Generated:** <YYYY-MM-DD>

---

<fabric output here>
```

Create the `prompts/` directory if it doesn't exist.

### Step 7 — Commit and push

```bash
git add prompts/<filename>
git commit -m "Add fabric prompt: <slug> via <pattern>"
git push -u origin <current-branch>
```

Report the saved file path and commit hash to the user.
