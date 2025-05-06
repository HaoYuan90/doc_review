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

// Example: @pewpew@gmail.com(Xiao Ming),reviewer,xfn
const emailExp = '[a-z0-9+_.-]+@[a-z0-9.-]+\\.[a-z0-9]{2,}';
const nameExp = '[a-z]+(?:[\\s.]+[a-z]+)*';
const typeExp = 'reviewer|approver';
const teamExp = '[a-z0-9]+(?:[\\s.]+[a-z0-9]+)*';
const reviewCommentExp = new RegExp(
  `^@(${emailExp})\\s?\\(\\s?(${nameExp})\\s?\\)\\s?,\\s?(${typeExp})\\s?,\\s?(${teamExp})$`,
  'i'
);

const resolveAction = 'resolve';

export enum ReviewerType {
  Reviewer = 'Reviewer',
  Approver = 'Approver',
}

export enum ReviewStatus {
  NotStarted = 'Not Started',
  InProgress = 'In Progress',
  Approved = 'Approved',
}

export interface ReviewerInfo {
  email: string;
  name: string;
  type: ReviewerType;
  team: string;
}

export interface ReviewerInfoStatus {
  info: ReviewerInfo;
  status: ReviewStatus;
}

function parseReviewerInfo(text: string): ReviewerInfo | null {
  const match = text.match(reviewCommentExp);
  if (match) {
    const email = match[1];
    const name = match[2];
    const type =
      match[3].toLowerCase() === 'reviewer'
        ? ReviewerType.Reviewer
        : ReviewerType.Approver;
    const team = match[4];
    return { email, name, type, team };
  } else {
    return null;
  }
}

function getComments(pageToken: string | undefined) {
  return Drive.Comments.list(DocumentApp.getActiveDocument().getId(), {
    pageToken: pageToken,
    includeDeleted: true,
    fields:
      'nextPageToken, comments(deleted, resolved, content, author(displayName, emailAddress), replies(deleted, content, action, author(displayName)))',
  });
}

export function processAllComments(): ReviewerInfoStatus[] {
  let pageToken: string | undefined = undefined;

  const reviewerInfoByName = new Map<string, ReviewerInfo>();
  const reviewedByName = new Set<string>();
  const approvedByName = new Set<string>();

  do {
    const resp = getComments(pageToken);
    pageToken = resp.nextPageToken;
    if (!resp.comments) {
      continue;
    }
    const comments = resp.comments;
    for (const comment of comments) {
      if (comment.deleted) {
        continue;
      }
      if (comment.author && comment.author.displayName) {
        // People who left left comments in the doc have reviewed it
        reviewedByName.add(comment.author.displayName);
      }
      if (!comment.content) {
        continue;
      }
      const reviewerInfo = parseReviewerInfo(comment.content);
      if (!reviewerInfo) {
        continue;
      }
      if (reviewerInfoByName.has(reviewerInfo.name)) {
        console.warn(
          'Duplicate comments getting review from (%s, %s)',
          reviewerInfo.email,
          reviewerInfo.name
        );
        continue;
      }
      reviewerInfoByName.set(reviewerInfo.name, reviewerInfo);

      if (!comment.resolved || !comment.replies) {
        // Resolved comment will definitely have at least one reply
        continue;
      }
      // Process resolved comment from replies
      for (const reply of comment.replies) {
        // TODO: Does not handle when comment is repeatedly resolved and unresolved
        if (reply.deleted || reply.action !== resolveAction) {
          continue;
        }
        if (reviewerInfo.name === reply.author?.displayName) {
          approvedByName.add(reviewerInfo.name);
        }
      }
    }
  } while (pageToken);

  // Process approval status
  const infoList = Array.from(reviewerInfoByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const infoStatusList: ReviewerInfoStatus[] = [];
  for (const info of infoList) {
    const status = approvedByName.has(info.name)
      ? ReviewStatus.Approved
      : reviewedByName.has(info.name)
        ? ReviewStatus.InProgress
        : ReviewStatus.NotStarted;
    infoStatusList.push({ info, status });
  }
  return infoStatusList;
}

export const internal = {
  parseReviewerInfo,
};
