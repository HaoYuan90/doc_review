/**
 * @preserve
 * @OnlyCurrentDoc
 */

import {
  ReviewerType,
  ReviewStatus,
  ReviewerInfoStatus,
} from './comment-module';

const docReviewTableStr = '#insertDocReviewTable';

export function getDocReviewInsertionPoint() {
  const body = DocumentApp.getActiveDocument().getBody();
  const searchResult = body.findText(docReviewTableStr);
  if (!searchResult) {
    console.warn(`Doc review table anchor ${docReviewTableStr} is not found.`);
    return null;
  }
  return searchResult.getElement();
}

function getClosestParentParagraph(element: GoogleAppsScript.Document.Element) {
  let parent = element.getParent();
  while (parent && parent.getType() !== DocumentApp.ElementType.PARAGRAPH) {
    parent = parent.getParent();
  }
  return parent;
}

/**
 * Inserts a four column table into the document at the specified element.
 * The table will have the following columns:
 * 1. Reviewer name
 * 2. Reviewer type (Reviewer or Approver)
 * 3. Reviewer team
 * 4. Review status
 *
 * @param element The element to insert the doc review table into.
 * @param reviewers The list of reviewers to insert into the table.
 */
export function insertDocReviewTable(
  element: GoogleAppsScript.Document.Element,
  reviewers: ReviewerInfoStatus[]
) {
  const parentPara = getClosestParentParagraph(element);
  if (!parentPara) {
    console.warn('Failed to find parent paragraph of insertion anchor.');
    return;
  }
  const body = DocumentApp.getActiveDocument().getBody();
  const parentDom = parentPara.getParent();

  const cells = [['#DocReview', 'Team', 'Type', 'Status']];
  // TODO: Create smart chip of type "person" instead of using just the person's name.
  // This feature is not supported by apps script yet.
  // https://issuetracker.google.com/issues/225584757
  for (const reviewer of reviewers) {
    cells.push([
      reviewer.info.name,
      reviewer.info.team,
      reviewer.info.type,
      reviewer.status,
    ]);
  }

  const table = body.insertTable(
    parentDom.getChildIndex(parentPara) + 1,
    cells
  );
  for (let r = 1; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    row.getCell(0).asText().setBold(true); // Bold reviewer name
    const reviewStatus = row.getCell(3).getText();
    row.getCell(3).asText().setBold(true); // Bold review status
    if (reviewStatus === ReviewStatus.Approved) {
      row.getCell(3).asText().setForegroundColor('#00ff00'); // green
    } else if (reviewStatus === ReviewStatus.InProgress) {
      row.getCell(3).asText().setForegroundColor('#ff9900'); // orange
    } else if (reviewStatus === ReviewStatus.NotStarted) {
      row.getCell(3).asText().setForegroundColor('#ff0000'); // red
    }
  }
  // TODO: delete insertion anchor after inserting the table
}

// TODO: This function is for testing purposes only. It should be removed in production.
export function testInsert() {
  const element = getDocReviewInsertionPoint();
  if (!element) {
    console.warn('Element is null');
    return;
  }
  const reviewers: ReviewerInfoStatus[] = [
    {
      info: {
        email: 'email@gmail.com',
        name: 'Xiao Ming 1',
        type: ReviewerType.Reviewer,
        team: 'xfn',
      },
      status: ReviewStatus.NotStarted,
    },
    {
      info: {
        email: 'email@gmail.com',
        name: 'Xiao Ming 2',
        type: ReviewerType.Approver,
        team: '',
      },
      status: ReviewStatus.InProgress,
    },
    {
      info: {
        email: 'email@gmail.com',
        name: 'Xiao Ming 3',
        type: ReviewerType.Approver,
        team: 'meowski',
      },
      status: ReviewStatus.Approved,
    },
  ];
  insertDocReviewTable(element, reviewers);
  console.log('Inserted doc review table');
}
