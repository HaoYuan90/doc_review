# doc_review
A Google Doc plugin to handle doc reviews/approvals

Project is set up using https://github.com/google/aside

Run the following command to transpile Typescript to Javascript and publish all scripts to Google Apps Script project (using [clasp](https://github.com/google/clasp))
```bash
npm run deploy
```

### Limitations
- Apps Script API does not return comment author's email address. Nor does it allow searching for a user's display name from email address.

*TODO*: Add dates to doc review table

*TODO*: Add linter to Angular project

*TODO*: Document required clasp config just in case.


