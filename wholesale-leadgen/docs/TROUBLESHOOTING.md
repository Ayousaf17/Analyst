# Troubleshooting Guide

Common issues and solutions for the Wholesale Lead Generation System.

## Table of Contents

1. [Airtable Issues](#airtable-issues)
2. [API & Credential Issues](#api--credential-issues)
3. [Workflow Execution Issues](#workflow-execution-issues)
4. [Email/SMS Delivery Issues](#emailsms-delivery-issues)
5. [Scraping Issues](#scraping-issues)
6. [AI/OpenRouter Issues](#aiopenrouter-issues)

---

## Airtable Issues

### "INVALID_FILTER_BY_FORMULA" Error

**Symptom:** Workflow fails with Airtable formula error.

**Solutions:**
1. Check field names match exactly (case-sensitive)
2. Verify field types (text vs number vs date)
3. Test formula in Airtable's filter view first
4. Escape special characters in formulas

```
# Wrong
{AI Score} >= "40"

# Correct
{AI Score} >= 40
```

### "TABLE_NOT_FOUND" Error

**Symptom:** Airtable node can't find table.

**Solutions:**
1. Verify `AIRTABLE_BASE_ID` environment variable is set
2. Check table name matches exactly
3. Ensure Airtable token has access to the base
4. Try using table ID instead of name

### Records Not Updating

**Symptom:** Update operations complete but data doesn't change.

**Solutions:**
1. Verify record ID is correct (not the record data)
2. Check field names in mapping
3. Ensure field types match (can't put text in number field)
4. Look for field validation rules in Airtable

---

## API & Credential Issues

### "401 Unauthorized" - Any API

**Solutions:**
1. Regenerate API key/token
2. Check credential is linked to correct node
3. Verify API key has required permissions
4. Check if API key has expired

### OpenRouter "402 Payment Required"

**Solutions:**
1. Add credits to OpenRouter account
2. Check usage limits on your plan
3. Verify billing is set up

### Gmail "Token Expired"

**Solutions:**
1. Re-authenticate Gmail OAuth in n8n credentials
2. Check Google Cloud Console - ensure OAuth consent screen is configured
3. Verify redirect URI matches n8n URL

### Twilio "Invalid Phone Number"

**Solutions:**
1. Format as E.164: `+15551234567`
2. Verify number is SMS-capable
3. Check number isn't on do-not-call list
4. Ensure Twilio number can send to destination country

---

## Workflow Execution Issues

### Workflow Not Triggering

**Symptom:** Scheduled workflow doesn't run.

**Solutions:**
1. Check workflow is **Active** (toggle in top right)
2. Verify trigger schedule is correct
3. Check n8n server timezone matches expectations
4. Look for errors in n8n execution log
5. Test with manual execution first

### "Cannot read property of undefined"

**Symptom:** Code node fails with undefined error.

**Solutions:**
1. Add null checks: `$json.fields?.['Field Name']`
2. Verify previous node returned data
3. Use `$input.all()` to see what data is available
4. Check node reference names match exactly

```javascript
// Defensive coding
const value = $json.fields?.['AI Score'] || 0;
const leads = $('Node Name').all() || [];
```

### Loop Never Completes

**Symptom:** Split In Batches runs forever.

**Solutions:**
1. Ensure loop output connects back to loop node
2. Check there's a "done" output path
3. Verify batch size > 0
4. Add logging to track iterations

### Rate Limiting / Too Many Requests

**Solutions:**
1. Add Wait nodes between API calls
2. Reduce batch sizes
3. Spread schedules throughout the day
4. Check API rate limits documentation

---

## Email/SMS Delivery Issues

### Emails Going to Spam

**Solutions:**
1. Set up SPF, DKIM, DMARC for your domain
2. Use a custom domain (not @gmail.com for bulk)
3. Warm up new sending addresses gradually
4. Avoid spam trigger words
5. Include unsubscribe option
6. Keep sending volume consistent

### SMS Not Sending

**Symptom:** Twilio node succeeds but no SMS received.

**Solutions:**
1. Check Twilio dashboard for delivery status
2. Verify phone number format (+1XXXXXXXXXX)
3. Check if number is blocked or unsubscribed
4. Verify Twilio account isn't in trial mode
5. Check geographic permissions in Twilio

### Gmail OAuth Scope Issues

**Symptom:** Can read but can't send, or vice versa.

**Solutions:**
1. Re-authorize with all required scopes:
   - `gmail.send`
   - `gmail.readonly`
   - `gmail.modify`
2. Delete credential and recreate
3. Check Google Cloud Console API is enabled

---

## Scraping Issues

### Zillow/Craigslist Blocked

**Symptom:** HTTP 403 or empty results.

**Solutions:**
1. Rotate User-Agent headers
2. Add delays between requests (30-60 seconds)
3. Use residential proxy service
4. Check if site structure changed
5. Consider using official APIs or third-party services

### Facebook Marketplace Scraping Fails

**Note:** FB actively blocks scraping. Use Apify or similar service.

**Solutions:**
1. Set up Apify account with FB Marketplace actor
2. Configure webhook for results
3. Respect rate limits
4. Use residential proxies

### Data Format Changed

**Symptom:** Parsing errors or missing data.

**Solutions:**
1. Inspect actual response in n8n
2. Update CSS selectors/JSON paths
3. Add fallback values for missing fields
4. Consider paid data providers for reliability

---

## AI/OpenRouter Issues

### AI Returns Invalid JSON

**Symptom:** JSON.parse fails on AI response.

**Solutions:**
1. Use regex to extract JSON: `content.match(/\{[\s\S]*\}/)`
2. Lower temperature (0.3-0.5)
3. Be explicit in prompt: "Return ONLY valid JSON"
4. Add try/catch with fallback values

```javascript
let result = defaultValue;
try {
  const content = aiResponse.choices[0].message.content;
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    result = JSON.parse(jsonMatch[0]);
  }
} catch (e) {
  console.log('AI parse error, using defaults');
}
```

### AI Responses Inconsistent

**Solutions:**
1. Lower temperature (0.1-0.3 for structured output)
2. Provide more examples in prompt
3. Use system message for consistent behavior
4. Add validation for required fields

### "Model Not Found" Error

**Solutions:**
1. Check model name is correct: `anthropic/claude-3.5-sonnet`
2. Verify model is available on your OpenRouter plan
3. Check OpenRouter status page
4. Try fallback model

### Vision/Photo Analysis Fails

**Solutions:**
1. Verify image URL is publicly accessible
2. Check image format (JPEG, PNG, WebP)
3. Ensure image isn't too large (< 20MB)
4. Try with a known working image URL first

---

## Quick Diagnostic Steps

1. **Check n8n Execution Log**
   - Click on workflow name → Executions
   - Look for failed executions
   - Click to see error details

2. **Test Individual Nodes**
   - Use "Execute Node" to test in isolation
   - Check input/output data

3. **Verify Environment Variables**
   - Settings → Variables
   - Ensure `AIRTABLE_BASE_ID` is set

4. **Check Credentials**
   - Settings → Credentials
   - Test each credential

5. **Review Airtable Data**
   - Check if records exist
   - Verify field values match expected filters

---

## Getting Help

1. **n8n Community Forum**: [community.n8n.io](https://community.n8n.io)
2. **n8n Documentation**: [docs.n8n.io](https://docs.n8n.io)
3. **OpenRouter Discord**: For API issues
4. **Airtable Support**: For database issues

When reporting issues, include:
- Workflow JSON (sanitize credentials)
- Error message
- n8n version
- Steps to reproduce
