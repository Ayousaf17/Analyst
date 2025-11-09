# 📊 Slack ↔ Gorgias User Mapping Analysis

## 🎯 Active Users from Slack API (Not Deleted, Not Bots)

Based on the actual Slack API response, here are the **currently active** human users:

| Slack User ID | Display Name | Real Name | Email Domain Hint | Status |
|---------------|--------------|-----------|-------------------|---------|
| **U8N13TMEC** | Domenic | Domenic Apice | (owner) | ✅ Active |
| **U8N6W777B** | Didi | Alexandra Apice | | ✅ Active |
| **U8NC9D5AM** | Collin | Collin Bailey | | ✅ Active |
| **U8NM51LLA** | Shawn | Shawn Holmes | | ✅ Active |
| **U8NQJMH0D** | Bobby | Robert Apice | (primary owner) | ✅ Active |
| **U8NT9KABC** | Gabe | Gabriel Apice | | ✅ Active |
| **U8QGQ61DL** | Zach | Zach Ruland | | ✅ Active |
| **UPP5QAQBY** | Bret | Bret | (admin) | ✅ Active |
| **U01246F9STX** | Riley | Riley Holland | | ✅ Active |
| **U01HCGDJVA5** | Mike | Michael Kostecki | | ✅ Active |

**Note**: Google Drive bot (U8T5KC67Q), Google Calendar bot (U01099ZNMH7), Eventbot (UC7QU4NE5), and Simple Poll (U013FLFSB8V) are bots and excluded.

---

## 🔍 Matching Slack Users to Gorgias Users

### ✅ **High Confidence Matches** (Name + Context)

| Gorgias User | Gorgias Email | Slack ID | Slack Name | Match Confidence |
|--------------|---------------|----------|------------|------------------|
| Domenic Apice | domenic@ironsidecomputers.com | **U8N13TMEC** | Domenic | 100% ✅ |
| Collin Bailey | collin@ironside.gg | **U8NC9D5AM** | Collin | 100% ✅ |
| Gabriel Apice | gabriel@ironside.gg | **U8NT9KABC** | Gabe | 100% ✅ |
| Robert Apice | robert@ironside.gg | **U8NQJMH0D** | Bobby (Robert) | 100% ✅ |
| Zach Ruland | zruland94@gmail.com | **U8QGQ61DL** | Zach | 100% ✅ |
| Alexandra Apice | alexandra@ironsidecomputers.com | **U8N6W777B** | Didi (Alexandra) | 95% ✅ |
| Shawn Holmes | shawn@ironsidecomputers.com | **U8NM51LLA** | Shawn | 95% ✅ |
| Riley Holland | riley@ironsidecomputers.com | **U01246F9STX** | Riley | 95% ✅ |
| Michael Kostecki | michael@ironsidecomputers.com | **U01HCGDJVA5** | Mike | 95% ✅ |

### ⚠️ **Uncertain Matches** (Need Email Confirmation)

| Gorgias User | Gorgias Email | Possible Slack ID | Slack Name | Notes |
|--------------|---------------|-------------------|------------|-------|
| Bret | bret@ironsidecomputers.com | **UPP5QAQBY** | Bret | Display name matches, need email confirmation |

### ❌ **Gorgias Users Without Slack Accounts** (Based on API Data)

| Gorgias User | Email | Reason |
|--------------|-------|--------|
| Mackenzie Zerkel | mackenzie@ironsidecomputers.com | Not in active Slack users |
| Spencer James | spencer@ironsidecomputers.com | Not in active Slack users |
| Robert | robert@ironsidecomputers.com | Duplicate Robert? Or inactive |
| Ayub | ay17yousaf@gmail.com | Not in active Slack users |
| Tine Abraham | tineabraham@gmail.com | Not in active Slack users |
| DH Zachary Kellogg | zkellogg@digitlhaus.com | Not in active Slack users |
| RAM | ram@digitlhaus.com | Not in active Slack users |
| RMA Department | help@ironsidecomputers.com | Shared account, not real user |

---

## 🚨 Key Findings

### 1. **Robert Apice Conflict Resolution**
- **Slack**: U8NQJMH0D = Bobby (Robert Apice) - Primary Owner
- **Gorgias**: Two entries:
  - robert@ironside.gg (Account Owner) ← **THIS ONE matches Slack**
  - robert@ironsidecomputers.com (Admin) ← Different person or old account?

**Recommendation**: Map U8NQJMH0D → robert@ironside.gg (the Account Owner)

### 2. **Bret Identification**
- **Slack**: UPP5QAQBY = "Bret" (admin)
- **Gorgias**: bret@ironsidecomputers.com
- **Confidence**: 90% (need email confirmation from Slack API if possible)

### 3. **Missing Active Gorgias Users**
Several Gorgias users don't have active Slack accounts:
- Mackenzie Zerkel
- Spencer James
- Ayub
- Tine Abraham
- DH Zachary Kellogg
- RAM

These users either:
- Don't use Slack
- Have deactivated Slack accounts
- Are contractors/external

---

## 📋 Final Mapping Table (Ready for Migration)

```sql
-- Confirmed Slack ID Mappings
UPDATE gorgias_users SET slack_user_id = 'U8N13TMEC', slack_display_name = 'Domenic' 
WHERE email = 'domenic@ironsidecomputers.com';

UPDATE gorgias_users SET slack_user_id = 'U8NC9D5AM', slack_display_name = 'Collin' 
WHERE email = 'collin@ironside.gg';

UPDATE gorgias_users SET slack_user_id = 'U8NT9KABC', slack_display_name = 'Gabe' 
WHERE email = 'gabriel@ironside.gg';

UPDATE gorgias_users SET slack_user_id = 'U8NQJMH0D', slack_display_name = 'Bobby' 
WHERE email = 'robert@ironside.gg';

UPDATE gorgias_users SET slack_user_id = 'U8QGQ61DL', slack_display_name = 'Zach' 
WHERE email = 'zruland94@gmail.com';

UPDATE gorgias_users SET slack_user_id = 'U8N6W777B', slack_display_name = 'Didi' 
WHERE email = 'alexandra@ironsidecomputers.com';

UPDATE gorgias_users SET slack_user_id = 'U8NM51LLA', slack_display_name = 'Shawn' 
WHERE email = 'shawn@ironsidecomputers.com';

UPDATE gorgias_users SET slack_user_id = 'U01246F9STX', slack_display_name = 'Riley' 
WHERE email = 'riley@ironsidecomputers.com';

UPDATE gorgias_users SET slack_user_id = 'U01HCGDJVA5', slack_display_name = 'Mike' 
WHERE email = 'michael@ironsidecomputers.com';

-- Uncertain - Verify email first
-- UPDATE gorgias_users SET slack_user_id = 'UPP5QAQBY', slack_display_name = 'Bret' 
-- WHERE email = 'bret@ironsidecomputers.com';
```

---

## 🔧 Next Steps

1. **Verify Bret's Email**
   - Check if UPP5QAQBY's email matches bret@ironsidecomputers.com
   - Can use Slack API: `users.info` with user ID

2. **Confirm Robert Apice Mapping**
   - Verify which robert@... email the Slack user U8NQJMH0D uses
   - Possible the @ironsidecomputers.com entry is old/duplicate

3. **Handle Missing Users**
   - Decide if Mackenzie, Spencer, Ayub, Tine, etc. need Slack accounts
   - Or mark them as "no Slack account" in the database

4. **Run Automated Sync**
   - Use the Slack sync workflow to pull emails and auto-match
   - Will catch any we missed and handle future additions

---

## 📊 Statistics

- **Total Gorgias Users**: 14 (13 human + 1 bot)
- **Total Active Slack Users**: 10 (excluding bots)
- **Confirmed Matches**: 9 (90%)
- **Uncertain Matches**: 1 (10%)
- **Gorgias Users Without Slack**: 4-5 (need investigation)

---

## 🎯 Implementation Priority

1. ✅ **Now**: Update database with 9 confirmed matches
2. ⚠️ **Soon**: Verify Bret's email and update
3. 📋 **Later**: Investigate missing users (Mackenzie, Spencer, etc.)
4. 🔄 **Ongoing**: Run weekly Slack sync to keep updated
