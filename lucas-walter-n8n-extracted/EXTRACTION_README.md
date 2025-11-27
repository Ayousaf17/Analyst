# Lucas Walter n8n AI Automations - Extracted

**Source:** https://github.com/lucaswalter/n8n-ai-automations
**Author:** Lucas Walter (The Recap AI)
**Extraction Date:** 2025-11-27

## Summary

| Metric | Value |
|--------|-------|
| Total Workflows | 37 |
| Total Nodes | 869 |
| Avg Nodes/Workflow | 23.5 |
| Total Size | ~1.4 MB |

## Contents

```
lucas-walter-n8n-extracted/
├── workflows/           # 37 workflow JSON files
├── catalog.json         # Workflow index with metadata
├── statistics.json      # Node type statistics
├── README.md            # Original repository README
└── EXTRACTION_README.md # This file
```

## Workflow Categories

### AI Agents (6)
| File | Description |
|------|-------------|
| `marketing_team_agent.json` | Full marketing team replacement with voice |
| `dental_practice_voice_agent.json` | Appointment scheduling via voice |
| `whatsapp_ai_chatbot_agent.json` | Hospitality customer service bot |
| `ai_gmail_agent.json` | Email processing and response automation |
| `auto_repair_shop_gmail_agent.json` | Quote analysis and follow-ups |
| `web_developer_agent.json` | Website building with AI |

### Content Generation (10)
| File | Description |
|------|-------------|
| `ai_newsletter_generator.json` | Newsletter from news sources |
| `write_newsletter_tool.json` | Newsletter writing tool |
| `short_form_video_script_generator.json` | Video scripts from news |
| `local_podcast_generator.json` | Podcast from local events |
| `write_seo_optimized_listicle_article.json` | SEO article generation |
| `content_repurposing_factory.json` | Multi-format content repurposing |
| `repurpose_to_twitter_thread_tool.json` | Twitter thread creation |
| `repurpose_to_short_form_script_tool.json` | Short-form script conversion |
| `generate_image_tool.json` | AI image generation |
| `generate_talking_avatar_tool.json` | HeyGen avatar videos |

### Video Generation (7)
| File | Description |
|------|-------------|
| `sora_2_ugc_ecommerce_video_generator.json` | UGC videos with Sora 2 |
| `sora2_ugc_consistent_character_ads_generator.json` | Consistent character ads |
| `veo_3.1_product_photo_animator.json` | Product photo animation |
| `veo_3_viral_bigfoot_vlog_generator.json` | Viral vlog generation |
| `viral_youtube_video_clipper.json` | YouTube video clipping |
| `reverse_engineer_viral_ai_videos.json` | Viral video analysis |
| `facebook_ugc_video_ad_thief.json` | UGC ad recreation |

### Web Scraping & Data (7)
| File | Description |
|------|-------------|
| `ai_scraping_pipeline.json` | Universal scraping pipeline |
| `ai_news_data_ingestion.json` | News ingestion and evaluation |
| `firecrawl_scrape_url.json` | Firecrawl URL scraping |
| `firecrawl_email_scraper.json` | Email extraction from websites |
| `twitter_x_scraping.json` | Twitter/X content scraping |
| `web_develop_agent_tool_scrape_website.json` | Website scraping tool |
| `web_develop_agent_tool_write_website_prd.json` | PRD generation tool |

### Marketing & Ads (5)
| File | Description |
|------|-------------|
| `nano_banana_ad_creative_generator.json` | AI ad creative generation |
| `nano_banana_facebook_ad_thief.json` | Facebook ad analysis |
| `nano_banana_static_ad_variation_generator.json` | Ad variation generator |
| `twitter_reply_guy_agent.json` | Twitter engagement bot |
| `deal_breakdown_lawyer_lead_gen.json` | Lead generation automation |

### Utilities (2)
| File | Description |
|------|-------------|
| `cal_ai_clone_backend.json` | Calorie estimation from images |
| `email_research_report_tool.json` | Research report distribution |

## Top Node Types Used

| Node Type | Count |
|-----------|-------|
| n8n-nodes-base.set | 120 |
| n8n-nodes-base.httpRequest | 92 |
| n8n-nodes-base.stickyNote | 70 |
| n8n-nodes-base.slack | 49 |
| @n8n/n8n-nodes-langchain.chainLlm | 45 |
| n8n-nodes-base.splitOut | 43 |
| @n8n/n8n-nodes-langchain.outputParserStructured | 33 |
| n8n-nodes-base.aggregate | 28 |
| n8n-nodes-base.if | 27 |
| @mendable/n8n-nodes-firecrawl.firecrawl | 17 |

## Key Technologies

- **AI Models:** Google Gemini, OpenAI GPT-4
- **Video:** Sora 2, Veo 3.1, HeyGen, Vizard AI
- **Scraping:** Firecrawl, Apify
- **Communication:** Slack, WhatsApp, Gmail, Twitter/X
- **Storage:** AWS S3, Google Drive

## Usage

Import any `.json` file directly into n8n via Workflows > Import from File.

## License

Original workflows by Lucas Walter / The Recap AI.
