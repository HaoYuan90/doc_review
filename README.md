# doc_review
A Google Doc plugin to handle doc reviews/approvals

Project is set up using https://github.com/google/aside

Run the following command to transpile Typescript to Javascript and publish all scripts to Google Apps Script project (using [clasp](https://github.com/google/clasp))
```bash
npm deploy
```

*TODO*: Document required clasp config just in case.

*TODO*: @OnlyCurrentDoc annotation is not added to main script.

*TODO*: Re-enable license module. Currently license module adds license header to some empty files and is causing memory leak during `ng build`.

