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
/**
 * This file contains functions to servce onclick actions from the sidebar.
 */

import { ReviewerInfoStatus, processAllComments } from './comment-module';
import {
  getDocReviewInsertionPoint,
  insertDocReviewTable,
  getDocReviewTableElement,
  reviewerInfoStatusFromDocReviewTable,
} from './doc-module';

/**
 * Performs a trivial comparison of two lists of ReviewerInfoStatus. This function assumes both lists
 * are sorted in reviewer name ascending.
 *
 * @param infoFromComments List of ReviewerInfoStatus from doc comments
 * @param infoFromTable List of ReviewerInfoStatus from the doc review table
 * @returns true if the two lists are equal, false otherwise
 */
function reviewInfoEquals(
  infoFromComments: ReviewerInfoStatus[],
  infoFromTable: ReviewerInfoStatus[]
): boolean {
  if (infoFromComments.length !== infoFromTable.length) {
    return false;
  }
  for (let i = 0; i < infoFromComments.length; i++) {
    const l = infoFromComments[i];
    const r = infoFromTable[i];
    if (l.info.name !== r.info.name) {
      return false;
    }
    if (l.info.team !== r.info.team) {
      return false;
    }
    if (l.info.type !== r.info.type) {
      return false;
    }
    if (l.status !== r.status) {
      return false;
    }
  }
  return true;
}

export function createOrUpdateDocReviewTable(): void {
  const reviewerInfo = processAllComments();
  const anchor = getDocReviewInsertionPoint();
  if (anchor) {
    insertDocReviewTable(anchor, reviewerInfo);
  } else {
    const tableElement = getDocReviewTableElement();
    if (!tableElement) {
      return;
    }
    const currReviewerInfo = reviewerInfoStatusFromDocReviewTable(tableElement);
    if (!reviewInfoEquals(reviewerInfo, currReviewerInfo)) {
      // TODO: Redraw reviewer info table if reviewer information has changed.
    }
  }
}

export function troubleshoot(): string {
  // TODO: Implement troubleshooting information.
  return 'Troubleshooting information goes here.';
}
