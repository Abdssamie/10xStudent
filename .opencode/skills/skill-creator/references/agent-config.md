# Agent Configuration Files

Agent-specific configuration files live in the `agents/` folder and provide UI metadata and platform-specific settings. These files are read by the agent platform/harness, not by the AI agent itself.

## File Naming Convention

Configuration files are named after the agent platform: `agents/<agent-name>.yaml`

Examples:
- `agents/openai.yaml` - OpenAI-specific configuration
- `agents/anthropic.yaml` - Anthropic-specific configuration
- `agents/generic.yaml` - Generic/fallback configuration

## Common Interface Fields

Most agent platforms support these common interface fields:

```yaml
interface:
  display_name: "User-facing skill name"
  short_description: "Brief description for UI (25-64 chars)"
  icon_small: "./assets/small-icon.png"
  icon_large: "./assets/large-logo.svg"
  brand_color: "#3B82F6"
  default_prompt: "Example prompt to use this skill"
```

### Field Descriptions and Constraints

**Common constraints:**
- Quote all string values
- Keep keys unquoted
- For `default_prompt`: Generate a helpful, short (typically 1 sentence) example starting prompt based on the skill

**Field definitions:**

- `interface.display_name`: Human-facing title shown in UI skill lists and chips
- `interface.short_description`: Human-facing short UI blurb (25–64 chars) for quick scanning
- `interface.icon_small`: Path to a small icon asset (relative to skill dir). Default to `./assets/`
- `interface.icon_large`: Path to a larger logo asset (relative to skill dir). Default to `./assets/`
- `interface.brand_color`: Hex color used for UI accents (e.g., badges)
- `interface.default_prompt`: Default prompt snippet inserted when invoking the skill

## Platform-Specific Extensions

Different agent platforms may support additional fields beyond the common interface.

### OpenAI Platform Example

```yaml
interface:
  display_name: "Skill Name"
  short_description: "Help with specific tasks and workflows"
  default_prompt: "Use this skill to accomplish X"

dependencies:
  tools:
    - type: "mcp"
      value: "github"
      description: "GitHub MCP server"
      transport: "streamable_http"
      url: "https://api.githubcopilot.com/mcp/"
```

**OpenAI-specific fields:**
- `dependencies.tools[].type`: Dependency category (currently only `mcp` supported)
- `dependencies.tools[].value`: Identifier of the tool or dependency
- `dependencies.tools[].description`: Human-readable explanation of the dependency
- `dependencies.tools[].transport`: Connection type when `type` is `mcp`
- `dependencies.tools[].url`: MCP server URL when `type` is `mcp`

### Adding Support for New Platforms

To add support for a new agent platform:

1. Create a new config file: `agents/<platform-name>.yaml`
2. Include the common interface fields
3. Add any platform-specific extensions as needed
4. Document platform-specific fields in this file

## Generating Configuration Files

Use the `generate_agent_config.py` script to create agent configuration files:

```bash
# Generate OpenAI config (default)
scripts/generate_agent_config.py <skill-dir>

# Generate config for a specific platform
scripts/generate_agent_config.py <skill-dir> --agent anthropic

# Override interface fields
scripts/generate_agent_config.py <skill-dir> --agent openai \
  --interface display_name="Custom Name" \
  --interface short_description="Custom description for the UI"
```

The script automatically generates sensible defaults for `display_name` and `short_description` based on the skill name, but you can override any interface field.
