# Assessment Test Scenarios

Use these personas to test different risk profiles and career paths.

---

## High Risk (70-90 score expected)

### 1. Data Entry Clerk
**Onboarding:**
- Job Title: Data Entry Clerk
- Years of Experience: 3
- Salary: $35,000

**Assessment conversation points:**
- "I enter invoice data into our accounting system all day"
- "I copy information from PDFs and emails into spreadsheets"
- "I verify that numbers match between documents"
- "I use Excel and our company's database software"
- "Maybe 10% of my time is spent asking coworkers questions about unclear entries"

---

### 2. Customer Service Representative (Phone/Chat)
**Onboarding:**
- Job Title: Customer Service Rep
- Years of Experience: 2
- Salary: $38,000

**Assessment conversation points:**
- "I answer customer questions via chat and phone"
- "Most questions are about order status, returns, and billing"
- "I follow scripts for common issues"
- "I use Zendesk and our order management system"
- "About 80% of calls are routine, 20% need supervisor help"

---

## Medium Risk (40-60 score expected)

### 3. Marketing Manager
**Onboarding:**
- Job Title: Marketing Manager
- Years of Experience: 7
- Salary: $95,000

**Assessment conversation points:**
- "I develop marketing strategies and manage campaigns"
- "I analyze campaign performance data and adjust budgets"
- "I work with agencies and manage a small team of 3"
- "I present results to executives monthly"
- "I use HubSpot, Google Analytics, and Tableau"
- "Maybe 40% strategy, 30% data analysis, 30% people management"

---

### 4. Financial Analyst
**Onboarding:**
- Job Title: Financial Analyst
- Years of Experience: 4
- Salary: $75,000

**Assessment conversation points:**
- "I build financial models and forecasts"
- "I analyze company performance and create reports for leadership"
- "I work closely with department heads to understand their budgets"
- "I use Excel heavily, plus our ERP system and Power BI"
- "About 50% modeling, 30% meetings, 20% presentations"

---

## Low Risk (10-35 score expected)

### 5. Registered Nurse
**Onboarding:**
- Job Title: Registered Nurse
- Years of Experience: 8
- Salary: $82,000

**Assessment conversation points:**
- "I provide direct patient care in a hospital setting"
- "I assess patients, administer medications, monitor vitals"
- "I coordinate with doctors and other nurses on care plans"
- "I educate patients and families about conditions and treatment"
- "I use electronic health records but most of my day is hands-on care"
- "Probably 70% patient interaction, 20% documentation, 10% coordination"

---

### 6. Construction Project Manager
**Onboarding:**
- Job Title: Construction Project Manager
- Years of Experience: 12
- Salary: $110,000

**Assessment conversation points:**
- "I manage commercial construction projects from start to finish"
- "I'm on job sites 3-4 days a week coordinating contractors"
- "I handle scheduling, budgets, permits, and inspections"
- "I negotiate with vendors and resolve conflicts between trades"
- "I use Procore and Microsoft Project, but most of my job is people and site management"

---

### 7. Elementary School Teacher
**Onboarding:**
- Job Title: 3rd Grade Teacher
- Years of Experience: 6
- Salary: $52,000

**Assessment conversation points:**
- "I teach all core subjects to my class of 24 students"
- "I develop lesson plans and adapt them based on student needs"
- "I work with parents on student progress and behavioral issues"
- "A lot of my job is managing classroom dynamics and keeping kids engaged"
- "I use Google Classroom but most of my day is face-to-face teaching"

---

## Edge Cases

### 8. Software Engineer (Interesting case - medium risk)
**Onboarding:**
- Job Title: Software Engineer
- Years of Experience: 5
- Salary: $140,000

**Assessment conversation points:**
- "I write backend code in Python and Go"
- "I spend a lot of time in code reviews and design discussions"
- "I debug production issues and optimize performance"
- "I mentor junior developers"
- "Maybe 50% coding, 25% reviews/meetings, 25% debugging"

---

### 9. Freelance Graphic Designer
**Onboarding:**
- Job Title: Graphic Designer
- Years of Experience: 4
- Salary: $55,000

**Assessment conversation points:**
- "I create logos, marketing materials, and social media graphics"
- "I work directly with clients to understand their brand"
- "I use Adobe Creative Suite, Figma"
- "A lot of my work is revisions based on client feedback"
- "Maybe 60% design work, 30% client communication, 10% admin"

---

## Testing Multiple Accounts Without Multiple Emails

### Option 1: Gmail "+" Trick (Recommended)
If your email is `yourname@gmail.com`, you can use:
- `yourname+test1@gmail.com`
- `yourname+test2@gmail.com`
- `yourname+nurse@gmail.com`
- `yourname+dataentry@gmail.com`

All emails go to your main inbox, but Clerk sees them as different accounts.

### Option 2: Gmail "." Trick
Gmail ignores dots in the local part:
- `your.name@gmail.com`
- `y.ourname@gmail.com`
- `yourn.ame@gmail.com`

All go to the same inbox but are treated as different emails.

### Option 3: Clerk Test Mode
In Clerk Dashboard → Users, you can:
1. Create users manually with any email (they won't receive verification emails in test mode)
2. Use Clerk's test phone numbers for phone auth

### Option 4: Temporary Email Services
For quick tests without cluttering your inbox:
- temp-mail.org
- guerrillamail.com
- 10minutemail.com

---

## Expected Results Summary

| Persona | Expected Risk | Key Factors |
|---------|---------------|-------------|
| Data Entry Clerk | 80-90 | Highly repetitive, rule-based tasks |
| Customer Service Rep | 70-85 | Scripted responses, routine inquiries |
| Marketing Manager | 45-55 | Mix of strategy (protected) and analysis (exposed) |
| Financial Analyst | 50-60 | Modeling exposed, relationship work protected |
| Registered Nurse | 15-25 | Physical care, human judgment, empathy |
| Construction PM | 20-30 | Site presence, negotiation, physical coordination |
| Teacher | 20-30 | Human connection, adaptability, child development |
| Software Engineer | 45-60 | Coding exposed, design/mentoring protected |
| Graphic Designer | 55-70 | Production work exposed, client work partially protected |
