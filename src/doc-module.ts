/**
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @preserve
 * @OnlyCurrentDoc
 */

import {
  ReviewerType,
  ReviewStatus,
  ReviewerInfoStatus,
} from './comment-module';

const docReviewAnchorStr = '#insertDocReviewTable';
const docReviewTableStr = '#DocReview';

export function getDocReviewInsertionPoint() {
  const body = DocumentApp.getActiveDocument().getBody();
  const searchResult = body.findText(docReviewAnchorStr);
  if (!searchResult) {
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

function getClosestParentTable(element: GoogleAppsScript.Document.Element) {
  let parent = element.getParent();
  while (parent && parent.getType() !== DocumentApp.ElementType.TABLE) {
    parent = parent.getParent();
  }
  return parent;
}

/**
 * Inserts doc review table into the document at the specified location from input reviewers information.
 * The table will have the following columns:
 * 1. Reviewer name
 * 2. Reviewer team
 * 3. Reviewer type (Reviewer or Approver)
 * 4. Review status
 *
 * @param body The document body to insert the table into.
 * @param ce Containing element (parent) of the table to be inserted.
 * @param index Child index relative to document body to insert the table at.
 * @param reviewers The list of reviewers to insert into the table.
 */
function insertDocReviewTable(
  body: GoogleAppsScript.Document.Body,
  index: number,
  reviewers: ReviewerInfoStatus[]
): void {
  const cells = [[docReviewTableStr, 'Team', 'Type', 'Status']];
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

  const table = body.insertTable(index, cells);
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
}

/**
 * Inserts doc review table after anchor string. See {@link insertDocReviewTable} for details.
 *
 * @param element Anchor string element.
 * @param reviewers The list of reviewers to insert into the table.
 */
export function insertDocReviewTableAfterAnchor(
  element: GoogleAppsScript.Document.Element,
  reviewers: ReviewerInfoStatus[]
) {
  // TODO: add stronger vaidation for paragraph
  const parentPara = getClosestParentParagraph(element);
  if (!parentPara) {
    return;
  }
  const body = DocumentApp.getActiveDocument().getBody();
  const parentDom = parentPara.getParent();
  const index = parentDom.getChildIndex(parentPara) + 1;

  insertDocReviewTable(body, index, reviewers);

  body.removeChild(parentPara); // Remove the anchor string
}

/**
 * Replace existing doc review table. See {@link insertDocReviewTable} for details.
 *
 * @param tableElement Table element for existing doc review table.
 * @param reviewers The list of reviewers to insert into the table.
 */
export function replaceDocReviewTable(
  tableElement: GoogleAppsScript.Document.Element,
  reviewers: ReviewerInfoStatus[]
) {
  // TODO: add stronger validation for table
  const body = DocumentApp.getActiveDocument().getBody();
  const parentDom = tableElement.getParent();
  const index = parentDom.getChildIndex(tableElement) + 1;

  insertDocReviewTable(body, index, reviewers);

  body.removeChild(tableElement); // Remove the old table
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
  insertDocReviewTableAfterAnchor(element, reviewers);
  console.log('(Test) Inserted doc review table');
}

export function getDocReviewTableElement(): GoogleAppsScript.Document.Element | null {
  const body = DocumentApp.getActiveDocument().getBody();
  const searchResult = body.findText(docReviewTableStr);
  if (!searchResult) {
    return null;
  }
  return getClosestParentTable(searchResult.getElement());
}

function strToReviewerTypeEnum(input: string): ReviewerType {
  switch (input) {
    case 'Approver':
      return ReviewerType.Approver;
    default:
      // Reset type to reviewer if user has edited doc review table manually.
      // The table will likely be refreshed from comments anyways.
      return ReviewerType.Reviewer;
  }
}

function strToReviewStatusEnum(input: string): ReviewStatus {
  switch (input) {
    case 'Approved':
      return ReviewStatus.Approved;
    case 'In Progress':
      return ReviewStatus.InProgress;
    default:
      // Reset status to not started if user has edited doc review table manually.
      // The table will likely be refreshed from comments anyways.
      return ReviewStatus.NotStarted;
  }
}

export function reviewerInfoStatusFromDocReviewTable(
  tableElement: GoogleAppsScript.Document.Element
): ReviewerInfoStatus[] {
  const reviewers: ReviewerInfoStatus[] = [];
  const table = tableElement.asTable();
  for (let r = 1; r < table.getNumRows(); r++) {
    const row = table.getRow(r);
    const reviewer: ReviewerInfoStatus = {
      info: {
        email: '',
        name: row.getCell(0).getText(),
        type: strToReviewerTypeEnum(row.getCell(2).getText()),
        team: row.getCell(1).getText(),
      },
      status: strToReviewStatusEnum(row.getCell(3).getText()),
    };
    reviewers.push(reviewer);
  }
  return reviewers;
}
