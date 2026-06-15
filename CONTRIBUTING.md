# Contributing to PSU-CS Academic Projects

Welcome! This organization serves as the central showcase for computer science coursework and personal projects from Palawan State University students. 

Follow these instructions to ensure your project is properly formatted and automatically displayed on our [Showcase Website](https://psu-cs-academic-projects.github.io).

## 1. Create Your Repository
- Create your project repository directly within the **PSU-CS-Academic-Projects** GitHub Organization.
- Ensure the repository visibility is set to **Public**. Private repositories will not be indexed by the showcase website.

## 2. Add GitHub Topics (Tags)
Our website relies on GitHub Repository Topics to categorize and filter projects. 
On the right-hand side of your repository's main page, click the gear icon ⚙️ next to "About" to add topics.

**Required Subject Tags (Choose One):**
- `wst` (Web System and Technology)
- `sia` (System Integration Architecture)

**Technology Tags:**
Add any relevant technologies used in your project (e.g., `react`, `nodejs`, `python`, `mysql`, `firebase`).

## 3. Format Your README.md
The showcase website automatically reads your `README.md` to extract information about your team, video demos, and screenshots. **You must use exact headings for the parser to find them.**

Copy and paste the templates below into your README:

### Team Members
List all contributing students as bullet points under a `### Members` or `### Contributors` heading.

```markdown
### Members
* John Doe
* Jane Doe
* Alex Smith
```

### Video Demonstration
Provide a direct link to your live demo or video walkthrough. 

```markdown
### Video Demonstration
https://youtube.com/watch?v=your-video-link
```

### Screenshots
Include images of your project under a `### Screenshots` heading. You can use relative paths (if the images are stored in your repo) or absolute external links (like Imgur).

```markdown
### Screenshots
![Login Page](screenshots/login.png)
![Dashboard](screenshots/dashboard.png)
![Mobile View](https://i.imgur.com/your-image.png)
```

## 4. Updates & Caching
The showcase website uses a static data system. Once your repository is public and properly formatted, it will automatically appear on the website the next time the organization's automation script (`parser.js`) is run by an administrator.

---

*Thank you for contributing to open-source learning at PSU!*
