# n8n Workflows Extracted

**Source:** https://github.com/nusquama/n8nworkflows.xyz
**Extraction Date:** 2025-11-26
**Total Workflows:** 6,232

## Contents

```
n8n-workflows-extracted/
├── workflows/           # 6,221 workflow JSON files
├── metadata/            # 6,240 metadata files
├── readmes/             # 6,241 README documentation files
├── workflows_catalog.json    # Complete catalog of all workflows
├── statistics.json      # Aggregated statistics
└── README.md            # This file
```

## Quick Stats

### Top Categories
| Category | Count |
|----------|-------|
| Multimodal AI | 2,038 |
| AI | 1,443 |
| Content Creation | 901 |
| AI Summarization | 739 |
| Marketing | 595 |
| AI Chatbot | 368 |
| Engineering | 352 |
| Market Research | 312 |
| Sales | 264 |
| Building Blocks | 258 |

### Top Node Types (Most Used)
| Node Type | Count |
|-----------|-------|
| n8n-nodes-base.stickyNote | 5,674 |
| n8n-nodes-base.set | 3,134 |
| n8n-nodes-base.httpRequest | 3,110 |
| n8n-nodes-base.code | 2,958 |
| n8n-nodes-base.if | 2,508 |
| @n8n/n8n-nodes-langchain.agent | 2,149 |
| n8n-nodes-base.googleSheets | 1,868 |
| n8n-nodes-base.manualTrigger | 1,579 |
| @n8n/n8n-nodes-langchain.lmChatOpenAi | 1,567 |
| n8n-nodes-base.scheduleTrigger | 1,507 |

### Top Contributors
| Author | Workflows |
|--------|-----------|
| Yaron Been | 248 |
| David Ashby | 225 |
| Rahul Joshi | 149 |
| Oneclick AI Squad | 135 |
| Davide | 98 |
| David Olusola | 93 |
| Robert Breen | 90 |
| Jimleuk | 79 |
| Jitesh Dugar | 56 |
| ghagrawal17 | 54 |

## Usage

### Import a Workflow
1. Open n8n
2. Go to Workflows > Import from File
3. Select any `.json` file from the `workflows/` directory

### Browse by Category
Check `statistics.json` for category breakdowns, then search workflow names.

### Find Specific Integrations
Use the `workflows_catalog.json` to search by `nodeTypes` array.

## File Formats

### Workflow JSON Structure
```json
{
  "nodes": [...],      // Array of workflow nodes
  "connections": {...}, // Node connections
  "pinData": {...}     // Pinned test data (optional)
}
```

### Metadata JSON Structure
```json
{
  "user_name": "Author Name",
  "url": "Original URL",
  "url_n8n": "n8n.io URL",
  "categories": [...],
  "nodeTypes": {...}
}
```

## License

Individual workflows retain their original licenses.
This extraction is for educational and research purposes.
